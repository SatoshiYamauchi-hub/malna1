import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

export const maxDuration = 120

const client = new Anthropic()

// ─── GET: 保存済み財務データを返す ───────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabase
    .from('financial_records')
    .select('*')
    .eq('report_id', id)
    .order('fiscal_year', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ─── POST: PDF を探して財務データを抽出・保存 ───────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // レポート取得
  const { data: report, error: reportErr } = await supabase
    .from('reports')
    .select('company_name, website, listing_status')
    .eq('id', id)
    .single()

  if (reportErr || !report) {
    return NextResponse.json({ error: 'レポートが見つかりません' }, { status: 404 })
  }
  if (report.listing_status !== '上場') {
    return NextResponse.json({ error: '上場企業のみ対応しています' }, { status: 400 })
  }

  // ── STEP 1: IR ページから PDF URL を収集 ────────────────────────────
  const urlPrompt = `${report.company_name}の投資家向け情報（IRページ）から以下のPDFのURLを調べてください。
${report.website ? `公式サイト: ${report.website}` : ''}

取得対象：
1. 直近の「決算短信」PDF（最新1件のみ）
2. 過去の「有価証券報告書」または「決算書」PDF（最大3期分、古い順不問）

以下のJSON配列のみ返してください。URLが見つからない場合は空配列を返してください。

[
  {
    "fiscal_year": "2024年3月期",
    "record_type": "決算短信",
    "is_latest": true,
    "pdf_url": "https://..."
  },
  {
    "fiscal_year": "2024年3月期",
    "record_type": "有価証券報告書",
    "is_latest": false,
    "pdf_url": "https://..."
  }
]`

  const urlMessages: Anthropic.MessageParam[] = [{ role: 'user', content: urlPrompt }]
  let urlResponseText = ''

  for (let i = 0; i < 8; i++) {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
      messages: urlMessages,
    })

    if (res.stop_reason === 'end_turn') {
      const tb = res.content.findLast((b) => b.type === 'text')
      urlResponseText = tb?.type === 'text' ? tb.text : ''
      break
    }

    urlMessages.push({ role: 'assistant', content: res.content })
    const toolUses = res.content.filter((b) => b.type === 'tool_use')
    if (!toolUses.length) {
      const tb = res.content.findLast((b) => b.type === 'text')
      urlResponseText = tb?.type === 'text' ? tb.text : ''
      break
    }
    urlMessages.push({
      role: 'user',
      content: toolUses.map((b) => ({
        type: 'tool_result' as const,
        tool_use_id: (b as Anthropic.ToolUseBlock).id,
        content: '',
      })),
    })
  }

  const cleanedUrl = urlResponseText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
  const arrMatch = cleanedUrl.match(/\[[\s\S]*\]/)
  if (!arrMatch) {
    return NextResponse.json({ error: 'PDF URLの取得に失敗しました' }, { status: 500 })
  }

  let pdfList: Array<{
    fiscal_year: string
    record_type: '決算短信' | '有価証券報告書'
    is_latest: boolean
    pdf_url: string
  }>
  try {
    pdfList = JSON.parse(arrMatch[0])
  } catch {
    return NextResponse.json({ error: 'PDF URLリストの解析に失敗しました' }, { status: 500 })
  }

  if (!pdfList.length) {
    return NextResponse.json({ message: 'PDFが見つかりませんでした', records: [] })
  }

  // ── STEP 2: 各 PDF から財務データを抽出 ─────────────────────────────
  const extractPrompt = (fiscalYear: string, recordType: string) =>
    `添付のPDF（${fiscalYear} ${recordType}）から財務データを抽出し、以下のJSON形式のみで返してください。
単位は記載されている通りに含めてください（例：「1,234億円」「123.4億円」）。
不明な項目はnullにしてください。

{
  "revenue": "売上高",
  "gross_profit": "売上総利益",
  "operating_profit": "営業利益",
  "operating_margin": "営業利益率（%表記）",
  "ordinary_profit": "経常利益",
  "net_profit": "当期純利益",
  "eps": "1株当たり当期純利益（EPS）",
  "total_assets": "総資産",
  "net_assets": "純資産",
  "equity_ratio": "自己資本比率（%表記）",
  "interest_bearing_debt": "有利子負債",
  "operating_cf": "営業活動によるキャッシュフロー",
  "investing_cf": "投資活動によるキャッシュフロー",
  "financing_cf": "財務活動によるキャッシュフロー",
  "free_cf": "フリーキャッシュフロー（営業CF＋投資CF）",
  "roe": "ROE（自己資本利益率・%表記）",
  "roa": "ROA（総資産利益率・%表記）",
  "dividend_per_share": "1株当たり配当金",
  "payout_ratio": "配当性向（%表記）"
}`

  const savedRecords = []

  for (const pdf of pdfList) {
    if (!pdf.pdf_url) continue

    let parsed: Record<string, string | null> = {}

    try {
      const res = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'url', url: pdf.pdf_url },
              } as Anthropic.DocumentBlockParam,
              {
                type: 'text',
                text: extractPrompt(pdf.fiscal_year, pdf.record_type),
              },
            ],
          },
        ],
      })

      const tb = res.content.find((b) => b.type === 'text')
      const raw = tb?.type === 'text' ? tb.text : ''
      const cleanedRaw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const jsonMatch = cleanedRaw.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    } catch {
      // PDF 読み取り失敗はスキップ（URLが無効など）
      continue
    }

    const { data: record, error: insertErr } = await supabase
      .from('financial_records')
      .insert({
        report_id: id,
        fiscal_year: pdf.fiscal_year,
        record_type: pdf.record_type,
        is_latest: pdf.is_latest,
        pdf_url: pdf.pdf_url,
        ...Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, v || null])
        ),
      })
      .select()
      .single()

    if (!insertErr && record) savedRecords.push(record)
  }

  return NextResponse.json({ records: savedRecords })
}
