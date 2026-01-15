import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create regular client for auth verification
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for membership updates
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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

    const { data: requesterMembership } = await supabaseAdmin
      .from('user_organization_memberships')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('organization_id', organization.id)
      .single();

    if (!requesterMembership || !requesterMembership.is_active) {
      return NextResponse.json(
        { error: 'User not active in this organization' },
        { status: 403 }
      );
    }

    if (requesterMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can remove users' },
        { status: 403 }
      );
    }

    const { data: targetMembership } = await supabaseAdmin
      .from('user_organization_memberships')
      .select('id, role')
      .eq('user_id', userId)
      .eq('organization_id', organization.id)
      .single();

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en esta organización' },
        { status: 404 }
      );
    }

    if (targetMembership.role === 'owner') {
      return NextResponse.json(
        { error: 'No se puede eliminar al propietario de la organización' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('user_organization_memberships')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', targetMembership.id);

    if (error) {
      throw new Error(`Error al eliminar usuario: ${error.message}`);
    }

    return NextResponse.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error: any) {
    console.error('Error removing user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
