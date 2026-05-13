import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserRole } from '@/lib/role'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = await getUserRole()

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="h-12 flex items-center px-4 sm:px-6 border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-50">
        <Link href="/" className="font-bold text-sm text-gray-800 inline-flex items-center gap-1 hover:text-indigo-600 transition" title="새로고침">
          <span>D-Plan</span>
          <span aria-hidden>↻</span>
        </Link>
        <span className="text-xs text-gray-400 ml-2">일일 업무계획 · V1.00</span>
        <div className="flex-1" />
        <span className="text-xs text-gray-400 mr-3">{user.email}</span>
        <form action={logout}>
          <button type="submit" className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition cursor-pointer">
            로그아웃
          </button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  )
}
