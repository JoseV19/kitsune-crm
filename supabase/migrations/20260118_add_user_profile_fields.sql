-- Add code_name and display_role columns to user_profiles table
-- These fields allow users to set a custom display name (code name) and role label

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS code_name text,
  ADD COLUMN IF NOT EXISTS display_role text;

-- Add comment to explain the fields
COMMENT ON COLUMN public.user_profiles.code_name IS 'Custom display name (Nombre en Clave) set by the user';
COMMENT ON COLUMN public.user_profiles.display_role IS 'Custom role label (Rango/Rol) set by the user, separate from organization membership role';
