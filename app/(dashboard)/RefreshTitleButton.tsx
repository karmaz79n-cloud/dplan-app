'use client'

import { useRouter } from 'next/navigation'

export default function RefreshTitleButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        router.refresh()
        window.location.reload()
      }}
      className="font-bold text-sm text-gray-800 inline-flex items-center gap-1 hover:text-indigo-600 transition"
      title="새로고침"
    >
      <span>D-Plan</span>
      <span aria-hidden>↻</span>
    </button>
  )
}
