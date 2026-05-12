import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('name, department').eq('id', user!.id).single()

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">
        안녕하세요, {profile?.name ?? user?.email}님
      </h2>
      <p className="text-sm text-gray-400">{profile?.department} · 일일 업무계획</p>
      {/* 메인 기능은 추후 추가 */}
    </div>
  )
}
