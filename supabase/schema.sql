-- 企業調査レポートテーブル
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website text,
  corporate_number text,
  industry text,
  founded text,
  capital text,
  representative text,
  employee_count text,
  address text,
  business_description text,
  recent_topics text,
  created_at timestamptz default now()
);

-- インデックス
create index if not exists reports_company_name_idx on reports(company_name);
create index if not exists reports_created_at_idx on reports(created_at desc);
