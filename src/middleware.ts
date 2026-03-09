import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const protectedRoutes = ['/chat', '/settings', '/profile', '/games', '/proxy', '/connect'];

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in and trying to access a protected route, redirect to login
  if (!user) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // User is logged in — check for active bans on ALL routes
  // (poison bans need to trigger everywhere including /__p, /__q, landing page, etc.)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    };

    // Check direct user bans
    const banCheckUrl = `${supabaseUrl}/rest/v1/user_bans?user_id=eq.${user.id}&is_active=eq.true&select=id,ban_type,reason,expires_at`;
    const banRes = await fetch(banCheckUrl, { headers });

    if (banRes.ok) {
      const bans = await banRes.json();
      const activeBan = bans.find((ban: any) => {
        if (ban.expires_at && new Date(ban.expires_at) < new Date()) return false;
        return true;
      });

      if (activeBan) {
        // Poison ban: create an infinite redirect loop so the browser shows
        // "ERR_TOO_MANY_REDIRECTS" — site appears completely broken, no ban page
        if (activeBan.ban_type === 'poison') {
          const url = request.nextUrl.clone();
          url.pathname = pathname === '/__p' ? '/__q' : '/__p';
          url.searchParams.set('_', Date.now().toString());
          return NextResponse.redirect(url);
        }

        // Don't redirect to /banned if already on /banned (avoid loop)
        if (pathname !== '/banned') {
          const url = request.nextUrl.clone();
          url.pathname = '/banned';
          url.searchParams.set('type', activeBan.ban_type);
          url.searchParams.set('reason', activeBan.reason || '');
          if (activeBan.expires_at) url.searchParams.set('expires', activeBan.expires_at);
          return NextResponse.redirect(url);
        }
      }
    }

    // Check HWID bans — look up user's fingerprint, then check if that fingerprint is banned
    const profileUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=fingerprint`;
    const profileRes = await fetch(profileUrl, { headers });

    if (profileRes.ok) {
      const profiles = await profileRes.json();
      const fingerprint = profiles[0]?.fingerprint;

      if (fingerprint) {
        const hwidBanUrl = `${supabaseUrl}/rest/v1/user_bans?hwid=eq.${encodeURIComponent(fingerprint)}&is_active=eq.true&ban_type=eq.hwid&select=id,ban_type,reason,expires_at`;
        const hwidRes = await fetch(hwidBanUrl, { headers });

        if (hwidRes.ok) {
          const hwidBans = await hwidRes.json();
          const activeHwid = hwidBans.find((ban: any) => {
            if (ban.expires_at && new Date(ban.expires_at) < new Date()) return false;
            return true;
          });

          if (activeHwid && pathname !== '/banned') {
            const url = request.nextUrl.clone();
            url.pathname = '/banned';
            url.searchParams.set('type', 'hwid');
            url.searchParams.set('reason', activeHwid.reason || '');
            if (activeHwid.expires_at) url.searchParams.set('expires', activeHwid.expires_at);
            return NextResponse.redirect(url);
          }
        }
      }
    }
  } catch {
    // If ban check fails, allow access (fail open)
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|uv|scram|epoxy|baremux|baremod|wisp|bare|sw-uv\\.js|sw-scram\\.js|proxy-init\\.js|fonts|emojis|game-icons|uploads|MonoxideLogo\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
