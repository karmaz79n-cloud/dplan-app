import { createAdminClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/sms'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { name, department, phone, email, password } = await req.json()
  if (!name || !email || !password || !phone) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })

  const supabase = await createAdminClient()

  // Supabase Auth 계정 생성
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  // profiles upsert — DB 트리거가 먼저 실행되어 잘못된 role을 심을 수 있으므로
  // upsert 후 update로 이중 보장
  await supabase.from('profiles').upsert({
    id: userId, email, name, department, phone,
    role: 'user',
    status: 'pending',
  })

  // 트리거가 덮어썼을 경우를 대비한 명시적 update
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'user', status: 'pending', name, department, phone, email })
    .eq('id', userId)

  if (updateError) {
    // profile 설정 실패 시 생성된 auth 계정도 삭제 (롤백)
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: '계정 설정 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // 총책임자(owner) 에게 SMS 알림
  const { data: owner } = await supabase.from('profiles').select('phone').eq('role', 'owner').single()
  if (owner?.phone) {
    await sendSMS(owner.phone, `[D-Plan] 가입 신청: ${name}(${department}) / ${email}`)
  }

  return NextResponse.json({ ok: true })
}
