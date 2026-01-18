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
 * Create a new user in the organization
 * Creates auth user without password and user_profile with role 'member'
 */
export async function createUser(data: CreateUserData, token: string): Promise<{ userId: string; email: string }> {
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
export async function getOrganizationUsers(token: string): Promise<OrganizationUser[]> {
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
export async function removeUserFromOrganization(userId: string, token: string): Promise<void> {
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
