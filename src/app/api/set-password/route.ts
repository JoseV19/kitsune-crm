import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// Create regular client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userData.user;

    // Check if user already has a password
    if (user.encrypted_password) {
      return NextResponse.json(
        { error: 'El usuario ya tiene una contraseña establecida' },
        { status: 400 }
      );
    }

    // Check if user has at least one organization membership
    const { data: memberships } = await supabaseAdmin
      .from('user_organization_memberships')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no tiene una organización asignada' },
        { status: 400 }
      );
    }

    // Set password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
    });

    if (updateError) {
      throw new Error(`Error al establecer contraseña: ${updateError.message}`);
    }

    return NextResponse.json({
      message: 'Contraseña establecida exitosamente',
      userId: user.id,
    });
  } catch (error: any) {
    console.error('Error setting password:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
