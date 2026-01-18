export interface Organization {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  logo_background_color?: 'white' | 'black';
  domain?: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganizationRole = 'owner' | 'admin' | 'member';

export interface UserProfile {
  id: string; // References auth.users(id)
  full_name?: string | null;
  code_name?: string | null; // Custom display name (Nombre en Clave)
  display_role?: string | null; // Custom role label (Rango/Rol)
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  organization_id?: string | null;
  role?: OrganizationRole | null;
}

export interface UserOrganizationMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization?: Organization | null;
  user?: UserProfile | null;
}
