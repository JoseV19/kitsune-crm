-- Migrate existing user_profiles organization relationships to memberships
insert into public.user_organization_memberships (user_id, organization_id, role, is_active)
select id, organization_id, role, true
from public.user_profiles
where organization_id is not null
on conflict (user_id, organization_id) do nothing;
