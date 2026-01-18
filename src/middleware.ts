import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildSubdomainUrl, getHostInfo, getLastOrganizationCookieName } from "@/lib/utils/url-helper";

const isPublicRoute = createRouteMatcher([
  '/',
  '/auth/sign-in(.*)',
  '/auth/sign-up(.*)',
]);

const isOnboardingRoute = createRouteMatcher([
  '/onboarding',
  '/select-organization',
]);

const isApiRoute = createRouteMatcher([
  '/api(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const { baseHost } = getHostInfo(hostHeader);
  const pathname = req.nextUrl.pathname;
  const isApiRequest = isApiRoute(req);
  const lastOrgCookie = req.cookies.get(getLastOrganizationCookieName())?.value;
  const pathSegments = pathname.split('/').filter(Boolean);
  const reservedRoots = new Set([
    'dashboard',
    'products',
    'users',
    'auth',
    'onboarding',
    'select-organization',
    'api',
  ]);
  const tenantSlug =
    pathSegments.length > 1
      ? pathSegments[0]
      : pathSegments.length === 1 && !reservedRoots.has(pathSegments[0])
        ? pathSegments[0]
        : null;
  const isTenantPath = Boolean(tenantSlug) && !isPublicRoute(req) && !isOnboardingRoute(req) && !isApiRequest;

  const redirectToMainDomain = (targetPath: string) => {
    const url = req.nextUrl.clone();
    url.host = baseHost;
    url.pathname = targetPath;
    url.search = '';
    return NextResponse.redirect(url);
  };

  const redirectToOrganizationPath = (slug: string, targetPath: string) => {
    const baseUrl = buildSubdomainUrl(slug, baseHost, req.nextUrl.protocol);
    return NextResponse.redirect(`${baseUrl}${targetPath}`);
  };

  if (isTenantPath) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('slug', tenantSlug)
        .single();

      if (orgError || !org) {
        const { userId } = await auth();
        return userId
          ? redirectToMainDomain('/select-organization')
          : redirectToMainDomain('/');
      }
    }
  }

  if (!isApiRequest && isPublicRoute(req)) {
    const { userId } = await auth();
    if (userId && pathname.startsWith('/auth')) {
      if (lastOrgCookie) {
        return redirectToOrganizationPath(lastOrgCookie, '/dashboard');
      }
      return NextResponse.redirect(new URL('/select-organization', req.url));
    }
  }

  if (!isApiRequest && !isPublicRoute(req) && !isOnboardingRoute(req) && pathname !== '/') {
    const { userId } = await auth();
    if (userId) {
      if (lastOrgCookie) {
        if (pathname === `/${lastOrgCookie}` || pathname.startsWith(`/${lastOrgCookie}/`)) {
          return NextResponse.next();
        }
        return redirectToOrganizationPath(lastOrgCookie, pathname);
      }
      return NextResponse.redirect(new URL('/select-organization', req.url));
    }
  }

  if (!isApiRequest && !isPublicRoute(req)) {
    await auth.protect();
  }

  if (!isOnboardingRoute(req) && !isApiRequest) {
    const { userId } = await auth();

    if (userId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('Missing Supabase environment variables in middleware');
          return;
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        const { data: memberships, error } = await supabaseAdmin
          .from('user_organization_memberships')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1);

        if (error) {
          console.error('Error checking user organizations in middleware:', error);
          return;
        }

        if (!memberships || memberships.length === 0) {
          const url = req.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
      } catch (error) {
        console.error('Error checking user organizations:', error);
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
