import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms'
import { NextResponse } from 'next/server'

function randomPassword(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len)
}

export async function POST(req: Request) {
  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: '전화번호 필요' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('id, email').eq('phone', phone).single()
  if (!profile) return NextResponse.json({ error: '해당 전화번호로 가입된 계정이 없습니다.' }, { status: 404 })

  const tempPw = randomPassword()
  await supabase.auth.admin.updateUserById(profile.id, { password: tempPw })
  await sendSMS(phone, `[D-Plan] 임시 비밀번호: ${tempPw}\n이메일: ${profile.email}\n로그인 후 반드시 변경해주세요.`)

  return NextResponse.json({ ok: true })
}
