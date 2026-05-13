import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/role'
import { NextResponse } from 'next/server'

// GET: 전체 사용자 목록
export async function GET() {
  try {
    const role = await getUserRole()
    if (!role || role === 'viewer') return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const admin = createAdminClient()
    const { data: authData, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, role, name, phone, department, status, created_at')

    const profileMap = new Map(
      (profiles ?? []).map((p: Record<string, unknown>) => [p.id, p])
    )

    const result = authData.users.map(u => ({
      id: u.id,
      email: u.email ?? '',
      role: (profileMap.get(u.id) as Record<string, unknown>)?.role ?? 'viewer',
      name: (profileMap.get(u.id) as Record<string, unknown>)?.name ?? null,
      phone: (profileMap.get(u.id) as Record<string, unknown>)?.phone ?? null,
      department: (profileMap.get(u.id) as Record<string, unknown>)?.department ?? null,
      status: (profileMap.get(u.id) as Record<string, unknown>)?.status ?? 'approved',
      last_sign_in: u.last_sign_in_at ?? null,
    }))

    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message ?? 'Unknown error' }, { status: 500 })
  }
}

// PATCH: 역할/이름/전화번호 변경
export async function PATCH(req: Request) {
  try {
    const role = await getUserRole()
    if (role !== 'owner') return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    const { id, newRole, name, phone } = await req.json()
    if (!id) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

    const admin = createAdminClient()
    const validRoles = ['owner', 'super_admin', 'admin', 'employee', 'sales', 'viewer', 'user']

    if (newRole !== undefined) {
      if (!validRoles.includes(newRole)) return NextResponse.json({ error: '유효하지 않은 등급' }, { status: 400 })
      const { error } = await admin.from('profiles').upsert({ id, role: newRole }, { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (name !== undefined) {
      const { error } = await admin.from('profiles').upsert({ id, name: name || null }, { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (phone !== undefined) {
      const { error } = await admin.from('profiles').upsert({ id, phone: phone || null }, { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message ?? 'Unknown error' }, { status: 500 })
  }
}
