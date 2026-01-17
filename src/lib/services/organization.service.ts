"use server";

import { Organization, UserOrganizationMembership } from '@/types/organization';
import { generateSlug, isValidSlug } from '@/lib/utils/slug-generator';
import { createClient } from './supabase/server';

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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

  // Ensure user profile exists (profile is not scoped to a single organization)
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
    });

  if (profileError) {
    await supabase.from('organizations').delete().eq('id', organization.id);
    throw new Error(`Error al vincular usuario: ${profileError.message}`);
  }

  // Create membership linking user to organization as owner
  const { error: membershipError } = await supabase
    .from('user_organization_memberships')
    .insert({
      user_id: userId,
      organization_id: organization.id,
      role: 'owner',
      is_active: true,
    });

  if (membershipError) {
    await supabase.from('organizations').delete().eq('id', organization.id);
    throw new Error(`Error al vincular usuario: ${membershipError.message}`);
  }

  return organization;
}

export async function getUserOrganizations(userId: string): Promise<UserOrganizationMembership[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_organization_memberships')
    .select('id, user_id, organization_id, role, is_active, created_at, updated_at, organization:organizations(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Error al obtener organizaciones: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Transform data to ensure type safety - organization should be a single object, not an array
  return data.map((membership: any) => ({
    id: membership.id,
    user_id: membership.user_id,
    organization_id: membership.organization_id,
    role: membership.role,
    is_active: membership.is_active,
    created_at: membership.created_at,
    updated_at: membership.updated_at,
    organization: Array.isArray(membership.organization) 
      ? (membership.organization[0] as Organization | null)
      : (membership.organization as Organization | null),
  }));
}

export async function getActiveUserOrganizations(userId: string): Promise<UserOrganizationMembership[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_organization_memberships')
    .select('id, user_id, organization_id, role, is_active, created_at, updated_at, organization:organizations(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Error al obtener organizaciones activas: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Transform data to ensure type safety - organization should be a single object, not an array
  return data.map((membership: any) => ({
    id: membership.id,
    user_id: membership.user_id,
    organization_id: membership.organization_id,
    role: membership.role,
    is_active: membership.is_active,
    created_at: membership.created_at,
    updated_at: membership.updated_at,
    organization: Array.isArray(membership.organization) 
      ? (membership.organization[0] as Organization | null)
      : (membership.organization as Organization | null),
  }));
}

export async function switchUserOrganization(
  userId: string,
  organizationId: string
): Promise<UserOrganizationMembership | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_organization_memberships')
    .select('id, user_id, organization_id, role, is_active, created_at, updated_at, organization:organizations(*)')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    return null;
  }

  // Transform data to ensure type safety - organization should be a single object, not an array
  return {
    id: data.id,
    user_id: data.user_id,
    organization_id: data.organization_id,
    role: data.role,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
    organization: Array.isArray(data.organization) 
      ? (data.organization[0] as Organization | null)
      : (data.organization as Organization | null),
  };
}

export async function updateMembershipStatus(
  userId: string,
  organizationId: string,
  isActive: boolean
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_organization_memberships')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Error al actualizar estado: ${error.message}`);
  }
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const supabase = await createClient();

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
  const supabase = await createClient();

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

  const supabase = await createClient();

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
