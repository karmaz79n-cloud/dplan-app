import { createClient } from './supabase/server'

export type Role = 'owner' | 'admin' | 'user' | null

export async function getUserRole(): Promise<Role> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return (data?.role as Role) ?? 'user'
}

export function isAdminOrAbove(role: Role) {
  return role === 'admin' || role === 'owner'
}
