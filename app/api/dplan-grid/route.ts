import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Row = { time: string; content: string; done: boolean; extended?: boolean }
type PlanCard = { name: string; rows: Row[] }
type TemplatePayload = { effectiveDate: string; cards: PlanCard[] }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidCards(input: unknown): input is PlanCard[] {
  if (!Array.isArray(input)) return false
  return input.every((card) => {
    if (!card || typeof card !== 'object') return false
    const c = card as PlanCard
    if (typeof c.name !== 'string' || !Array.isArray(c.rows)) return false
    return c.rows.every((r) => {
      return (
        r &&
        typeof r.time === 'string' &&
        typeof r.content === 'string' &&
        typeof r.done === 'boolean' &&
        (typeof r.extended === 'undefined' || typeof r.extended === 'boolean')
      )
    })
  })
}

function gridKey(userId: string, date: string) {
  return `dplan:grid:${userId}:${date}`
}

function templateKey(userId: string) {
  return `dplan:grid-template:${userId}`
}

function toTemplateCards(cards: PlanCard[]): PlanCard[] {
  return cards.map((card) => ({
    name: card.name,
    rows: card.rows.map((r) => ({ time: r.time, content: '', done: false, extended: false })),
  }))
}

function parseTemplateValue(rawValue: string): TemplatePayload | null {
  try {
    const parsed = JSON.parse(rawValue)

    // legacy format: cards array only
    if (isValidCards(parsed)) {
      return { effectiveDate: '0000-01-01', cards: parsed }
    }

    if (!parsed || typeof parsed !== 'object') return null
    const effectiveDate = (parsed as TemplatePayload).effectiveDate
    const cards = (parsed as TemplatePayload).cards

    if (!DATE_RE.test(effectiveDate) || !isValidCards(cards)) return null
    return { effectiveDate, cards }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: '유효한 date가 필요합니다.' }, { status: 400 })

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const admin = createAdminClient()
  const userId = auth.user.id

  const { data: dailyRow, error: dailyError } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', gridKey(userId, date))
    .maybeSingle()

  if (dailyError) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  if (dailyRow?.value) {
    try {
      const cards = JSON.parse(dailyRow.value)
      if (isValidCards(cards)) return NextResponse.json({ cards })
    } catch {
      // fall through to template
    }
  }

  const { data: templateRow, error: templateError } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', templateKey(userId))
    .maybeSingle()

  if (templateError) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  if (!templateRow?.value) return NextResponse.json({ cards: null })

  const template = parseTemplateValue(templateRow.value)
  if (!template) return NextResponse.json({ cards: null })

  // template changes are applied only from effectiveDate forward
  if (date < template.effectiveDate) return NextResponse.json({ cards: null })

  return NextResponse.json({ cards: toTemplateCards(template.cards) })
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null)
  const date = body?.date
  const cards = body?.cards

  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: '유효한 date가 필요합니다.' }, { status: 400 })
  if (!isValidCards(cards)) return NextResponse.json({ error: '유효한 cards가 필요합니다.' }, { status: 400 })

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const admin = createAdminClient()
  const userId = auth.user.id

  const payloads = [
    { key: gridKey(userId, date), value: JSON.stringify(cards) },
    {
      key: templateKey(userId),
      value: JSON.stringify({ effectiveDate: date, cards: toTemplateCards(cards) }),
    },
  ]

  const { error } = await admin.from('app_settings').upsert(payloads, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: '저장 실패' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
