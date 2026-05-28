-- ============================================================================
-- Flag profile.onboarded_at pour le tutoriel
-- ============================================================================

alter table public.profiles
  add column if not exists onboarded_at timestamptz;
