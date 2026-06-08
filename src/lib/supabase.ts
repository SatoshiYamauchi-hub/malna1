import { createClient } from '@supabase/supabase-js'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Minutes {
  id: string
  title: string
  content: string
  summary: string | null
  meeting_date: string | null
  created_at: string
}

export interface Task {
  id: string
  minutes_id: string | null
  title: string
  assignee: string | null
  due_date: string | null
  status: TaskStatus
  created_at: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
