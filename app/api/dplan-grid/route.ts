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

function keyFor(userId: string, date: string) {
  return `dplan:grid:${userId}:${date}`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: '유효한 date가 필요합니다.' }, { status: 400 })

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const admin = await createAdminClient()
  const key = keyFor(auth.user.id, date)
  const { data, error } = await admin.from('app_settings').select('value').eq('key', key).maybeSingle()
  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })

  if (!data?.value) return NextResponse.json({ cards: null })

  try {
    const cards = JSON.parse(data.value)
    if (!isValidCards(cards)) return NextResponse.json({ cards: null })
    return NextResponse.json({ cards })
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
  const key = keyFor(auth.user.id, date)

  const { error } = await admin
    .from('app_settings')
    .upsert({ key, value: JSON.stringify(cards) }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
