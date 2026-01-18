-- Clerk Integration Migration
-- 1. Update Schema to use TEXT for user_id (Clerk IDs are strings)
-- 2. Update RLS policies to use auth.jwt()->>'sub' instead of auth.uid()

-- ============================================
-- 1. Schema Updates
-- ============================================

-- Update user_organization_memberships table
ALTER TABLE public.user_organization_memberships 
  ALTER COLUMN user_id TYPE text;

-- Remove foreign key constraint to auth.users (no longer exists in this context)
ALTER TABLE public.user_organization_memberships 
  DROP CONSTRAINT IF EXISTS user_organization_memberships_user_id_fkey;

-- Update user_profiles table
ALTER TABLE public.user_profiles 
  ALTER COLUMN id TYPE text;

-- Remove foreign key constraint to auth.users
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- ============================================
-- 2. RLS Policy Updates
-- ============================================

-- client_activities
DROP POLICY IF EXISTS "Users can read activities in their organization" ON public.client_activities;
DROP POLICY IF EXISTS "Users can insert activities in their organization" ON public.client_activities;

CREATE POLICY "Users can read activities in their organization" ON public.client_activities
  FOR SELECT
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can insert activities in their organization" ON public.client_activities
  FOR INSERT
  TO public
  WITH CHECK (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

-- clients
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Users can read clients in their organization" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients in their organization" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON public.clients;

CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
        AND user_organization_memberships.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can read clients in their organization" ON public.clients
  FOR SELECT
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can insert clients in their organization" ON public.clients
  FOR INSERT
  TO public
  WITH CHECK (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can update clients in their organization" ON public.clients
  FOR UPDATE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

-- contacts
DROP POLICY IF EXISTS "Users can update contacts in their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can read contacts in their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their organization" ON public.contacts;

CREATE POLICY "Users can update contacts in their organization" ON public.contacts
  FOR UPDATE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can read contacts in their organization" ON public.contacts
  FOR SELECT
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can insert contacts in their organization" ON public.contacts
  FOR INSERT
  TO public
  WITH CHECK (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can delete contacts in their organization" ON public.contacts
  FOR DELETE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

-- deal_items
DROP POLICY IF EXISTS "Users can delete deal items in their organization" ON public.deal_items;
DROP POLICY IF EXISTS "Users can insert deal items in their organization" ON public.deal_items;
DROP POLICY IF EXISTS "Users can read deal items in their organization" ON public.deal_items;
DROP POLICY IF EXISTS "Users can update deal items in their organization" ON public.deal_items;

CREATE POLICY "Users can delete deal items in their organization" ON public.deal_items
  FOR DELETE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can insert deal items in their organization" ON public.deal_items
  FOR INSERT
  TO public
  WITH CHECK (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can read deal items in their organization" ON public.deal_items
  FOR SELECT
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can update deal items in their organization" ON public.deal_items
  FOR UPDATE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

-- deals
DROP POLICY IF EXISTS "Admins can delete deals" ON public.deals;
DROP POLICY IF EXISTS "Users can read deals in their organization" ON public.deals;
DROP POLICY IF EXISTS "Users can insert deals in their organization" ON public.deals;
DROP POLICY IF EXISTS "Users can update deals in their organization" ON public.deals;

CREATE POLICY "Admins can delete deals" ON public.deals
  FOR DELETE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
        AND user_organization_memberships.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can read deals in their organization" ON public.deals
  FOR SELECT
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can insert deals in their organization" ON public.deals
  FOR INSERT
  TO public
  WITH CHECK (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can update deals in their organization" ON public.deals
  FOR UPDATE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

-- organization_settings
DROP POLICY IF EXISTS "Admins can manage organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can read settings in their organization" ON public.organization_settings;

CREATE POLICY "Admins can manage organization settings" ON public.organization_settings
  FOR ALL
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
        AND user_organization_memberships.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
        AND user_organization_memberships.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can read settings in their organization" ON public.organization_settings
  FOR SELECT
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

-- organizations
DROP POLICY IF EXISTS "Owners can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can read their organization" ON public.organizations;

CREATE POLICY "Owners can update their organization" ON public.organizations
  FOR UPDATE
  TO public
  USING (
    id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
        AND user_organization_memberships.role = 'owner'
    )
  );

CREATE POLICY "Users can read their organization" ON public.organizations
  FOR SELECT
  TO public
  USING (
    id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

-- products
DROP POLICY IF EXISTS "Users can insert products in their organization" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Users can read products in their organization" ON public.products;
DROP POLICY IF EXISTS "Users can update products in their organization" ON public.products;

CREATE POLICY "Users can insert products in their organization" ON public.products
  FOR INSERT
  TO public
  WITH CHECK (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
        AND user_organization_memberships.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can read products in their organization" ON public.products
  FOR SELECT
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

CREATE POLICY "Users can update products in their organization" ON public.products
  FOR UPDATE
  TO public
  USING (
    organization_id IN (
      SELECT user_organization_memberships.organization_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships.is_active = true
    )
  );

-- user_organization_memberships
DROP POLICY IF EXISTS "Admins can insert memberships" ON public.user_organization_memberships;
DROP POLICY IF EXISTS "Users can read their own memberships" ON public.user_organization_memberships;
DROP POLICY IF EXISTS "Admins can update memberships in their organizations" ON public.user_organization_memberships;

CREATE POLICY "Admins can insert memberships" ON public.user_organization_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT user_organization_memberships_1.organization_id
      FROM user_organization_memberships user_organization_memberships_1
      WHERE user_organization_memberships_1.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships_1.is_active = true
        AND user_organization_memberships_1.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can read their own memberships" ON public.user_organization_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Admins can update memberships in their organizations" ON public.user_organization_memberships
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT user_organization_memberships_1.organization_id
      FROM user_organization_memberships user_organization_memberships_1
      WHERE user_organization_memberships_1.user_id = (auth.jwt()->>'sub')
        AND user_organization_memberships_1.is_active = true
        AND user_organization_memberships_1.role IN ('owner', 'admin')
    )
  );

-- user_profiles
DROP POLICY IF EXISTS "Users can read profiles in their organization" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

CREATE POLICY "Users can read profiles in their organization" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT user_organization_memberships.user_id
      FROM user_organization_memberships
      WHERE user_organization_memberships.organization_id IN (
        SELECT user_organization_memberships_1.organization_id
        FROM user_organization_memberships user_organization_memberships_1
        WHERE user_organization_memberships_1.user_id = (auth.jwt()->>'sub')
          AND user_organization_memberships_1.is_active = true
      )
    )
  );

CREATE POLICY "Admins can insert profiles" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (id = (auth.jwt()->>'sub')) OR (
      id IN (
        SELECT user_organization_memberships.user_id
        FROM user_organization_memberships
        WHERE user_organization_memberships.organization_id IN (
          SELECT user_organization_memberships_1.organization_id
          FROM user_organization_memberships user_organization_memberships_1
          WHERE user_organization_memberships_1.user_id = (auth.jwt()->>'sub')
            AND user_organization_memberships_1.role IN ('owner', 'admin')
            AND user_organization_memberships_1.is_active = true
        )
      )
    )
  );

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE
  TO public
  USING (id = (auth.jwt()->>'sub'));
