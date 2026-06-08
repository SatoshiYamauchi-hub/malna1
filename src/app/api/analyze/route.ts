import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { title, content, meetingDate } = await req.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: '議事録の内容を入力してください' }, { status: 400 })
  }

  const prompt = `以下の議事録を分析してください。

## 議事録
${content}

## 指示
以下のJSON形式で回答してください。JSONのみ返してください。

{
  "summary": "議事録の要点を3〜5行で要約",
  "tasks": [
    {
      "title": "タスクのタイトル（具体的なアクション）",
      "assignee": "担当者名（不明な場合はnull）",
      "due_date": "期限（YYYY-MM-DD形式、不明な場合はnull）"
    }
  ]
}

タスクは議事録から読み取れる具体的なアクションアイテムを全て抽出してください。`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'AIの応答を解析できませんでした' }, { status: 500 })
  }

  const parsed = JSON.parse(jsonMatch[0])

  const { data: minutesData, error: minutesError } = await supabase
    .from('minutes')
    .insert({
      title: title || '無題の議事録',
      content,
      summary: parsed.summary,
      meeting_date: meetingDate || null,
    })
    .select()
    .single()

  if (minutesError) {
    return NextResponse.json({ error: minutesError.message }, { status: 500 })
  }

  if (parsed.tasks?.length > 0) {
    const tasksToInsert = parsed.tasks.map((t: { title: string; assignee: string | null; due_date: string | null }) => ({
      minutes_id: minutesData.id,
      title: t.title,
      assignee: t.assignee || null,
      due_date: t.due_date || null,
      status: 'todo',
    }))

    const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert)
    if (tasksError) {
      return NextResponse.json({ error: tasksError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ minutesId: minutesData.id, summary: parsed.summary, taskCount: parsed.tasks?.length ?? 0 })
}
