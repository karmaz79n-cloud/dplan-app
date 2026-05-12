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

  // profiles 업데이트
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    email,
    name,
    department,
    phone,
    role: 'user',
    status: 'pending',
  })
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // 총책임자(owner) 에게 SMS 알림
  const { data: owner } = await supabase.from('profiles').select('phone').eq('role', 'owner').single()
  if (owner?.phone) {
    await sendSMS(owner.phone, `[D-Plan] 가입 신청: ${name}(${department}) / ${email}`)
  }

  return NextResponse.json({ ok: true })
}
