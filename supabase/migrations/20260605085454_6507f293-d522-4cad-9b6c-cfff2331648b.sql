-- Add sub_admin role and staff helper
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sub_admin';
