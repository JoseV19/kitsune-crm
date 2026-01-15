import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain
  // For localhost: subdomain.localhost:3000
  // For production: subdomain.kitsunecrm.com
  const subdomain = hostname.split('.')[0];
  
  // Skip middleware for:
  // - API routes
  // - Static files
  // - _next routes
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/favicon.ico') ||
    url.pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  // If no subdomain or subdomain is 'www' or main domain, allow through
  // (This handles the main domain case)
  if (!subdomain || subdomain === 'www' || subdomain === 'localhost' || subdomain.includes(':')) {
    // Main domain - allow through (for login, onboarding, etc.)
    return NextResponse.next();
  }

  if (url.pathname.startsWith('/select-organization')) {
    const isLocalhost = hostname.includes('localhost');
    const baseHost = isLocalhost
      ? hostname.split('.').slice(1).join('.') || hostname
      : hostname.split('.').slice(1).join('.');
    return NextResponse.redirect(new URL(`${url.protocol}//${baseHost}/select-organization`));
  }

  // Store subdomain in headers for use in the app
  const response = NextResponse.next();
  response.headers.set('x-organization-slug', subdomain);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
