import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { name, department, phone, email, password } = await req.json()
    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Supabase Auth 계정 생성
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 400 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // profiles upsert — onConflict: 'id' 명시로 트리거가 만든 row도 확실히 UPDATE
    const { error: upsertError } = await admin.from('profiles').upsert({
      id: userId,
      email,
      name,
      department,
      phone,
      role: 'user',
      status: 'pending',
    }, { onConflict: 'id' })

    if (upsertError) {
      // 실패 시 생성된 auth 계정도 롤백
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: '계정 설정 중 오류가 발생했습니다.' }, { status: 500 })
    }

    // 총책임자(owner) 에게 SMS 알림
    const { data: owners } = await admin.from('profiles').select('phone').eq('role', 'owner')
    for (const owner of owners ?? []) {
      if (owner.phone) {
        await sendSMS(owner.phone, `[D-Plan] 가입 신청: ${name}(${department}) / ${email}`).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '오류가 발생했습니다.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
