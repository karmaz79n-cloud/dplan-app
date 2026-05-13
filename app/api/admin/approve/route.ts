import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/role'
import { sendSMS } from '@/lib/sms'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: 대기 목록
export async function GET() {
  try {
    const role = await getUserRole()
    if (role !== 'owner') return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    const admin = createAdminClient()
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, department, phone, status, reject_reason')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!profiles?.length) return NextResponse.json([])

    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const authMap = new Map(authUsers.users.map(u => [u.id, u.email]))

    const result = profiles.map(p => ({
      ...p,
      email: authMap.get(p.id) ?? '',
    }))

    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// PATCH: 승인/거절
export async function PATCH(req: Request) {
  try {
    const role = await getUserRole()
    if (role !== 'owner') return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    const { id, action, userRole, rejectReason } = await req.json()
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('name, phone')
      .eq('id', id)
      .single()

    if (action === 'approve') {
      const newRole = userRole || 'user'
      const { error } = await admin
        .from('profiles')
        .upsert({ id, status: 'approved', role: newRole }, { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (profile?.phone) {
        await sendSMS(profile.phone, `[D-Plan] ${profile.name}님, 가입이 승인되었습니다.`).catch(() => {})
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'reject') {
      const { error } = await admin
        .from('profiles')
        .upsert({ id, status: 'rejected', reject_reason: rejectReason || '' }, { onConflict: 'id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await admin.auth.admin.deleteUser(id)

      if (profile?.phone) {
        const reason = rejectReason ? `\n사유: ${rejectReason}` : ''
        await sendSMS(profile.phone, `[D-Plan] ${profile.name}님, 가입이 거절되었습니다.${reason}`).catch(() => {})
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
