import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = ['/chat', '/settings', '/profile'];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('monoxide-token')?.value;

  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|uv|scram|epoxy|baremux|wisp|fonts|emojis|game-icons|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
