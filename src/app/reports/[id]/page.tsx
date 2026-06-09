'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Report, FinancialRecord } from '@/lib/supabase'

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 flex-1 whitespace-pre-wrap">{value}</span>
    </div>
  )
}

function FinancialCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-300 text-xs">—</span>
  return <span className="text-sm text-slate-800">{value}</span>
}

function FinancialSection({ reportId }: { reportId: string }) {
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/reports/${reportId}/financials`)
      .then(r => r.json())
      .then(data => { setRecords(data); setLoading(false) })
  }, [reportId])

  const handleExtract = async () => {
    setExtracting(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${reportId}/financials`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '取得に失敗しました')
      } else {
        setRecords(data.records ?? [])
        if ((data.records ?? []).length === 0) setError('PDFが見つかりませんでした')
      }
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setExtracting(false)
    }
  }

  if (loading) return null

  // 決算短信（直近1件）と決算書（複数）に分離
  const tansin = records.find(r => r.record_type === '決算短信' && r.is_latest)
  const statements = records.filter(r => r.record_type === '有価証券報告書')
    .sort((a, b) => b.fiscal_year.localeCompare(a.fiscal_year))

  return (
    <div className="space-y-4">

      {/* ヘッダー + 取得ボタン */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">決算情報</h3>
        <button
          onClick={handleExtract}
          disabled={extracting}
          className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {extracting ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              PDFを取得中...（1〜2分）
            </>
          ) : records.length > 0 ? '再取得' : 'PDFから決算情報を取得'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {records.length === 0 && !extracting && !error && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
          ボタンを押すとIRページのPDFから決算情報を自動取得します
        </div>
      )}

      {/* 決算短信（直近） */}
      {tansin && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">決算短信（直近）</span>
              <span className="text-xs text-slate-500">{tansin.fiscal_year}</span>
            </div>
            {tansin.pdf_url && (
              <a href={tansin.pdf_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline">PDF ↗</a>
            )}
          </div>
          <div className="p-5">
            <FinancialTable record={tansin} />
          </div>
        </div>
      )}

      {/* 決算書（複数期） */}
      {statements.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <span className="text-sm font-semibold text-slate-700">
              有価証券報告書（{statements.length}期分）
            </span>
          </div>

          {/* トレンド比較テーブル（横に期を並べる） */}
          <TrendTable statements={statements} />
        </div>
      )}
    </div>
  )
}

const TREND_ROWS: [string, keyof FinancialRecord][] = [
  ['売上高', 'revenue'],
  ['営業利益', 'operating_profit'],
  ['営業利益率', 'operating_margin'],
  ['経常利益', 'ordinary_profit'],
  ['当期純利益', 'net_profit'],
  ['EPS', 'eps'],
  ['総資産', 'total_assets'],
  ['純資産', 'net_assets'],
  ['自己資本比率', 'equity_ratio'],
  ['有利子負債', 'interest_bearing_debt'],
  ['営業CF', 'operating_cf'],
  ['投資CF', 'investing_cf'],
  ['財務CF', 'financing_cf'],
  ['フリーCF', 'free_cf'],
  ['ROE', 'roe'],
  ['ROA', 'roa'],
  ['1株配当', 'dividend_per_share'],
  ['配当性向', 'payout_ratio'],
]

function TrendTable({ statements }: { statements: FinancialRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left text-xs text-slate-500 font-medium px-5 py-2.5 w-36">項目</th>
            {statements.map(s => (
              <th key={s.id} className="text-right text-xs text-slate-500 font-medium px-4 py-2.5 min-w-32">
                <div>{s.fiscal_year}</div>
                {s.pdf_url && (
                  <a href={s.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-normal">PDF ↗</a>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TREND_ROWS.map(([label, key]) => {
            const hasAny = statements.some(s => s[key] !== null)
            if (!hasAny) return null
            return (
              <tr key={key} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-2.5 text-slate-500 text-xs">{label}</td>
                {statements.map(s => (
                  <td key={s.id} className="px-4 py-2.5 text-right">
                    <FinancialCell value={s[key] as string | null} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FinancialTable({ record }: { record: FinancialRecord }) {
  const rows: [string, keyof FinancialRecord][] = [
    ['売上高', 'revenue'],
    ['売上総利益', 'gross_profit'],
    ['営業利益', 'operating_profit'],
    ['営業利益率', 'operating_margin'],
    ['経常利益', 'ordinary_profit'],
    ['当期純利益', 'net_profit'],
    ['EPS', 'eps'],
    ['総資産', 'total_assets'],
    ['純資産', 'net_assets'],
    ['自己資本比率', 'equity_ratio'],
    ['有利子負債', 'interest_bearing_debt'],
    ['営業CF', 'operating_cf'],
    ['投資CF', 'investing_cf'],
    ['財務CF', 'financing_cf'],
    ['フリーCF', 'free_cf'],
    ['ROE', 'roe'],
    ['ROA', 'roa'],
    ['1株配当', 'dividend_per_share'],
    ['配当性向', 'payout_ratio'],
  ]

  return (
    <div className="grid grid-cols-2 gap-x-8">
      {rows.map(([label, key]) => {
        const val = record[key] as string | null
        if (!val) return null
        return (
          <div key={key} className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-sm text-slate-800 font-medium">{val}</span>
          </div>
        )
      })}
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
    <div className="max-w-4xl mx-auto space-y-6">
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

        {report.listing_status && (
          <div className="flex gap-3 py-3 border-b border-slate-100">
            <span className="text-sm text-slate-500 w-32 shrink-0">上場区分</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                report.listing_status === '上場'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {report.listing_status}
              </span>
              {report.stock_exchange && (
                <span className="text-sm text-slate-600">{report.stock_exchange}</span>
              )}
              {report.stock_code && (
                <span className="text-sm text-slate-500 font-mono">{report.stock_code}</span>
              )}
            </div>
          </div>
        )}

        <InfoRow label="業種・業態" value={report.industry} />
        <InfoRow label="設立" value={report.founded} />
        <InfoRow label="資本金" value={report.capital} />
        <InfoRow label="代表者" value={report.representative} />
        <InfoRow label="従業員数" value={report.employee_count} />
        <InfoRow label="本社所在地" value={report.address} />
        {report.website && (
          <div className="flex gap-3 py-3 border-b border-slate-100">
            <span className="text-sm text-slate-500 w-32 shrink-0">公式HP</span>
            <a href={report.website} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex-1 break-all">
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

      {/* 決算情報セクション（上場企業のみ） */}
      {report.listing_status === '上場' && (
        <FinancialSection reportId={id} />
      )}
    </div>
  )
}
