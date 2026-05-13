'use client'

import { useCallback, useEffect, useState } from 'react'

type User = {
  id: string
  name: string
  email: string
  department: string | null
  phone: string | null
  role: string
  status: string
  created_at: string
}

type Tab = 'pending' | 'all'

const ROLE_LABELS: Record<string, string> = {
  owner: '총책임자',
  admin: '관리자',
  user: '일반',
}

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [pending, setPending] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadPending = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/approve')
    const data = await res.json()
    setPending(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setAllUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'pending') void loadPending()
    else void loadAll()
  }, [tab, loadPending, loadAll])

  async function approve(id: string, userRole: string) {
    const res = await fetch('/api/admin/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve', userRole }),
    })
    if (res.ok) {
      setMessage('승인 완료')
      void loadPending()
    }
  }

  async function reject(id: string) {
    const res = await fetch('/api/admin/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reject', rejectReason }),
    })
    if (res.ok) {
      setMessage('거절 완료')
      setRejectTarget(null)
      setRejectReason('')
      void loadPending()
    }
  }

  async function changeRole(id: string, newRole: string) {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, newRole }),
    })
    if (res.ok) {
      setMessage('역할 변경 완료')
      void loadAll()
    }
  }

  function formatDate(str: string) {
    return str ? str.slice(0, 10) : '-'
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-base font-semibold text-slate-800 mb-4">사용자 관리</h1>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`px-4 py-1.5 text-sm rounded-md border transition ${
            tab === 'pending'
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          가입 대기 {pending.length > 0 && tab !== 'pending' ? `(${pending.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-4 py-1.5 text-sm rounded-md border transition ${
            tab === 'all'
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          전체 사용자
        </button>
      </div>

      {message && (
        <p className="mb-3 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
          {message}
        </p>
      )}

      {loading && <p className="text-xs text-slate-400">불러오는 중...</p>}

      {/* 가입 대기 탭 */}
      {tab === 'pending' && !loading && (
        pending.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">대기 중인 가입 신청이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((u) => (
              <div key={u.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                    {u.department && <p className="text-xs text-slate-400">{u.department}</p>}
                    {u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                    <p className="text-xs text-slate-300 mt-1">신청일: {formatDate(u.created_at)}</p>
                  </div>

                  {rejectTarget === u.id ? (
                    <div className="flex flex-col gap-2 items-end">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="거절 사유 (선택)"
                        className="text-xs border border-slate-200 rounded px-2 py-1 w-44 outline-none focus:border-indigo-400"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => { setRejectTarget(null); setRejectReason('') }}
                          className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => void reject(u.id)}
                          className="px-2 py-1 text-xs rounded border border-red-300 text-red-500 hover:bg-red-50"
                        >
                          거절 확인
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => void approve(u.id, 'user')}
                          className="px-2.5 py-1 text-xs rounded border border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                        >
                          일반 승인
                        </button>
                        <button
                          type="button"
                          onClick={() => void approve(u.id, 'admin')}
                          className="px-2.5 py-1 text-xs rounded border border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                        >
                          관리자 승인
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRejectTarget(u.id)}
                        className="px-2.5 py-1 text-xs rounded border border-red-200 text-red-400 hover:bg-red-50"
                      >
                        거절
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 전체 사용자 탭 */}
      {tab === 'all' && !loading && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">이름</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 hidden sm:table-cell">이메일</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 hidden sm:table-cell">소속</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">상태</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">역할</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-medium text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-400 sm:hidden">{u.email}</p>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <p className="text-xs text-slate-600">{u.email}</p>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <p className="text-xs text-slate-500">{u.department ?? '-'}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      u.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {u.status === 'approved' ? '승인' : u.status === 'pending' ? '대기' : '거절'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.role}
                      onChange={(e) => void changeRole(u.id, e.target.value)}
                      disabled={u.role === 'owner'}
                      className="text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed bg-white"
                    >
                      <option value="owner">총책임자</option>
                      <option value="admin">관리자</option>
                      <option value="user">일반</option>
                    </select>
                    {u.role === 'owner' && (
                      <span className="ml-1 text-xs text-slate-400">(변경불가)</span>
                    )}
                  </td>
                </tr>
              ))}
              {allUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                    사용자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
