'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Row = {
  time: string
  content: string
  done: boolean
  extended?: boolean
}

type PlanCard = {
  name: string
  rows: Row[]
}

const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

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

function displayHour(time: string) {
  const hour = Number(time.split(':')[0])
  const shown = hour % 12 === 0 ? 12 : hour % 12
  return `${shown}시`
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
  return TIME_SLOTS.map((time) => ({ time, content: '', done: false, extended: false }))
}

function makeCard(): PlanCard {
  return { name: '', rows: makeRows() }
}

function normalizeCards(input: unknown): PlanCard[] {
  if (!Array.isArray(input)) return [makeCard()]

  return input.map((card) => {
    const c = card as PlanCard
    const sourceRows = Array.isArray(c?.rows) ? c.rows : []

    const rows = TIME_SLOTS.map((slot) => {
      const found = sourceRows.find((r) => r && typeof r.time === 'string' && r.time === slot)
      return {
        time: slot,
        content: typeof found?.content === 'string' ? found.content : '',
        done: typeof found?.done === 'boolean' ? found.done : false,
        extended: typeof found?.extended === 'boolean' ? found.extended : false,
      }
    })

    return {
      name: typeof c?.name === 'string' ? c.name : '',
      rows,
    }
  })
}

export default function HomePage() {
  const today = useMemo(() => toKstDateString(), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [cards, setCards] = useState<PlanCard[]>([makeCard()])
  const [savedCards, setSavedCards] = useState<PlanCard[]>([makeCard()])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null)

  const loadFromDb = useCallback(async (date: string) => {
    setLoading(true)
    setMessage('')

    const res = await fetch(`/api/dplan-grid?date=${date}`)
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const fallback = [makeCard()]
      setCards(fallback)
      setSavedCards(fallback)
      setMessage(data.error || '조회 실패')
      setLoading(false)
      return
    }

    if (Array.isArray(data.cards) && data.cards.length > 0) {
      const loaded = normalizeCards(data.cards)
      setCards(loaded)
      setSavedCards(loaded)
    } else {
      const fallback = [makeCard()]
      setCards(fallback)
      setSavedCards(fallback)
    }

    setLoading(false)
  }, [])

  const saveToDb = useCallback(async (nextCards: PlanCard[], date: string, doneMessage?: string) => {
    setSaving(true)

    const res = await fetch('/api/dplan-grid', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, cards: nextCards }),
    })

    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setMessage(data.error || '저장 실패')
      return false
    }

    setSavedCards(JSON.parse(JSON.stringify(nextCards)) as PlanCard[])
    if (doneMessage) setMessage(doneMessage)
    return true
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFromDb(selectedDate)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadFromDb, selectedDate])

  function updateCard(index: number, patch: Partial<PlanCard>) {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function updateRowContent(cardIndex: number, rowIndex: number, content: string) {
    setCards((prev) =>
      prev.map((c, i) => {
        if (i !== cardIndex) return c

        const rows = c.rows.map((r) => ({ ...r }))
        rows[rowIndex] = { ...rows[rowIndex], content }

        return { ...c, rows }
      }),
    )
  }

  function toggleExtend(cardIndex: number, rowIndex: number) {
    if (rowIndex <= 0) return

    setCards((prev) =>
      prev.map((c, i) => {
        if (i !== cardIndex) return c

        const rows = c.rows.map((r) => ({ ...r }))
        const current = rows[rowIndex]
        const nextExtended = !current.extended
        rows[rowIndex] = {
          ...current,
          extended: nextExtended,
          content: nextExtended ? '' : current.content,
        }

        return { ...c, rows }
      }),
    )
  }

  function deleteCard(cardIndex: number) {
    setCards((prev) => {
      const nextCards = prev.length <= 1 ? [makeCard()] : prev.filter((_, i) => i !== cardIndex)
      void saveToDb(nextCards, selectedDate, '카드 삭제 저장 완료')
      return nextCards
    })
    if (editingNameIndex === cardIndex) setEditingNameIndex(null)
  }

  function addPersonCard() {
    setCards((prev) => {
      const nextCards = [...prev, makeCard()]
      void saveToDb(nextCards, selectedDate, '인원 추가 저장 완료')
      return nextCards
    })
    setMessage('')
  }

  function isCardSynced(cardIndex: number) {
    const current = cards[cardIndex]
    const saved = savedCards[cardIndex]
    if (!current || !saved) return false
    return JSON.stringify(current) === JSON.stringify(saved)
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="max-w-[1920px] mx-auto">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="px-2 py-1 text-sm rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <p className="text-sm text-slate-700 min-w-[110px] text-center font-medium">{displayDate(selectedDate)}</p>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="px-2 py-1 text-sm rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              →
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addPersonCard}
              className="px-2.5 py-1.5 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              + 인원 추가
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
          {cards.map((card, cardIndex) => (
            <section key={cardIndex} className="bg-white border border-slate-300 ring-1 ring-slate-200 rounded-lg shadow-md overflow-hidden">
              <div className="px-2 py-2 border-b border-slate-200 bg-indigo-100/80 flex items-center gap-1">
                {editingNameIndex === cardIndex ? (
                  <div className="w-full flex items-center gap-1 bg-transparent rounded-md px-1.5 py-1">
                    <input
                      value={card.name}
                      onChange={(e) => updateCard(cardIndex, { name: e.target.value })}
                      placeholder={`이름 ${cardIndex + 1}`}
                      className="flex-1 text-base md:text-sm font-semibold text-slate-800 bg-white/95 border border-indigo-100 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNameIndex(null)
                        void saveToDb(cards, selectedDate)
                      }}
                      className="px-1.5 py-1 text-xs rounded border border-slate-200 text-slate-600 bg-white"
                    >
                      완료
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex items-center gap-1 bg-transparent rounded-md px-1.5 py-1">
                    <p className="flex-1 text-sm font-semibold text-slate-800 truncate px-1">{card.name || `이름 ${cardIndex + 1}`}</p>
                    <button
                      type="button"
                      onClick={() => setEditingNameIndex(cardIndex)}
                      className="px-1.5 py-1 text-xs rounded border border-slate-200 text-slate-600 bg-white"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCard(cardIndex)}
                      className="px-1.5 py-1 text-xs rounded border border-red-200 text-red-500 bg-white"
                    >
                      카드삭제
                    </button>
                  </div>
                )}
              </div>

              <div className="py-1.5">
                {card.rows.map((row, rowIndex) => {
                  const isExtended = Boolean(row.extended)
                  const isNextExtended = Boolean(card.rows[rowIndex + 1]?.extended)
                  const isEmpty = !isExtended && row.content.trim() === ''

                  return (
                    <div
                      key={row.time}
                      className="px-1.5 py-0.5 grid grid-cols-[34px_1fr_36px] items-center gap-1"
                    >
                      <span className="text-xs text-slate-600">{displayHour(row.time)}</span>
                      <input
                        value={isExtended ? '' : row.content}
                        onChange={(e) => updateRowContent(cardIndex, rowIndex, e.target.value)}
                        disabled={isExtended}
                        placeholder={isExtended ? '' : '클릭 입력'}
                        className={`h-8 text-base md:text-xs text-[#111111] border border-slate-200 px-2 outline-none focus:border-indigo-400 ${
                          isExtended && isNextExtended
                            ? 'rounded-none border-t-0 border-b-0 bg-white -mt-1 -mb-1'
                            : isExtended
                              ? 'rounded-t-none rounded-b-md border-t-0 bg-white -mt-1'
                              : isNextExtended
                                ? `${isEmpty ? 'bg-rose-100' : 'bg-white'} rounded-t-md rounded-b-none border-b-0 -mb-1`
                                : `${isEmpty ? 'bg-rose-100' : 'bg-white'} rounded-md`
                        }`}
                      />
                      <button
                        type="button"
                        disabled={rowIndex === 0}
                        onClick={() => toggleExtend(cardIndex, rowIndex)}
                        className={`h-8 text-[11px] rounded-md border ${
                          row.extended
                            ? 'bg-indigo-500 text-white border-indigo-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        } disabled:opacity-40`}
                      >
                        연장
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="px-2 py-1.5 border-t border-slate-100 bg-slate-50 flex justify-end">
                {(() => {
                  const synced = isCardSynced(cardIndex)
                  return (
                    <button
                      type="button"
                      onClick={() => void saveToDb(cards, selectedDate, `카드 ${cardIndex + 1} 저장 완료`)}
                      disabled={saving || loading}
                      className={`px-2 py-1 text-xs rounded border disabled:opacity-50 ${
                        synced
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {saving ? '저장중...' : synced ? `● 카드 ${cardIndex + 1} 저장됨` : `○ 카드 ${cardIndex + 1} 저장`}
                    </button>
                  )
                })()}
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
