-- 002_profiles.sql (FIXED)
-- User profiles extending Supabase auth.users
-- FIX: Removed duplicate/conflicting SELECT policies.
--   - profiles_select_own: was too restrictive (blocked PIC from seeing reporter name)
--   - profiles_select_authenticated: all authenticated users can see all profiles
--     (needed for case list to show reporter names, assignee names, etc.)
--   Only one SELECT policy remains.

CREATE TABLE public.profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text NOT NULL,
  employee_id    text UNIQUE,
  phone          text,
  avatar_url     text,
  is_active      boolean NOT NULL DEFAULT true,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at (used across many tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: all authenticated users can read all profiles
-- (needed to display reporter/assignee names in case lists)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users may only update their own profile
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No direct INSERT (handle_new_user trigger handles it)
-- No direct DELETE (cascade from auth.users)
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (false);
CREATE POLICY profiles_delete ON public.profiles FOR DELETE USING (false);
