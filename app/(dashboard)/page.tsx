'use client'

import { useEffect, useMemo, useState } from 'react'

type Row = {
  time: string
  content: string
  done: boolean
}

type PlanCard = {
  name: string
  rows: Row[]
}

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const LUNCH_TIME = '12:00'

function toKstDateString() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 60 * 60000)
  const y = kst.getFullYear()
  const m = String(kst.getMonth() + 1).padStart(2, '0')
  const d = String(kst.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function displayDate(date: string) {
  const [y, m, d] = date.split('-')
  return `${y}.${m}.${d}`
}

function addDays(date: string, diff: number) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + diff)
  const ny = dt.getFullYear()
  const nm = String(dt.getMonth() + 1).padStart(2, '0')
  const nd = String(dt.getDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

function makeRows(): Row[] {
  return TIME_SLOTS.map((time) => ({ time, content: '', done: false }))
}

function makeCard(): PlanCard {
  return { name: '', rows: makeRows() }
}

export default function HomePage() {
  const today = useMemo(() => toKstDateString(), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [cards, setCards] = useState<PlanCard[]>([makeCard()])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null)

  async function loadFromDb(date: string) {
    setLoading(true)
    setMessage('')

    const res = await fetch(`/api/dplan-grid?date=${date}`)
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setMessage(data.error || '조회 실패')
      setCards([makeCard()])
      setLoading(false)
      return
    }

    if (Array.isArray(data.cards) && data.cards.length > 0) {
      setCards(data.cards as PlanCard[])
    } else {
      setCards([makeCard()])
    }
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFromDb(selectedDate)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [selectedDate])

  function updateCard(index: number, patch: Partial<PlanCard>) {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function updateRow(cardIndex: number, rowIndex: number, patch: Partial<Row>) {
    setCards((prev) =>
      prev.map((c, i) =>
        i === cardIndex
          ? {
              ...c,
              rows: c.rows.map((r, ri) => (ri === rowIndex ? { ...r, ...patch } : r)),
            }
          : c,
      ),
    )
  }

  function addPersonCard() {
    setCards((prev) => [...prev, makeCard()])
    setMessage('')
  }

  function resetCurrentDate() {
    setCards([makeCard()])
    setMessage('')
  }

  async function saveToDb() {
    setSaving(true)
    setMessage('')

    const res = await fetch('/api/dplan-grid', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate, cards }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data.error || '저장 실패')
      setSaving(false)
      return
    }

    setMessage('DB 저장 완료')
    setSaving(false)
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="max-w-[1920px] mx-auto">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <p className="text-xs text-slate-600 min-w-[96px] text-center">{displayDate(selectedDate)}</p>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              →
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addPersonCard}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              + 인원 추가
            </button>
            <button
              type="button"
              onClick={resetCurrentDate}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              오늘 초기화
            </button>
            <button
              type="button"
              onClick={saveToDb}
              disabled={saving || loading}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? '저장중...' : 'DB 저장'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {cards.map((card, cardIndex) => (
            <section key={cardIndex} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-2 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1">
                {editingNameIndex === cardIndex ? (
                  <>
                    <input
                      value={card.name}
                      onChange={(e) => updateCard(cardIndex, { name: e.target.value })}
                      placeholder={`이름 ${cardIndex + 1}`}
                      className="flex-1 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingNameIndex(null)}
                      className="px-1.5 py-1 text-[10px] rounded border border-slate-200 text-slate-600"
                    >
                      완료
                    </button>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-xs font-semibold text-slate-800 truncate">{card.name || `이름 ${cardIndex + 1}`}</p>
                    <button
                      type="button"
                      onClick={() => setEditingNameIndex(cardIndex)}
                      className="px-1.5 py-1 text-[10px] rounded border border-slate-200 text-slate-600"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCard(cardIndex, { name: '' })}
                      className="px-1.5 py-1 text-[10px] rounded border border-red-200 text-red-500"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>

              <div className="p-1.5 space-y-1">
                {card.rows.map((row, rowIndex) => {
                  const isLunch = row.time === LUNCH_TIME
                  return (
                    <div key={row.time} className={`grid grid-cols-[42px_1fr_18px] items-center gap-1 ${isLunch ? 'py-0.5' : ''}`}>
                      <span className="text-[10px] text-slate-500 tabular-nums">{row.time}</span>

                      {isLunch ? (
                        <div className="h-6 rounded-sm border-y-2 border-slate-300 bg-slate-50" />
                      ) : (
                        <input
                          value={row.content}
                          onChange={(e) => updateRow(cardIndex, rowIndex, { content: e.target.value })}
                          placeholder="클릭 입력"
                          className="h-6 text-[11px] rounded-md border border-slate-200 px-1.5 outline-none focus:border-indigo-400"
                        />
                      )}

                      {isLunch ? (
                        <span />
                      ) : (
                        <input
                          type="checkbox"
                          checked={row.done}
                          onChange={(e) => updateRow(cardIndex, rowIndex, { done: e.target.checked })}
                          className="w-3.5 h-3.5 accent-indigo-500"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {loading && <p className="mt-2 text-xs text-slate-500">불러오는 중...</p>}
        {message && <p className="mt-2 text-xs text-indigo-600">{message}</p>}
      </div>
    </div>
  )
}
