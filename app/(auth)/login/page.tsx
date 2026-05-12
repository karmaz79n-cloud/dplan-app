'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRecover, setShowRecover] = useState(false)
  const [recoverPhone, setRecoverPhone] = useState('')
  const [recoverMsg, setRecoverMsg] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError('이메일 또는 비밀번호가 올바르지 않습니다.'); return }
    router.push('/')
    router.refresh()
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    setRecoverMsg('')
    const res = await fetch('/api/auth/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: recoverPhone }),
    })
    const data = await res.json()
    setRecoverMsg(res.ok ? '임시 비밀번호를 문자로 발송했습니다.' : data.error || '오류가 발생했습니다.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800 mb-1">일일 업무계획</h1>
        <p className="text-xs text-gray-400 mb-6">D-Plan</p>

        {!showRecover ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)}
              required className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
            <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)}
              required className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-semibold mt-1 hover:bg-indigo-600 transition disabled:opacity-50">
              {loading ? '로그인 중...' : '로그인'}
            </button>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <Link href="/signup" className="hover:text-indigo-500">회원가입 신청</Link>
              <button type="button" onClick={() => setShowRecover(true)} className="hover:text-indigo-500">아이디/비밀번호 찾기</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRecover} className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">가입 시 등록한 전화번호를 입력하면 임시 비밀번호를 문자로 보내드립니다.</p>
            <input type="tel" placeholder="전화번호 (예: 01012345678)" value={recoverPhone} onChange={e => setRecoverPhone(e.target.value)}
              required className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
            {recoverMsg && <p className="text-xs text-indigo-500">{recoverMsg}</p>}
            <button type="submit" className="w-full py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition">
              임시 비밀번호 발송
            </button>
            <button type="button" onClick={() => setShowRecover(false)} className="text-xs text-gray-400 hover:text-gray-600">
              ← 로그인으로 돌아가기
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
