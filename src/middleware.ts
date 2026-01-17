import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  if (!isPublicRoute(req)) {
    await auth.protect();
    
    // Check onboarding status for dashboard and other protected routes
    // Allow access to onboarding routes and API routes even if not onboarded
    // (API routes handle their own authorization logic)
    if (!isOnboardingRoute(req) && !isApiRoute(req)) {
      const { userId } = await auth();
      
      if (userId) {
        try {
          // Create Supabase admin client in middleware (uses service role to bypass RLS)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables in middleware');
            // Allow access if env vars are missing to avoid blocking
            return;
          }
          
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });
          
          // Query directly in middleware using admin client
          const { data: memberships, error } = await supabaseAdmin
            .from('user_organization_memberships')
            .select('id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1);
          
          if (error) {
            console.error('Error checking user organizations in middleware:', error);
            // On error, allow access to avoid blocking users
            return;
          }
          
          // If user has no active organizations, redirect to onboarding
          if (!memberships || memberships.length === 0) {
            const url = req.nextUrl.clone();
            url.pathname = '/onboarding';
            return NextResponse.redirect(url);
          }
        } catch (error) {
          // If there's an error checking organizations, allow access
          // to avoid blocking users due to transient errors
          console.error('Error checking user organizations:', error);
        }
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
