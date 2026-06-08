'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Minutes, Task, TaskStatus } from '@/lib/supabase'

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

export default function MinutesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [minutes, setMinutes] = useState<Minutes | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/minutes/${id}`)
      .then(r => r.json())
      .then(data => {
        setMinutes(data.minutes)
        setTasks(data.tasks)
        setLoading(false)
      })
  }, [id])

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

  const deleteTask = async (taskId: string) => {
    if (!confirm('このタスクを削除しますか？')) return
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const deleteMinutes = async () => {
    if (!confirm('この議事録とすべてのタスクを削除しますか？')) return
    setDeleting(true)
    const res = await fetch(`/api/minutes/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/minutes')
    else setDeleting(false)
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date(new Date().toDateString())
  }

  if (loading) return <div className="text-slate-400 text-sm">読み込み中...</div>
  if (!minutes) return <div className="text-red-500 text-sm">議事録が見つかりません</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/minutes" className="text-sm text-blue-500 hover:underline mb-2 inline-block">← 一覧へ</Link>
          <h2 className="text-2xl font-bold text-slate-800">{minutes.title}</h2>
          {minutes.meeting_date && (
            <p className="text-slate-400 text-sm mt-1">会議日: {minutes.meeting_date}</p>
          )}
        </div>
        <button
          onClick={deleteMinutes}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          削除
        </button>
      </div>

      {minutes.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">AI要約</h3>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{minutes.summary}</p>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">
          アクションアイテム <span className="text-slate-400 text-sm font-normal">({tasks.length}件)</span>
        </h3>

        {tasks.length === 0 ? (
          <div className="text-slate-400 text-sm py-8 text-center bg-white rounded-xl border border-slate-200">
            タスクが抽出されませんでした
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${task.status === 'done' ? 'opacity-60' : 'border-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {task.assignee && (
                      <span className="text-xs text-slate-500">担当: {task.assignee}</span>
                    )}
                    {task.due_date && (
                      <span className={`text-xs ${isOverdue(task.due_date) && task.status !== 'done' ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                        期限: {task.due_date}
                        {isOverdue(task.due_date) && task.status !== 'done' && ' (期限超過)'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={task.status}
                    onChange={e => updateStatus(task.id, e.target.value as TaskStatus)}
                    className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${STATUS_COLORS[task.status]}`}
                  >
                    {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="bg-white rounded-xl border border-slate-200">
        <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900">
          原文を表示
        </summary>
        <div className="px-5 pb-5">
          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-4 overflow-auto max-h-96">
            {minutes.content}
          </pre>
        </div>
      </details>
    </div>
  )
}
