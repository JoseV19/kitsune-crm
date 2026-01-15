import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createOrganizationSchema } from '@/lib/validations/organization.schema';

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
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body - could be JSON or FormData
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let logoFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        name: formData.get('name') as string,
        slug: formData.get('slug') as string,
        logo_background_color: formData.get('logo_background_color') as string || 'white',
      };
      const file = formData.get('logo') as File | null;
      if (file && file.size > 0) {
        logoFile = file;
      }
    } else {
      body = await request.json();
    }
    
    // Validate input
    const validatedData = createOrganizationSchema.parse(body);

    // Check slug availability
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', validatedData.slug)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Ese nombre de empresa ya está en uso. Por favor, elige otro.' },
        { status: 400 }
      );
    }

    // Create organization using admin client (bypasses RLS)
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: validatedData.name,
        slug: validatedData.slug,
        logo_url: validatedData.logo_url || null,
        logo_background_color: validatedData.logo_background_color || 'white',
      })
      .select()
      .single();

    if (orgError) {
      throw new Error(`Error al crear organización: ${orgError.message}`);
    }

    // Ensure user profile exists (not scoped to an organization)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      });

    if (profileError) {
      await supabaseAdmin.from('organizations').delete().eq('id', organization.id);
      throw new Error(`Error al vincular usuario: ${profileError.message}`);
    }

    // Create membership linking user to organization as owner
    const { error: membershipError } = await supabaseAdmin
      .from('user_organization_memberships')
      .insert({
        user_id: user.id,
        organization_id: organization.id,
        role: 'owner',
        is_active: true,
      });

    if (membershipError) {
      await supabaseAdmin.from('organizations').delete().eq('id', organization.id);
      throw new Error(`Error al vincular usuario: ${membershipError.message}`);
    }

    // Upload logo if provided
    // Note: organization-logos bucket should have RLS disabled (public bucket)
    let logoUrl: string | null = null;
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${organization.id}/logo.${fileExt}`;
      
      // Convert File to ArrayBuffer for upload
      const arrayBuffer = await logoFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('organization-logos')
        .upload(fileName, uint8Array, {
          contentType: logoFile.type || `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        // Don't fail the whole request if logo upload fails
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('organization-logos')
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;

        // Update organization with logo URL
        const { error: updateError } = await supabaseAdmin
          .from('organizations')
          .update({ logo_url: logoUrl })
          .eq('id', organization.id);

        if (updateError) {
          console.error('Error updating organization with logo URL:', updateError);
        } else {
          // Update the organization object to return
          organization.logo_url = logoUrl;
        }
      }
    }

    return NextResponse.json({
      organization,
      message: 'Organización creada exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating organization:', error);
    
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Error de validación' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error al crear organización' },
      { status: 500 }
    );
  }
}
