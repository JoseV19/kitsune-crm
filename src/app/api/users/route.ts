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

// Create regular client for RLS queries
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
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

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.organization_id) {
      return NextResponse.json(
        { error: 'User not in an organization' },
        { status: 403 }
      );
    }

    // Check if user is owner
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can view users' },
        { status: 403 }
      );
    }

    // Get all users in organization
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw profilesError;
    }

    // Get email and password status for each user
    const usersWithDetails = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        return {
          ...profile,
          email: authUser?.user?.email,
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
    // Get auth token from request
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

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.organization_id) {
      return NextResponse.json(
        { error: 'User not in an organization' },
        { status: 403 }
      );
    }

    // Check if user is owner
    if (profile.role !== 'owner') {
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

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (existingUser?.user) {
      // User exists, check if they're already in this organization
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', existingUser.user.id)
        .single();

      if (existingProfile?.organization_id === profile.organization_id) {
        return NextResponse.json(
          { error: 'El usuario ya existe en esta organización' },
          { status: 400 }
        );
      }

      // User exists but not in this org - add them to the organization
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: existingUser.user.id,
          organization_id: profile.organization_id,
          role: 'member',
          full_name: name,
        });

      if (profileError) {
        throw new Error(`Error al agregar usuario: ${profileError.message}`);
      }

      return NextResponse.json({
        userId: existingUser.user.id,
        email,
        message: 'Usuario agregado a la organización',
      });
    }

    // Create new user without password
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: name,
      },
    });

    if (createError || !newUser.user) {
      throw new Error(`Error al crear usuario: ${createError?.message || 'Error desconocido'}`);
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        organization_id: profile.organization_id,
        role: 'member',
        full_name: name,
      });

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Error al crear perfil: ${profileError.message}`);
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
