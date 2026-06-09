'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Report } from '@/lib/supabase'

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">{value}</span>
    </div>
  )
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(r => r.json())
      .then(data => { setReport(data); setLoading(false) })
  }, [id])

  const deleteReport = async () => {
    if (!confirm('このレポートを削除しますか？')) return
    setDeleting(true)
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/reports')
    else setDeleting(false)
  }

  if (loading) return <div className="text-slate-400 text-sm">読み込み中...</div>
  if (!report) return <div className="text-red-500 text-sm">レポートが見つかりません</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/reports" className="text-sm text-blue-500 hover:underline mb-2 inline-block">← 一覧へ</Link>
          <h2 className="text-2xl font-bold text-slate-800">{report.company_name}</h2>
          <p className="text-xs text-slate-400 mt-1">
            調査日: {new Date(report.created_at).toLocaleDateString('ja-JP')}
          </p>
        </div>
        <button
          onClick={deleteReport}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
        >
          削除
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">基本情報</h3>
        <InfoRow label="業種・業態" value={report.industry} />
        <InfoRow label="設立" value={report.founded} />
        <InfoRow label="資本金" value={report.capital} />
        <InfoRow label="代表者" value={report.representative} />
        <InfoRow label="従業員数" value={report.employee_count} />
        <InfoRow label="本社所在地" value={report.address} />
        {report.website && (
          <div className="flex gap-3 py-3 border-b border-slate-100">
            <span className="text-sm text-slate-500 w-32 shrink-0">公式HP</span>
            <a
              href={report.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex-1 break-all"
            >
              {report.website}
            </a>
          </div>
        )}
        {report.corporate_number && (
          <div className="flex gap-3 py-3">
            <span className="text-sm text-slate-500 w-32 shrink-0">法人番号</span>
            <span className="text-sm text-slate-800 flex-1 font-mono">{report.corporate_number}</span>
          </div>
        )}
      </div>

      {report.business_description && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">事業内容</h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{report.business_description}</p>
        </div>
      )}

      {report.recent_topics && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">最近のトピック</h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{report.recent_topics}</p>
        </div>
      )}
    </div>
  )
}
