-- 議事録テーブル
create table if not exists minutes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  summary text,
  meeting_date date,
  created_at timestamptz default now()
);

-- タスクテーブル
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  minutes_id uuid references minutes(id) on delete cascade,
  title text not null,
  assignee text,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_at timestamptz default now()
);

-- インデックス
create index if not exists tasks_minutes_id_idx on tasks(minutes_id);
create index if not exists tasks_due_date_idx on tasks(due_date);
create index if not exists tasks_status_idx on tasks(status);
