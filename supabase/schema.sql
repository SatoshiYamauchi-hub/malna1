-- 企業調査レポートテーブル
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website text,
  corporate_number text,
  listing_status text check (listing_status in ('上場', '非上場')),
  stock_exchange text,
  stock_code text,
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

-- 財務データテーブル（上場企業のPDFから抽出）
create table if not exists financial_records (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  fiscal_year text not null,
  record_type text not null check (record_type in ('決算短信', '有価証券報告書')),
  is_latest boolean default false,
  pdf_url text,
  -- 損益計算書
  revenue text,
  gross_profit text,
  operating_profit text,
  operating_margin text,
  ordinary_profit text,
  net_profit text,
  eps text,
  -- 貸借対照表
  total_assets text,
  net_assets text,
  equity_ratio text,
  interest_bearing_debt text,
  -- キャッシュフロー
  operating_cf text,
  investing_cf text,
  financing_cf text,
  free_cf text,
  -- 指標
  roe text,
  roa text,
  dividend_per_share text,
  payout_ratio text,
  created_at timestamptz default now()
);

create index if not exists financial_records_report_id_idx on financial_records(report_id);
create index if not exists financial_records_fiscal_year_idx on financial_records(fiscal_year);
