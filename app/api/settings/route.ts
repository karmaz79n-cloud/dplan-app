import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/role'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from('app_settings').select('key, value')
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: Request) {
  const role = await getUserRole()
  if (role !== 'owner') return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const { key, value } = await req.json()
  const supabase = await createClient()
  await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' })
  return NextResponse.json({ ok: true })
}
