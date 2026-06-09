import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
  const { companyName, website, corporateNumber, listingStatus } = await req.json()

  if (!companyName?.trim()) {
    return NextResponse.json({ error: '企業名を入力してください' }, { status: 400 })
  }

  const listingInstruction = listingStatus
    ? `上場区分は「${listingStatus}」です。`
    : `上場・非上場の区別をWeb検索で判定してください。上場企業の場合は上場市場（東証プライム／スタンダード／グロース等）と証券コードも調べてください。`

  const prompt = `以下の企業について調査し、情報を収集してください。

企業名: ${companyName}
${website ? `公式HP: ${website}` : ''}
${corporateNumber ? `法人番号: ${corporateNumber}` : ''}

${listingInstruction}

Web検索を使って上記の企業の公式サイトやニュース等を調べ、以下のJSON形式のみで回答してください。他のテキストは一切含めないでください。

{
  "company_name": "正式企業名（登記名称）",
  "listing_status": "上場" または "非上場",
  "stock_exchange": "上場市場（例：東証プライム、東証スタンダード、東証グロース）。非上場の場合はnull",
  "stock_code": "証券コード（4桁）。非上場の場合はnull",
  "industry": "業種・業態",
  "founded": "設立年月日",
  "capital": "資本金",
  "representative": "代表者名・役職",
  "employee_count": "従業員数",
  "address": "本社所在地",
  "business_description": "事業内容・主要サービス（200文字程度）",
  "recent_topics": "最近のニュース・トピック（3〜5件を箇条書き、各項目を改行区切り）"
}

情報が不明な場合はnullを設定してください。`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

  let responseText = ''

  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
      messages,
    })

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.findLast((b) => b.type === 'text')
      responseText = textBlock?.type === 'text' ? textBlock.text : ''
      break
    }

    messages.push({ role: 'assistant', content: response.content })

    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')
    if (toolUseBlocks.length === 0) {
      const textBlock = response.content.findLast((b) => b.type === 'text')
      responseText = textBlock?.type === 'text' ? textBlock.text : ''
      break
    }

    messages.push({
      role: 'user',
      content: toolUseBlocks.map((b) => ({
        type: 'tool_result' as const,
        tool_use_id: (b as Anthropic.ToolUseBlock).id,
        content: '',
      })),
    })
  }

  // マークダウンのコードブロックを除去してからJSONを抽出
  const cleaned = responseText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json(
      { error: 'AIの応答を解析できませんでした', raw: responseText.slice(0, 300) },
      { status: 500 }
    )
  }

  let parsed: Record<string, string | null>
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json(
      { error: 'JSONの解析に失敗しました', raw: jsonMatch[0].slice(0, 300) },
      { status: 500 }
    )
  }

  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .insert({
      company_name: parsed.company_name || companyName,
      website: website || null,
      corporate_number: corporateNumber || null,
      listing_status: parsed.listing_status || listingStatus || null,
      stock_exchange: parsed.stock_exchange || null,
      stock_code: parsed.stock_code || null,
      industry: parsed.industry || null,
      founded: parsed.founded || null,
      capital: parsed.capital || null,
      representative: parsed.representative || null,
      employee_count: parsed.employee_count || null,
      address: parsed.address || null,
      business_description: parsed.business_description || null,
      recent_topics: parsed.recent_topics || null,
    })
    .select()
    .single()

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 })
  }

  return NextResponse.json({ reportId: reportData.id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
