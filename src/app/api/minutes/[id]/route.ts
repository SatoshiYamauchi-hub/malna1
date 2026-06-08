import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: minutes, error: minutesError } = await supabase
    .from('minutes')
    .select('*')
    .eq('id', id)
    .single()

  if (minutesError) return NextResponse.json({ error: minutesError.message }, { status: 404 })

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('minutes_id', id)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 })

  return NextResponse.json({ minutes, tasks })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { error } = await supabase.from('minutes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
