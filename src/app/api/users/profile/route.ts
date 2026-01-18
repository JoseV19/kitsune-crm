import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/services/supabase/server';
import { profileSchema } from '@/lib/validations/user.schema';

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = profileSchema.parse(body);

    const supabase = await createClient();

    // Update user profile - users can only update their own profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name: validatedData.full_name ?? undefined,
        code_name: validatedData.code_name ?? undefined,
        display_role: validatedData.display_role ?? undefined,
        avatar_url: validatedData.avatar_url ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: error.message || 'Error al actualizar el perfil' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as Error & { errors?: unknown };
      return NextResponse.json(
        { error: 'Datos inválidos', details: zodError.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, code_name, display_role, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener el perfil' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
