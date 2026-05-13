'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type DailyPlan = {
  id: string
  plan_date: string
  start_time: string | null
  end_time: string | null
  content: string
  is_done: boolean
}

type SlotRow = {
  slot: string
  end: string
  id: string | null
  content: string
  is_done: boolean
}

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
]

function toKstDateString() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 60 * 60000)
  const y = kst.getFullYear()
  const m = String(kst.getMonth() + 1).padStart(2, '0')
  const d = String(kst.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtDate(date: string) {
  const [y, m, d] = date.split('-')
  return `${y}.${m}.${d}`
}

function defaultRows(): SlotRow[] {
  return TIME_SLOTS.map((slot, idx) => ({
    slot,
    end: TIME_SLOTS[idx + 1] ?? '19:00',
    id: null,
    content: '',
    is_done: false,
  }))
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])
  const today = useMemo(() => toKstDateString(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [rows, setRows] = useState<SlotRow[]>(defaultRows)
  const [activeCell, setActiveCell] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function init() {
      setLoading(true)
      setMessage('')

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        setMessage('로그인 정보가 없습니다.')
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

      const { data: plans } = await supabase
        .from('daily_plans')
        .select('id, plan_date, start_time, end_time, content, is_done')
        .eq('user_id', user.id)
        .eq('plan_date', today)

      const map = new Map<string, DailyPlan>()
      ;(plans ?? []).forEach((p) => {
        if (p.start_time) map.set(p.start_time.slice(0, 5), p as DailyPlan)
      })

      setRows(
        defaultRows().map((r) => {
          const found = map.get(r.slot)
          return found
            ? {
                slot: r.slot,
                end: r.end,
                id: found.id,
                content: found.content ?? '',
                is_done: found.is_done ?? false,
              }
            : r
        }),
      )

      setLoading(false)
    }

    init()
  }, [supabase, today])

  function patchRow(slot: string, patch: Partial<SlotRow>) {
    setRows((prev) => prev.map((r) => (r.slot === slot ? { ...r, ...patch } : r)))
  }

  async function saveAll() {
    if (!userId) return
    setSaving(true)
    setMessage('')

    const toInsert = rows.filter((r) => !r.id && r.content.trim())
    const toUpdate = rows.filter((r) => r.id && r.content.trim())
    const toDelete = rows.filter((r) => r.id && !r.content.trim())

    if (toDelete.length) {
      const ids = toDelete.map((r) => r.id!)
      await supabase.from('daily_plans').delete().in('id', ids)
    }

    for (const r of toUpdate) {
      await supabase
        .from('daily_plans')
        .update({ content: r.content.trim(), is_done: r.is_done, end_time: r.end })
        .eq('id', r.id)
    }

    if (toInsert.length) {
      await supabase.from('daily_plans').insert(
        toInsert.map((r) => ({
          user_id: userId,
          plan_date: today,
          start_time: r.slot,
          end_time: r.end,
          content: r.content.trim(),
          is_done: r.is_done,
        })),
      )
    }

    const { data: refreshed } = await supabase
      .from('daily_plans')
      .select('id, start_time, end_time, content, is_done')
      .eq('user_id', userId)
      .eq('plan_date', today)

    const map = new Map<string, DailyPlan>()
    ;(refreshed ?? []).forEach((p) => {
      if (p.start_time) map.set(p.start_time.slice(0, 5), p as DailyPlan)
    })

    setRows(
      defaultRows().map((r) => {
        const found = map.get(r.slot)
        return found
          ? {
              slot: r.slot,
              end: r.end,
              id: found.id,
              content: found.content ?? '',
              is_done: found.is_done ?? false,
            }
          : r
      }),
    )

    setSaving(false)
    setMessage('저장되었습니다.')
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-1">안녕하세요, {name}님</h2>
          <p className="text-sm text-gray-500">{department ? `${department} · ` : ''}오늘의 업무계획 ({fmtDate(today)})</p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200 text-slate-700">
                  <th className="px-4 py-3 text-left font-semibold">일자</th>
                  <th className="px-4 py-3 text-left font-semibold">시간</th>
                  <th className="px-4 py-3 text-left font-semibold">업무내용</th>
                  <th className="px-4 py-3 text-center font-semibold">완료</th>
                  <th className="px-4 py-3 text-left font-semibold">비고</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">불러오는 중입니다...</td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={r.slot} className="border-t border-slate-200 hover:bg-sky-50/40">
                      {idx === 0 && (
                        <td rowSpan={rows.length} className="px-4 py-3 text-center font-semibold text-slate-700 bg-sky-50 border-r border-slate-200 align-top">
                          {fmtDate(today)}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">{r.slot}</td>
                      <td className="px-4 py-2">
                        {activeCell === r.slot ? (
                          <input
                            autoFocus
                            value={r.content}
                            onChange={(e) => patchRow(r.slot, { content: e.target.value })}
                            onBlur={() => setActiveCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setActiveCell(null)
                            }}
                            className="w-full rounded-md border border-indigo-300 px-3 py-2 outline-none"
                            placeholder="클릭해서 입력"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveCell(r.slot)}
                            className="w-full min-h-10 text-left rounded-md border border-transparent hover:border-slate-200 px-2 py-2 text-slate-800"
                          >
                            {r.content || <span className="text-slate-400">클릭해서 입력</span>}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={r.is_done}
                          onChange={(e) => patchRow(r.slot, { is_done: e.target.checked })}
                          className="w-4 h-4 accent-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r.is_done ? '완료' : r.content ? '진행/예정' : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50/60">
            <p className="text-xs text-slate-500">빈 칸은 저장 시 자동으로 미등록 상태를 유지합니다.</p>
            <button
              type="button"
              onClick={saveAll}
              disabled={loading || saving}
              className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '일괄 저장'}
            </button>
          </div>

          {message && <p className="px-4 py-3 text-xs text-indigo-600 border-t border-slate-100">{message}</p>}
        </section>
      </div>
    </div>
  )
}
