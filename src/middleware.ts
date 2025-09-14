import { type NextRequest } from 'next/server'
import { updateSession } from '~/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes)
     * - privacy-policy (privacy policy path)
     * - terms-and-conditions (terms and conditions path)
     * - support (support path)
     * - help (help path)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|privacy-policy|terms-and-conditions|support|help|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|mov|avi|mkv|wmv|flv|webm)$).*)',
  ],
}