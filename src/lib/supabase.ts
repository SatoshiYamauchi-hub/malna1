import { createClient } from '@supabase/supabase-js'

export interface Report {
  id: string
  company_name: string
  website: string | null
  corporate_number: string | null
  listing_status: '上場' | '非上場' | null
  stock_exchange: string | null
  stock_code: string | null
  industry: string | null
  founded: string | null
  capital: string | null
  representative: string | null
  employee_count: string | null
  address: string | null
  business_description: string | null
  recent_topics: string | null
  created_at: string
}

export interface FinancialRecord {
  id: string
  report_id: string
  fiscal_year: string
  record_type: '決算短信' | '有価証券報告書'
  is_latest: boolean
  pdf_url: string | null
  // 損益
  revenue: string | null
  gross_profit: string | null
  operating_profit: string | null
  operating_margin: string | null
  ordinary_profit: string | null
  net_profit: string | null
  eps: string | null
  // 財政
  total_assets: string | null
  net_assets: string | null
  equity_ratio: string | null
  interest_bearing_debt: string | null
  // CF
  operating_cf: string | null
  investing_cf: string | null
  financing_cf: string | null
  free_cf: string | null
  // 指標
  roe: string | null
  roa: string | null
  dividend_per_share: string | null
  payout_ratio: string | null
  created_at: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
