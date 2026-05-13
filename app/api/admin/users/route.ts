import { createAdminClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/role'
import { NextResponse } from 'next/server'

// GET: 전체 사용자 목록
export async function GET() {
  const role = await getUserRole()
  if (!role || role === 'user') return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, name, email, department, phone, role, status, created_at')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

// PATCH: 역할 변경
export async function PATCH(req: Request) {
  const role = await getUserRole()
  if (role !== 'owner') return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const { id, newRole } = await req.json()
  const supabase = await createAdminClient()
  await supabase.from('profiles').update({ role: newRole }).eq('id', id)
  return NextResponse.json({ ok: true })
}
