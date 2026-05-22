import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, images, and OAuth callback routes.
     * Auth callback must receive ?token=… untouched by session middleware.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/error|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
