import { supabase } from './supabase/client';
import { UserProfile } from '@/types/organization';

export interface CreateUserData {
  name: string;
  email: string;
}

export interface OrganizationUser extends UserProfile {
  email?: string;
  has_password?: boolean;
  is_active?: boolean;
}

/**
 * Get auth token for API requests
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No autenticado');
  }
  return session.access_token;
}

/**
 * Create a new user in the organization
 * Creates auth user without password and user_profile with role 'member'
 */
export async function createUser(data: CreateUserData): Promise<{ userId: string; email: string }> {
  const token = await getAuthToken();

  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: data.name,
      email: data.email,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear usuario');
  }

  const result = await response.json();
  return { userId: result.userId, email: result.email };
}

/**
 * Get all users in an organization
 */
export async function getOrganizationUsers(): Promise<OrganizationUser[]> {
  const token = await getAuthToken();

  const response = await fetch('/api/users', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener usuarios');
  }

  const result = await response.json();
  return result.users || [];
}

/**
 * Remove a user from an organization
 * This deletes the user_profile, not the auth user
 */
export async function removeUserFromOrganization(userId: string): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar usuario');
  }
}

/**
 * Get current user's role in their organization
 */
export async function getCurrentUserRole(): Promise<'owner' | 'admin' | 'member' | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const host = window.location.host;
  const isLocalhost = host.includes('localhost');
  const parts = host.split('.');
  const subdomain = parts[0];

  if (isLocalhost && parts.length < 2) {
    return null;
  }

  if (!subdomain || subdomain === 'www' || subdomain === 'localhost') {
    return null;
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', subdomain)
    .single();

  if (!organization) {
    return null;
  }

  const { data: membership } = await supabase
    .from('user_organization_memberships')
    .select('role, is_active')
    .eq('user_id', user.id)
    .eq('organization_id', organization.id)
    .single();

  if (!membership?.is_active) {
    return null;
  }

  return membership.role as 'owner' | 'admin' | 'member';
}
