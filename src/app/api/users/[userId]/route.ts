import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create regular client for RLS queries
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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
        { error: 'Only organization owners can remove users' },
        { status: 403 }
      );
    }

    // Verify user is in this organization
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en esta organización' },
        { status: 404 }
      );
    }

    // Prevent removing the owner
    if (targetProfile.role === 'owner') {
      return NextResponse.json(
        { error: 'No se puede eliminar al propietario de la organización' },
        { status: 400 }
      );
    }

    // Remove user from organization (delete user_profile)
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)
      .eq('organization_id', profile.organization_id);

    if (error) {
      throw new Error(`Error al eliminar usuario: ${error.message}`);
    }

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error removing user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
