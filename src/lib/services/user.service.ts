import { supabase } from './supabase/client';
import { UserProfile } from '@/types/organization';

export interface CreateUserData {
  name: string;
  email: string;
  organizationId: string;
}

export interface OrganizationUser extends UserProfile {
  email?: string;
  has_password?: boolean;
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
export async function getOrganizationUsers(organizationId: string): Promise<OrganizationUser[]> {
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
export async function removeUserFromOrganization(userId: string, organizationId: string): Promise<void> {
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
export async function getCurrentUserRole(): Promise<'owner' | 'member' | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return null;
  }

  return profile.role as 'owner' | 'member';
}
