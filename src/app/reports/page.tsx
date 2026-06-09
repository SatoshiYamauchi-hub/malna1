'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Report } from '@/lib/supabase'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = query ? `?search=${encodeURIComponent(query)}` : ''
    fetch(`/api/reports${params}`)
      .then(r => r.json())
      .then(data => { setReports(data); setLoading(false) })
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search.trim())
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">レポート一覧</h2>
        <Link href="/" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + 新規調査
        </Link>
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="企業名で検索..."
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="bg-slate-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          検索
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setSearch(''); setQuery('') }}
            className="text-sm text-slate-500 hover:text-slate-700 px-2"
          >
            クリア
          </button>
        )}
      </form>

      {loading ? (
        <div className="text-slate-400 text-sm">読み込み中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          {query ? (
            <p className="text-lg">「{query}」に一致するレポートが見つかりません</p>
          ) : (
            <>
              <p className="text-lg mb-2">レポートがまだありません</p>
              <Link href="/" className="text-blue-500 hover:underline text-sm">企業調査を開始する</Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <Link key={r.id} href={`/reports/${r.id}`}>
              <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800">{r.company_name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {r.industry && (
                        <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{r.industry}</span>
                      )}
                      {r.representative && (
                        <span className="text-xs text-slate-500">代表: {r.representative}</span>
                      )}
                      {r.address && (
                        <span className="text-xs text-slate-500 truncate max-w-xs">{r.address}</span>
                      )}
                    </div>
                    {r.business_description && (
                      <p className="text-slate-500 text-sm mt-2 line-clamp-2">{r.business_description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-300">
                      {new Date(r.created_at).toLocaleDateString('ja-JP')}
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
