import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">승인 대기 중</h2>
        <p className="text-sm text-gray-500 mb-6">관리자 승인 후 이용 가능합니다.<br />승인 시 등록된 번호로 문자가 발송됩니다.</p>
        <form action={logout}>
          <button type="submit" className="text-sm px-6 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            로그아웃
          </button>
        </form>
      </div>
    </div>
  )
}
