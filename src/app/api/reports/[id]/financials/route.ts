import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

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

// ─── POST: web_search で財務データを抽出・保存 ───────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  const prompt = `${report.company_name}の決算情報をWeb検索で調べてください。
${report.website ? `公式サイト: ${report.website}` : ''}

以下の情報を収集してください：
1. 直近の決算短信（最新1期）の財務データとPDF URL
2. 過去の有価証券報告書（最大3期分、取れた分だけ）の財務データとPDF URL

以下のJSON配列のみ返してください。他のテキストは不要です。

[
  {
    "fiscal_year": "2024年3月期",
    "record_type": "決算短信",
    "is_latest": true,
    "pdf_url": "https://... または null",
    "revenue": "売上高（単位込み）または null",
    "gross_profit": "売上総利益 または null",
    "operating_profit": "営業利益 または null",
    "operating_margin": "営業利益率（%） または null",
    "ordinary_profit": "経常利益 または null",
    "net_profit": "当期純利益 または null",
    "eps": "EPS（1株当たり利益） または null",
    "total_assets": "総資産 または null",
    "net_assets": "純資産 または null",
    "equity_ratio": "自己資本比率（%） または null",
    "interest_bearing_debt": "有利子負債 または null",
    "operating_cf": "営業CF または null",
    "investing_cf": "投資CF または null",
    "financing_cf": "財務CF または null",
    "free_cf": "フリーCF または null",
    "roe": "ROE（%） または null",
    "roa": "ROA（%） または null",
    "dividend_per_share": "1株配当 または null",
    "payout_ratio": "配当性向（%） または null"
  }
]

不明な項目はnullにしてください。`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
  let responseText = ''

  for (let i = 0; i < 8; i++) {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
      messages,
    })

    if (res.stop_reason === 'end_turn') {
      const tb = res.content.findLast((b) => b.type === 'text')
      responseText = tb?.type === 'text' ? tb.text : ''
      break
    }

    messages.push({ role: 'assistant', content: res.content })
    const toolUses = res.content.filter((b) => b.type === 'tool_use')
    if (!toolUses.length) {
      const tb = res.content.findLast((b) => b.type === 'text')
      responseText = tb?.type === 'text' ? tb.text : ''
      break
    }
    messages.push({
      role: 'user',
      content: toolUses.map((b) => ({
        type: 'tool_result' as const,
        tool_use_id: (b as Anthropic.ToolUseBlock).id,
        content: '',
      })),
    })
  }

  const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const arrMatch = cleaned.match(/\[[\s\S]*\]/)
  if (!arrMatch) {
    return NextResponse.json({ error: '財務データの取得に失敗しました', raw: responseText.slice(0, 300) }, { status: 500 })
  }

  let records: Record<string, unknown>[]
  try {
    records = JSON.parse(arrMatch[0])
  } catch {
    return NextResponse.json({ error: 'JSONの解析に失敗しました', raw: arrMatch[0].slice(0, 300) }, { status: 500 })
  }

  if (!records.length) {
    return NextResponse.json({ message: '財務データが見つかりませんでした', records: [] })
  }

  // 既存レコードを削除して入れ直す
  await supabase.from('financial_records').delete().eq('report_id', id)

  const savedRecords = []
  for (const rec of records) {
    const { data: saved, error: insertErr } = await supabase
      .from('financial_records')
      .insert({
        report_id: id,
        fiscal_year: rec.fiscal_year ?? '不明',
        record_type: rec.record_type ?? '決算短信',
        is_latest: rec.is_latest ?? false,
        pdf_url: rec.pdf_url ?? null,
        revenue: rec.revenue ?? null,
        gross_profit: rec.gross_profit ?? null,
        operating_profit: rec.operating_profit ?? null,
        operating_margin: rec.operating_margin ?? null,
        ordinary_profit: rec.ordinary_profit ?? null,
        net_profit: rec.net_profit ?? null,
        eps: rec.eps ?? null,
        total_assets: rec.total_assets ?? null,
        net_assets: rec.net_assets ?? null,
        equity_ratio: rec.equity_ratio ?? null,
        interest_bearing_debt: rec.interest_bearing_debt ?? null,
        operating_cf: rec.operating_cf ?? null,
        investing_cf: rec.investing_cf ?? null,
        financing_cf: rec.financing_cf ?? null,
        free_cf: rec.free_cf ?? null,
        roe: rec.roe ?? null,
        roa: rec.roa ?? null,
        dividend_per_share: rec.dividend_per_share ?? null,
        payout_ratio: rec.payout_ratio ?? null,
      })
      .select()
      .single()

    if (!insertErr && saved) savedRecords.push(saved)
  }

  return NextResponse.json({ records: savedRecords })
}
