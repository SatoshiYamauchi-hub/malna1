'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Minutes } from '@/lib/supabase'

export default function MinutesListPage() {
  const [minutes, setMinutes] = useState<Minutes[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/minutes')
      .then(r => r.json())
      .then(data => { setMinutes(data); setLoading(false) })
  }, [])

  if (loading) return <div className="text-slate-400 text-sm">読み込み中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">議事録一覧</h2>
        <Link href="/" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + 新規入力
        </Link>
      </div>

      {minutes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-2">議事録がまだありません</p>
          <Link href="/" className="text-blue-500 hover:underline text-sm">議事録を入力する</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {minutes.map(m => (
            <Link key={m.id} href={`/minutes/${m.id}`}>
              <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{m.title}</h3>
                    {m.summary && (
                      <p className="text-slate-500 text-sm mt-1 line-clamp-2">{m.summary}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {m.meeting_date && (
                      <span className="text-xs text-slate-400">{m.meeting_date}</span>
                    )}
                    <p className="text-xs text-slate-300 mt-1">
                      登録: {new Date(m.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
