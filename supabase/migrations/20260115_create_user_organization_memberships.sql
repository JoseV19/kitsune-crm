-- Create user_organization_memberships table for multi-organization support
create table if not exists public.user_organization_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create index if not exists idx_user_org_memberships_user_id
  on public.user_organization_memberships(user_id);

create index if not exists idx_user_org_memberships_org_id
  on public.user_organization_memberships(organization_id);

create index if not exists idx_user_org_memberships_active
  on public.user_organization_memberships(user_id, is_active)
  where is_active = true;
