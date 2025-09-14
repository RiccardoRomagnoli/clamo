import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '~/utils/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // If code exists in the URL, exchange it for a session
  if (code) {
    console.log('Authenticating user with email token')
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({token_hash: code, type: 'email'})
    console.log('verifyOtp result', { data, error })
  }
  
  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
