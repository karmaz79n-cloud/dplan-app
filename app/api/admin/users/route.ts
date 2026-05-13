import { createAdminClient } from '@/lib/supabase/server'
import { getUserRole, isAdminOrAbove } from '@/lib/role'
import { NextResponse } from 'next/server'

// GET: 전체 사용자 목록
export async function GET() {
  const role = await getUserRole()
  if (!isAdminOrAbove(role)) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, name, email, department, phone, role, status, created_at')
    .order('created_at', { ascending: false })

  // last_sign_in은 auth.users에서 가져옴
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const signInMap: Record<string, string | null> = {}
  for (const u of authUsers?.users ?? []) {
    signInMap[u.id] = u.last_sign_in_at ?? null
  }

  const result = (data ?? []).map(u => ({ ...u, last_sign_in: signInMap[u.id] ?? null }))
  return NextResponse.json(result)
}

// PATCH: 역할/이름/전화번호 변경
export async function PATCH(req: Request) {
  const role = await getUserRole()
  if (role !== 'owner') return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const { id, newRole, name, phone } = await req.json()
  const supabase = await createAdminClient()
  const patch: Record<string, string> = {}
  if (newRole !== undefined) patch.role = newRole
  if (name !== undefined) patch.name = name
  if (phone !== undefined) patch.phone = phone
  await supabase.from('profiles').update(patch).eq('id', id)
  return NextResponse.json({ ok: true })
}
