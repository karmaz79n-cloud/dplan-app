import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole, isAdminOrAbove } from '@/lib/role'
import { sendSMS } from '@/lib/sms'
import { NextResponse } from 'next/server'

// GET: 대기 목록
export async function GET() {
  const role = await getUserRole()
  if (!isAdminOrAbove(role)) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  const supabase = createAdminClient()
  const { data } = await supabase.from('profiles').select('id, name, email, department, phone, role, status, created_at').eq('status', 'pending').order('created_at')
  return NextResponse.json(data ?? [])
}

// PATCH: 승인/거절
export async function PATCH(req: Request) {
  const role = await getUserRole()
  if (!isAdminOrAbove(role)) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { id, action, userRole, rejectReason } = await req.json()
  const supabase = createAdminClient()

  if (action === 'approve') {
    await supabase.from('profiles').update({ status: 'approved', role: userRole || 'user' }).eq('id', id)
    const { data: profile } = await supabase.from('profiles').select('phone, name').eq('id', id).single()
    if (profile?.phone) await sendSMS(profile.phone, `[D-Plan] ${profile.name}님, 가입이 승인되었습니다.`)
    return NextResponse.json({ ok: true })
  }

  if (action === 'reject') {
    const { data: profile } = await supabase.from('profiles').select('phone, name').eq('id', id).single()
    await supabase.from('profiles').update({ status: 'rejected', reject_reason: rejectReason || '' }).eq('id', id)
    await supabase.auth.admin.deleteUser(id)
    if (profile?.phone) await sendSMS(profile.phone, `[D-Plan] ${profile.name}님, 가입이 거절되었습니다.\n사유: ${rejectReason || '없음'}`)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
}
