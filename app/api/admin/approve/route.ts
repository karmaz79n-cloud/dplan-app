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
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: 'approved', role: userRole || 'user' })
      .eq('id', id)
    if (updateError) {
      console.error('[approve] update failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    // 업데이트 결과 재확인 (트리거가 덮어쓰는 경우 방어)
    const { data: updated } = await supabase.from('profiles').select('status').eq('id', id).single()
    if (updated?.status !== 'approved') {
      // 트리거 등으로 되돌아간 경우 강제 재설정
      await supabase.from('profiles').update({ status: 'approved', role: userRole || 'user' }).eq('id', id)
    }
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
