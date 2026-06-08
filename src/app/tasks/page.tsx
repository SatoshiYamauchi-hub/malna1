'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Task, TaskStatus } from '@/lib/supabase'

type TaskWithMinutes = Task & { minutes: { title: string; meeting_date: string | null } | null }

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '対応中',
  done: '完了',
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithMinutes[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all')

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(data => { setTasks(data); setLoading(false) })
  }, [])

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    }
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date(new Date().toDateString())
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)
  const overdueTodos = tasks.filter(t => t.status !== 'done' && isOverdue(t.due_date))

  if (loading) return <div className="text-slate-400 text-sm">読み込み中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">タスク一覧</h2>
        <span className="text-sm text-slate-400">{tasks.length}件</span>
      </div>

      {overdueTodos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 mb-5 text-sm text-red-700">
          期限超過のタスクが <strong>{overdueTodos.length}件</strong> あります
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {(['all', 'todo', 'in_progress', 'done'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'}`}
          >
            {s === 'all' ? 'すべて' : STATUS_LABELS[s]}
            {s !== 'all' && (
              <span className="ml-1 opacity-70">({tasks.filter(t => t.status === s).length})</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">タスクがありません</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <div key={task.id} className={`bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 ${task.status === 'done' ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {task.assignee && (
                    <span className="text-xs text-slate-500">担当: {task.assignee}</span>
                  )}
                  {task.due_date && (
                    <span className={`text-xs ${isOverdue(task.due_date) && task.status !== 'done' ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                      期限: {task.due_date}
                      {isOverdue(task.due_date) && task.status !== 'done' && ' (超過)'}
                    </span>
                  )}
                  {task.minutes && (
                    <Link href={`/minutes/${task.minutes_id}`} className="text-xs text-blue-400 hover:underline">
                      {task.minutes.title}
                    </Link>
                  )}
                </div>
              </div>
              <select
                value={task.status}
                onChange={e => updateStatus(task.id, e.target.value as TaskStatus)}
                className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer shrink-0 ${STATUS_COLORS[task.status]}`}
              >
                {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
