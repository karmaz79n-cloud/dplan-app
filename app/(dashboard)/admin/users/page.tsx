'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPhone } from '@/lib/formatPhone'

type UserEntry = {
  id: string
  email: string
  role: string
  name: string | null
  phone: string | null
  department: string | null
  last_sign_in: string | null
}

type PendingEntry = {
  id: string
  email: string
  name: string
  department: string
  phone: string
  status: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: '총책임자',
  admin: '관리자',
  user: '일반',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-700',
  admin: 'bg-indigo-100 text-indigo-700',
  user: 'bg-slate-100 text-slate-600',
}

export default function UsersPage() {
  const [tab, setTab] = useState<'users' | 'pending'>('users')
  const [users, setUsers] = useState<UserEntry[]>([])
  const [pending, setPending] = useState<PendingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savingName, setSavingName] = useState<string | null>(null)
  const [savingPhone, setSavingPhone] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [smsEnabled, setSmsEnabled] = useState<boolean | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingEntry | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveRole, setApproveRole] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/approve').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([usersData, pendingData, settings]) => {
      setUsers(Array.isArray(usersData) ? usersData : [])
      setPending(Array.isArray(pendingData) ? pendingData : [])
      const smsVal = Array.isArray(settings)
        ? settings.find((s: { key: string }) => s.key === 'sms_enabled')?.value
        : null
      setSmsEnabled(smsVal !== 'false')
      setLoading(false)
    }).catch((e: Error) => { setError(`불러오기 실패: ${e.message}`); setLoading(false) })
  }, [])

  async function toggleSms() {
    const next = !smsEnabled
    setSmsEnabled(next)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'sms_enabled', value: String(next) }),
    })
  }

  async function handleRoleChange(id: string, newRole: string) {
    setSaving(id)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, newRole }),
    })
    if (res.ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u))
    else setError('저장 실패')
    setSaving(null)
  }

  async function handleNameChange(id: string, name: string) {
    setSavingName(id)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    })
    if (res.ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, name: name || null } : u))
    else setError('이름 저장 실패')
    setSavingName(null)
  }

  async function handlePhoneChange(id: string, phone: string) {
    setSavingPhone(id)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, phone }),
    })
    if (res.ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, phone: phone || null } : u))
    else setError('전화번호 저장 실패')
    setSavingPhone(null)
  }

  async function handleApprove(p: PendingEntry) {
    setSaving(p.id)
    const role = approveRole[p.id] || 'user'
    const res = await fetch('/api/admin/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, action: 'approve', userRole: role }),
    })
    if (res.ok) setPending(prev => prev.filter(x => x.id !== p.id))
    else setError('승인 처리 실패')
    setSaving(null)
  }

  async function handleReject() {
    if (!rejectTarget) return
    setSaving(rejectTarget.id)
    const res = await fetch('/api/admin/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rejectTarget.id, action: 'reject', rejectReason }),
    })
    if (res.ok) setPending(prev => prev.filter(x => x.id !== rejectTarget.id))
    else setError('거절 처리 실패')
    setSaving(null)
    setRejectTarget(null)
    setRejectReason('')
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    }).format(new Date(dateStr)).replace('. ', '/').replace('. ', ' ').replace('.', '')
  }

  return (
    <div className="flex gap-6 px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      {/* 좌측: 권한 안내 + SMS 토글 */}
      <div className="w-48 shrink-0 hidden md:block">
        <h2 className="text-xs font-bold text-slate-700 mb-3">역할별 권한</h2>
        <div className="flex flex-col gap-2 mb-4">
          {[
            { role: 'owner', label: '총책임자', perms: ['모든 기능', '사용자 권한 관리'] },
            { role: 'admin', label: '관리자', perms: ['가입 승인/거절', '사용자 조회'] },
            { role: 'user', label: '일반', perms: ['D-Plan 조회/편집'] },
          ].map(g => (
            <div key={g.role} className="rounded-lg border border-slate-200 bg-white p-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-1.5 ${ROLE_COLORS[g.role]}`}>
                {g.label}
              </span>
              <ul className="space-y-0.5">
                {g.perms.map((p, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-1"><span>·</span><span>{p}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">가입 SMS 알림</p>
          <div className="flex gap-1">
            <button type="button" onClick={() => { if (!smsEnabled) void toggleSms() }}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium cursor-pointer ${smsEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              ON
            </button>
            <button type="button" onClick={() => { if (smsEnabled) void toggleSms() }}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium cursor-pointer ${!smsEnabled ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              OFF
            </button>
          </div>
        </div>
      </div>

      {/* 우측: 메인 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/" className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">← 홈</Link>
          <h1 className="text-base font-bold text-slate-800">사용자 관리</h1>
        </div>

        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setTab('users')}
            className={`text-sm px-4 py-1.5 rounded-lg border font-medium cursor-pointer transition ${tab === 'users' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            사용자 목록
          </button>
          <button type="button" onClick={() => setTab('pending')}
            className={`text-sm px-4 py-1.5 rounded-lg border font-medium cursor-pointer transition flex items-center gap-1.5 ${tab === 'pending' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            가입 대기
            {pending.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold min-w-[18px] text-center">
                {pending.length}
              </span>
            )}
          </button>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {/* 사용자 목록 탭 */}
        {tab === 'users' && (
          <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">불러오는 중...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">사용자가 없습니다.</div>
            ) : (
              <table className="w-full text-sm" style={{ minWidth: 600 }}>
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {['이메일', '이름', '전화번호', '역할', '마지막 접속'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr key={user.id} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-2.5 text-xs text-slate-700">{user.email}</td>
                      <td className="px-4 py-2.5">
                        <input type="text" defaultValue={user.name ?? ''}  placeholder="이름"
                          onBlur={e => { const v = e.target.value.trim(); if (v !== (user.name ?? '')) void handleNameChange(user.id, v) }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          className="text-xs px-2 py-1 rounded border border-slate-200 outline-none w-full focus:border-indigo-400 bg-white" />
                        {savingName === user.id && <span className="text-xs text-slate-400">저장 중...</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <input type="text" defaultValue={user.phone ?? ''} placeholder="전화번호"
                          onChange={e => { e.target.value = formatPhone(e.target.value) }}
                          onBlur={e => { const v = e.target.value.trim(); if (v !== (user.phone ?? '')) void handlePhoneChange(user.id, v) }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          className="text-xs px-2 py-1 rounded border border-slate-200 outline-none w-full focus:border-indigo-400 bg-white" />
                        {savingPhone === user.id && <span className="text-xs text-slate-400">저장 중...</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <select value={user.role} disabled={user.role === 'owner' || saving === user.id}
                          onChange={e => void handleRoleChange(user.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-semibold outline-none cursor-pointer border-none ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'} disabled:opacity-60 disabled:cursor-not-allowed`}>
                          {Object.entries(ROLE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                        {saving === user.id && <span className="text-xs text-slate-400 ml-1">저장 중...</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 tabular-nums">{formatDate(user.last_sign_in)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 가입 대기 탭 */}
        {tab === 'pending' && (
          <>
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">불러오는 중...</div>
            ) : pending.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">대기 중인 가입 신청이 없습니다.</div>
            ) : (
              <>
                {/* 모바일: 카드 */}
                <div className="flex flex-col gap-3 sm:hidden">
                  {pending.map(p => (
                    <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800">{p.name}</span>
                        <span className="text-xs text-slate-400">{p.department}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{p.email} · {p.phone}</p>
                      <div className="flex items-center gap-2">
                        <select value={approveRole[p.id] || 'user'}
                          onChange={e => setApproveRole(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer flex-1 bg-white">
                          <option value="user">일반</option>
                          <option value="admin">관리자</option>
                        </select>
                        <button type="button" onClick={() => void handleApprove(p)} disabled={saving === p.id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-medium cursor-pointer disabled:opacity-60">승인</button>
                        <button type="button" onClick={() => setRejectTarget(p)} disabled={saving === p.id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium cursor-pointer disabled:opacity-60">거절</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PC: 테이블 */}
                <div className="hidden sm:block rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        {['이름', '이메일', '소속', '전화번호', '승인 역할', '처리'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((p, i) => (
                        <tr key={p.id} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-800">{p.name}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{p.email}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{p.department}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{p.phone}</td>
                          <td className="px-4 py-3">
                            <select value={approveRole[p.id] || 'user'}
                              onChange={e => setApproveRole(prev => ({ ...prev, [p.id]: e.target.value }))}
                              className="text-xs px-2 py-1 rounded border border-slate-200 outline-none cursor-pointer bg-white">
                              <option value="user">일반</option>
                              <option value="admin">관리자</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => void handleApprove(p)} disabled={saving === p.id}
                                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-medium cursor-pointer disabled:opacity-60">승인</button>
                              <button type="button" onClick={() => setRejectTarget(p)} disabled={saving === p.id}
                                className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white font-medium cursor-pointer disabled:opacity-60">거절</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* 거절 모달 */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4 bg-white border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-1">가입 거절</h3>
            <p className="text-xs text-slate-400 mb-4">{rejectTarget.name} ({rejectTarget.email})</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="거절 사유 입력 (선택)"
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none resize-none mb-4 focus:border-indigo-400" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setRejectTarget(null); setRejectReason('') }}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 cursor-pointer hover:bg-slate-50">취소</button>
              <button type="button" onClick={() => void handleReject()}
                className="text-sm px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium cursor-pointer">거절 처리</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
