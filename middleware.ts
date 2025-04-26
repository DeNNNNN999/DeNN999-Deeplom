import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const publicPaths = ['/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Check if user is authenticated
  const authToken = request.cookies.get('auth_token')?.value;
  
  if (!authToken && !pathname.startsWith('/auth/')) {
    // Redirect to login if not authenticated
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes 
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api|.*\\..*$).*)',
  ],
};