import { createClient } from './supabase/server'

export type Role = 'owner' | 'super_admin' | 'admin' | 'employee' | 'sales' | 'viewer' | null

export async function getUserRole(): Promise<Role> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return (data?.role as Role) ?? 'viewer'
}

export function isAdminOrAbove(role: Role) {
  return role === 'owner' || role === 'super_admin' || role === 'admin'
}

export function canEditContent(role: Role) {
  return role === 'owner' || role === 'super_admin' || role === 'admin' || role === 'employee'
}
