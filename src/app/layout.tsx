import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '議事録タスク管理',
  description: '議事録からアクションアイテムを自動抽出・管理',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-6">
            <h1 className="text-xl font-bold text-slate-800">議事録タスク管理</h1>
            <nav className="flex gap-4">
              <a href="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">議事録入力</a>
              <a href="/minutes" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">議事録一覧</a>
              <a href="/tasks" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">タスク一覧</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
