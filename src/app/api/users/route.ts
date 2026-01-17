import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth, clerkClient } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Create admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create regular client for auth verification
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getOrganizationSlugFromHost(host: string): string | null {
  if (!host) {
    return null;
  }

  const isLocalhost = host.includes('localhost');
  if (isLocalhost) {
    const parts = host.split('.');
    if (parts.length < 2) {
      return null;
    }
    return parts[0];
  }

  const subdomain = host.split('.')[0];
  if (!subdomain || subdomain === 'www') {
    return null;
  }
  return subdomain;
}

async function getOrganizationFromRequest(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const slug = getOrganizationSlugFromHost(host);
  if (!slug) {
    return null;
  }

  const { data: organization, error } = await supabaseAdmin
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (error || !organization) {
    return null;
  }

  return organization;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const organization = await getOrganizationFromRequest(request);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { data: membership } = await supabaseAdmin
      .from('user_organization_memberships')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organization.id)
      .single();

    if (!membership || !membership.is_active) {
      return NextResponse.json(
        { error: 'User not active in this organization' },
        { status: 403 }
      );
    }

    if (membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can view users' },
        { status: 403 }
      );
    }

    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('user_organization_memberships')
      .select('id, user_id, role, is_active, created_at, updated_at, user: user_profiles ( id, full_name, avatar_url, created_at, updated_at )')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    if (membershipsError) {
      throw membershipsError;
    }

    const usersWithDetails = await Promise.all(
      (memberships || []).map(async (entry) => {
        // Try to get email from Clerk if possible, or skip if strict on rate limits
        // For now, returning null for email to avoid N+1 Clerk calls unless necessary
        // Or we could fetch user list from Clerk filtering by IDs
        return {
          id: entry.user_id,
          role: entry.role,
          is_active: entry.is_active,
          full_name: entry.user?.full_name || null,
          avatar_url: entry.user?.avatar_url || null,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          email: null, // Email requires fetching from Clerk
          has_password: true, // Clerk users always have some auth method
        };
      })
    );

    return NextResponse.json({ users: usersWithDetails });
  } catch (error: any) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const organization = await getOrganizationFromRequest(request);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { data: membership } = await supabaseAdmin
      .from('user_organization_memberships')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organization.id)
      .single();

    if (!membership || !membership.is_active) {
      return NextResponse.json(
        { error: 'User not active in this organization' },
        { status: 403 }
      );
    }

    if (membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can create users' },
        { status: 403 }
      );
    }

    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if user exists in Clerk
    const client = await clerkClient();
    const { data: users } = await client.users.getUserList({ emailAddress: [email] });
    const existingUser = users[0];

    if (existingUser) {
      const { data: existingMembership } = await supabaseAdmin
        .from('user_organization_memberships')
        .select('id, is_active')
        .eq('user_id', existingUser.id)
        .eq('organization_id', organization.id)
        .single();

      if (existingMembership?.id) {
        if (existingMembership.is_active) {
          return NextResponse.json(
            { error: 'El usuario ya existe en esta organización' },
            { status: 400 }
          );
        }

        const { error: reActivateError } = await supabaseAdmin
          .from('user_organization_memberships')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', existingMembership.id);

        if (reActivateError) {
          throw new Error(`Error al reactivar usuario: ${reActivateError.message}`);
        }

        return NextResponse.json({
          userId: existingUser.id,
          email,
          message: 'Usuario reactivado en la organización',
        });
      }

      await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: existingUser.id,
          full_name: name,
        });

      const { error: membershipError } = await supabaseAdmin
        .from('user_organization_memberships')
        .insert({
          user_id: existingUser.id,
          organization_id: organization.id,
          role: 'member',
          is_active: true,
        });

      if (membershipError) {
        throw new Error(`Error al agregar usuario: ${membershipError.message}`);
      }

      return NextResponse.json({
        userId: existingUser.id,
        email,
        message: 'Usuario agregado a la organización',
      });
    }

    // User does not exist in Clerk
    return NextResponse.json(
      { error: 'El usuario no tiene cuenta en el sistema. Pídale que se registre primero.' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
