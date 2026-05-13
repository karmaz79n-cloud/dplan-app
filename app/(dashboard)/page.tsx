'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type DailyPlan = {
  id: string
  plan_date: string
  start_time: string | null
  end_time: string | null
  content: string
  is_done: boolean
}

function toKstDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function displayDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${y}.${m}.${d}`
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])
  const today = useMemo(() => toKstDateString(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')

  const [rows, setRows] = useState<DailyPlan[]>([])
  const [newStart, setNewStart] = useState('09:00')
  const [newEnd, setNewEnd] = useState('10:00')
  const [newContent, setNewContent] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadTodayPlans = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('daily_plans')
      .select('id, plan_date, start_time, end_time, content, is_done')
      .eq('user_id', uid)
      .eq('plan_date', today)
      .order('start_time', { ascending: true })

    if (error) throw error
    setRows((data ?? []) as DailyPlan[])
  }, [supabase, today])

  useEffect(() => {
    async function init() {
      setLoading(true)
      setError('')

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        setError('사용자 정보를 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      const user = authData.user
      if (!user) {
        setError('로그인 정보가 없습니다.')
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, department')
        .eq('id', user.id)
        .single()

      setName(profile?.name ?? user.email ?? '')
      setDepartment(profile?.department ?? '')

      try {
        await loadTodayPlans(user.id)
      } catch {
        setError('오늘 업무계획을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [supabase, loadTodayPlans])

  async function addPlan() {
    if (!userId) return
    if (!newContent.trim()) {
      setError('업무내용을 입력해 주세요.')
      return
    }

    setSaving(true)
    setError('')

    const { error } = await supabase.from('daily_plans').insert({
      user_id: userId,
      plan_date: today,
      start_time: newStart,
      end_time: newEnd,
      content: newContent.trim(),
      is_done: false,
    })

    if (error) {
      setError('업무 추가에 실패했습니다.')
      setSaving(false)
      return
    }

    setNewContent('')
    await loadTodayPlans(userId)
    setSaving(false)
  }

  function patchRow(id: string, patch: Partial<DailyPlan>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function saveRow(row: DailyPlan) {
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('daily_plans')
      .update({
        start_time: row.start_time,
        end_time: row.end_time,
        content: row.content,
        is_done: row.is_done,
      })
      .eq('id', row.id)

    setSaving(false)
    if (error) setError('업무 수정에 실패했습니다.')
  }

  async function removeRow(id: string) {
    setSaving(true)
    setError('')

    const { error } = await supabase.from('daily_plans').delete().eq('id', id)

    if (error) {
      setSaving(false)
      setError('업무 삭제에 실패했습니다.')
      return
    }

    setRows((prev) => prev.filter((r) => r.id !== id))
    setSaving(false)
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-1">안녕하세요, {name}님</h2>
          <p className="text-sm text-gray-500">{department ? `${department} · ` : ''}오늘의 업무계획 ({displayDate(today)})</p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">업무 추가</h3>
          <div className="grid grid-cols-1 md:grid-cols-[120px_120px_1fr_auto] gap-2">
            <input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400"
            />
            <input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400"
            />
            <input
              type="text"
              placeholder="업무내용 입력"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={addPlan}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600 disabled:opacity-50"
            >
              추가
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">일자</th>
                  <th className="px-4 py-3 text-left font-semibold">시간</th>
                  <th className="px-4 py-3 text-left font-semibold">업무내용</th>
                  <th className="px-4 py-3 text-center font-semibold">완료</th>
                  <th className="px-4 py-3 text-center font-semibold">비고</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">불러오는 중입니다...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">등록된 업무가 없습니다.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{displayDate(row.plan_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <input
                            type="time"
                            value={row.start_time ?? ''}
                            onChange={(e) => patchRow(row.id, { start_time: e.target.value || null })}
                            className="px-2 py-1 rounded-md border border-gray-200 outline-none focus:border-indigo-400"
                          />
                          <span className="text-gray-400">~</span>
                          <input
                            type="time"
                            value={row.end_time ?? ''}
                            onChange={(e) => patchRow(row.id, { end_time: e.target.value || null })}
                            className="px-2 py-1 rounded-md border border-gray-200 outline-none focus:border-indigo-400"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.content}
                          onChange={(e) => patchRow(row.id, { content: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none focus:border-indigo-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.is_done}
                          onChange={(e) => patchRow(row.id, { is_done: e.target.checked })}
                          className="w-4 h-4 accent-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveRow(row)}
                            disabled={saving || !row.content.trim()}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {error && <p className="px-4 py-3 text-xs text-red-500 border-t border-gray-100">{error}</p>}
        </section>
      </div>
    </div>
  )
}
