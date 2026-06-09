import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '企業調査レポート',
  description: '企業情報をWeb検索で自動収集・レポート化',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-6">
            <h1 className="text-xl font-bold text-slate-800">企業調査レポート</h1>
            <nav className="flex gap-4">
              <a href="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">企業情報入力</a>
              <a href="/reports" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">レポート一覧</a>
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
