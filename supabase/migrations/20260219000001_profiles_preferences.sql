-- Add preferences JSONB to profiles for user settings (meeting recordings, notifications, quick record, etc.)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN public.profiles.preferences IS 'User preferences: meeting recordings default workspace/folder, push/email notifications, quick record defaults, etc.';
