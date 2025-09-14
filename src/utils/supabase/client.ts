import { createBrowserClient } from '@supabase/ssr'
import { env } from '~/env'
import { authConfig } from './config'

// Create Supabase client with default cookie handling
const createClient = () => {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export const supabase = createClient()