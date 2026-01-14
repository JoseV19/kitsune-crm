import { supabase } from './supabase/client';
import { Organization } from '@/types/organization';
import { generateSlug, isValidSlug } from '@/lib/utils/slug-generator';

export interface CreateOrganizationData {
  name: string;
  slug?: string;
  logo_url?: string | null;
  logo_background_color?: 'white' | 'black';
}

export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
  logo_url?: string | null;
  logo_background_color?: 'white' | 'black';
  domain?: string | null;
}

/**
 * Check if a slug is available (not taken by another organization)
 */
export async function checkSlugAvailability(slug: string): Promise<boolean> {
  if (!isValidSlug(slug)) {
    return false;
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single();

  // If error and it's a "not found" error, slug is available
  if (error && error.code === 'PGRST116') {
    return true;
  }

  // If data exists, slug is taken
  return !data;
}

/**
 * Create a new organization
 */
export async function createOrganization(
  data: CreateOrganizationData,
  userId: string
): Promise<Organization> {
  const slug = data.slug || generateSlug(data.name);
  
  // Ensure slug is available
  const isAvailable = await checkSlugAvailability(slug);
  if (!isAvailable) {
    throw new Error('El slug ya está en uso. Por favor, elige otro.');
  }

  // Create organization
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.name,
      slug,
      logo_url: data.logo_url,
      logo_background_color: data.logo_background_color || 'white',
    })
    .select()
    .single();

  if (orgError) {
    throw new Error(`Error al crear organización: ${orgError.message}`);
  }

  // Create user profile linking user to organization as owner
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      organization_id: organization.id,
      role: 'owner',
    });

  if (profileError) {
    // Rollback: delete organization if profile creation fails
    await supabase.from('organizations').delete().eq('id', organization.id);
    throw new Error(`Error al vincular usuario: ${profileError.message}`);
  }

  return organization;
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(id: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Update organization
 */
export async function updateOrganization(
  id: string,
  data: UpdateOrganizationData
): Promise<Organization> {
  // If slug is being updated, check availability
  if (data.slug) {
    const isAvailable = await checkSlugAvailability(data.slug);
    if (!isAvailable) {
      throw new Error('El slug ya está en uso. Por favor, elige otro.');
    }
  }

  const { data: organization, error } = await supabase
    .from('organizations')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar organización: ${error.message}`);
  }

  return organization;
}
