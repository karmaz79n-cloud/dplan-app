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

const CARD_COUNT = 12
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

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

function makeDefaultCards(): PlanCard[] {
  return Array.from({ length: CARD_COUNT }, () => ({
    name: '',
    rows: TIME_SLOTS.map((time) => ({ time, content: '', done: false })),
  }))
}

export default function HomePage() {
  const today = useMemo(() => toKstDateString(), [])
  const storageKey = useMemo(() => `dplan-grid-${today}`, [today])

  const [cards, setCards] = useState<PlanCard[]>(() => {
    if (typeof window === 'undefined') return makeDefaultCards()

    const raw = window.localStorage.getItem(`dplan-grid-${toKstDateString()}`)
    if (!raw) return makeDefaultCards()

    try {
      const parsed = JSON.parse(raw) as PlanCard[]
      if (Array.isArray(parsed) && parsed.length === CARD_COUNT) return parsed
      return makeDefaultCards()
    } catch {
      return makeDefaultCards()
    }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cards))
  }, [cards, storageKey])

  function patchName(cardIndex: number, name: string) {
    setCards((prev) =>
      prev.map((card, i) => (i === cardIndex ? { ...card, name } : card)),
    )
  }

  function patchContent(cardIndex: number, rowIndex: number, content: string) {
    setCards((prev) =>
      prev.map((card, i) =>
        i === cardIndex
          ? {
              ...card,
              rows: card.rows.map((row, r) =>
                r === rowIndex ? { ...row, content } : row,
              ),
            }
          : card,
      ),
    )
  }

  function patchDone(cardIndex: number, rowIndex: number, done: boolean) {
    setCards((prev) =>
      prev.map((card, i) =>
        i === cardIndex
          ? {
              ...card,
              rows: card.rows.map((row, r) =>
                r === rowIndex ? { ...row, done } : row,
              ),
            }
          : card,
      ),
    )
  }

  function resetToday() {
    const defaults = makeDefaultCards()
    setCards(defaults)
    localStorage.setItem(storageKey, JSON.stringify(defaults))
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="max-w-[1920px] mx-auto">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">{displayDate(today)} · D-Plan (12명)</p>
          <button
            type="button"
            onClick={resetToday}
            className="px-2.5 py-1 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            오늘 초기화
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {cards.map((card, cardIndex) => (
            <section key={cardIndex} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-2 py-2 border-b border-slate-100 bg-slate-50">
                <input
                  value={card.name}
                  onChange={(e) => patchName(cardIndex, e.target.value)}
                  placeholder={`이름 ${cardIndex + 1}`}
                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-indigo-400"
                />
              </div>

              <div className="p-1.5 space-y-1">
                {card.rows.map((row, rowIndex) => (
                  <div key={row.time} className="grid grid-cols-[42px_1fr_18px] items-center gap-1">
                    <span className="text-[10px] text-slate-500 tabular-nums">{row.time}</span>
                    <input
                      value={row.content}
                      onChange={(e) => patchContent(cardIndex, rowIndex, e.target.value)}
                      placeholder="클릭 입력"
                      className="h-6 text-[11px] rounded-md border border-slate-200 px-1.5 outline-none focus:border-indigo-400"
                    />
                    <input
                      type="checkbox"
                      checked={row.done}
                      onChange={(e) => patchDone(cardIndex, rowIndex, e.target.checked)}
                      className="w-3.5 h-3.5 accent-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
