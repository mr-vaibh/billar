import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/admin/login',
  '/forgot-password',
  '/reset-password',
  '/invite',
];

const PUBLIC_API_PREFIXES = [
  '/api/auth/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public API routes
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Public pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('billar_session')?.value;
  if (!token) {
    return redirectToLogin(request);
  }

  // Validate session via a lightweight DB check in the API route
  // We can't import Prisma here (Edge runtime limitation), so we validate
  // via an internal API call only when needed. For most requests, rely on
  // the session cookie being present and validate in individual route handlers.
  // For sensitive paths (/admin, /orgs), do a server-side check.

  // For /admin/* routes — we validate in the route handler that user.isSuperAdmin
  // For /orgs/[orgId]/* routes — validate membership in route handlers

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
