import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Get user by email using admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (userError || !userData?.user) {
      return NextResponse.json(
        { exists: false, needsPassword: false },
        { status: 200 }
      );
    }

    const user = userData.user;

    // Check if user has a password set
    // Users without passwords won't have encrypted_password
    const hasPassword = !!user.encrypted_password;

    // Check if user has at least one organization membership
    const { data: memberships } = await supabaseAdmin
      .from('user_organization_memberships')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    return NextResponse.json({
      exists: true,
      needsPassword: !hasPassword,
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
