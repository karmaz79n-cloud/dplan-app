import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // 공개 경로
  const publicPaths = ['/login', '/signup']
  if (publicPaths.some(p => pathname.startsWith(p))) return supabaseResponse

  // 비로그인 → 로그인
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  // 대기중 → pending 페이지
  if (pathname !== '/pending') {
    const { data: profile } = await supabase.from('profiles').select('status').eq('id', user.id).single()
    if (profile?.status === 'pending') return NextResponse.redirect(new URL('/pending', request.url))
    if (profile?.status === 'rejected') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?rejected=1', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
