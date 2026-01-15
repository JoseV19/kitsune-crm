import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
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
      .eq('user_id', user.id)
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
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(entry.user_id);
        return {
          id: entry.user_id,
          role: entry.role,
          is_active: entry.is_active,
          full_name: entry.user?.full_name || null,
          avatar_url: entry.user?.avatar_url || null,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          email: authUser?.user?.email || null,
          has_password: !!authUser?.user?.encrypted_password,
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
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
      .eq('user_id', user.id)
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

    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (existingUser?.user) {
      const { data: existingMembership } = await supabaseAdmin
        .from('user_organization_memberships')
        .select('id, is_active')
        .eq('user_id', existingUser.user.id)
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
          userId: existingUser.user.id,
          email,
          message: 'Usuario reactivado en la organización',
        });
      }

      await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: existingUser.user.id,
          full_name: name,
        });

      const { error: membershipError } = await supabaseAdmin
        .from('user_organization_memberships')
        .insert({
          user_id: existingUser.user.id,
          organization_id: organization.id,
          role: 'member',
          is_active: true,
        });

      if (membershipError) {
        throw new Error(`Error al agregar usuario: ${membershipError.message}`);
      }

      return NextResponse.json({
        userId: existingUser.user.id,
        email,
        message: 'Usuario agregado a la organización',
      });
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    });

    if (createError || !newUser.user) {
      throw new Error(`Error al crear usuario: ${createError?.message || 'Error desconocido'}`);
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        full_name: name,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Error al crear perfil: ${profileError.message}`);
    }

    const { error: membershipError } = await supabaseAdmin
      .from('user_organization_memberships')
      .insert({
        user_id: newUser.user.id,
        organization_id: organization.id,
        role: 'member',
        is_active: true,
      });

    if (membershipError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Error al crear membresía: ${membershipError.message}`);
    }

    return NextResponse.json({
      userId: newUser.user.id,
      email,
      message: 'Usuario creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
