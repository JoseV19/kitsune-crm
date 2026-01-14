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

export interface UserProfile {
  id: string; // References auth.users(id)
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganizationRole = 'owner' | 'admin' | 'member';
