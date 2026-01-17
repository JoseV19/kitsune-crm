import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get user by email using Clerk
    const client = await clerkClient();
    const { data: users } = await client.users.getUserList({ emailAddress: [email] });
    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { exists: false, needsPassword: false },
        { status: 200 }
      );
    }

    // Check if user has at least one organization membership in Supabase
    // We use the Clerk user ID as the user_id in our DB
    const { data: memberships } = await supabaseAdmin
      .from('user_organization_memberships')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    return NextResponse.json({
      exists: true,
      needsPassword: false, // Clerk handles authentication methods
      hasProfile: (memberships || []).length > 0,
      userId: user.id,
    });
  } catch (error: any) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
