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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
