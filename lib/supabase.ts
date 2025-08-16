import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface User {
  id: number
  telegram_id: number
  username?: string
  first_name?: string
  last_name?: string
  is_admin: boolean
  created_at: string
}

export interface AuthCode {
  id: number
  code: string
  telegram_id: number
  used: boolean
  expires_at: string
  created_at: string
}

export interface Agency {
  id: number
  name: string
  type: string
  country: string
  description?: string
  logo_url?: string
  rating: number
  reviews_count: number
  status: "pending" | "approved" | "rejected"
  submitted_by?: number
  created_at: string
}

export interface Review {
  id: number
  agency_id: number
  user_id: number
  first_name: string
  last_name: string
  country: string
  rating: number
  comment?: string
  created_at: string
}
