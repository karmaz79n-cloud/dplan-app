import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

type Row = { time: string; content: string; done: boolean }
type PlanCard = { name: string; rows: Row[] }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidCards(input: unknown): input is PlanCard[] {
  if (!Array.isArray(input)) return false
  return input.every((card) => {
    if (!card || typeof card !== 'object') return false
    const c = card as PlanCard
    if (typeof c.name !== 'string' || !Array.isArray(c.rows)) return false
    return c.rows.every((r) => r && typeof r.time === 'string' && typeof r.content === 'string' && typeof r.done === 'boolean')
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
    rows: card.rows.map((r) => ({ time: r.time, content: '', done: false })),
  }))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: '유효한 date가 필요합니다.' }, { status: 400 })

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const admin = await createAdminClient()
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

  try {
    const templateCards = JSON.parse(templateRow.value)
    if (!isValidCards(templateCards)) return NextResponse.json({ cards: null })
    return NextResponse.json({ cards: toTemplateCards(templateCards) })
  } catch {
    return NextResponse.json({ cards: null })
  }
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

  const admin = await createAdminClient()
  const userId = auth.user.id

  const payloads = [
    { key: gridKey(userId, date), value: JSON.stringify(cards) },
    { key: templateKey(userId), value: JSON.stringify(toTemplateCards(cards)) },
  ]

  const { error } = await admin.from('app_settings').upsert(payloads, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: '저장 실패' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
