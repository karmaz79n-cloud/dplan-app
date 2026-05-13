'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatPhone } from '@/lib/formatPhone'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', department: '', phone: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (form.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    setLoading(true)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, department: form.department, phone: form.phone, email: form.email, password: form.password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || '오류가 발생했습니다.'); return }
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">가입 신청 완료</h2>
        <p className="text-sm text-gray-500">관리자 승인 후 로그인 가능합니다.<br />승인 시 문자로 안내됩니다.</p>
        <Link href="/login" className="mt-6 inline-block text-sm text-indigo-500 hover:underline">로그인으로 이동</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800 mb-1">회원가입 신청</h1>
        <p className="text-xs text-gray-400 mb-6">D-Plan · 관리자 승인 후 사용 가능</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input placeholder="이름" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
          <input placeholder="소속 (팀/부서)" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
            required className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
          <input type="tel" placeholder="전화번호 (예: 010-1234-5678)" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: formatPhone(e.target.value) }))}
            required className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
          <input type="email" placeholder="이메일" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
          <input type="password" placeholder="비밀번호 (6자 이상)" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
          <input type="password" placeholder="비밀번호 확인" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
            required className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-semibold mt-1 hover:bg-indigo-600 transition disabled:opacity-50">
            {loading ? '신청 중...' : '가입 신청'}
          </button>
          <Link href="/login" className="text-center text-xs text-gray-400 hover:text-indigo-500">이미 계정이 있으신가요? 로그인</Link>
        </form>
      </div>
    </div>
  )
}
