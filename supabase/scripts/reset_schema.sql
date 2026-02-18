-- ============================================================================
-- RESET SCHEMA (run manually when you need to wipe and reapply migrations)
-- ============================================================================
-- Run this in Supabase Dashboard > SQL Editor when you want to drop
-- all ClipCraft tables and objects. Then run: supabase db push
--
-- If the remote already had migrations applied, you may need to clear
-- migration history: Dashboard > Project Settings > Database, or run
-- the migration repair flow so the next push applies cleanly.
-- ============================================================================

-- Share-options objects (from share_options migration)
DROP POLICY IF EXISTS "Restricted videos viewable by invitees and owner" ON public.videos;
DROP TABLE IF EXISTS public.video_invitees CASCADE;

-- Disable RLS on remaining tables
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.video_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.processing_jobs DISABLE ROW LEVEL SECURITY;

-- Drop all policies (match initial_schema + share_options only)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners can view own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view accessible workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can insert workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can delete workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view folders" ON public.folders;
DROP POLICY IF EXISTS "Members can create folders" ON public.folders;
DROP POLICY IF EXISTS "Members can update folders" ON public.folders;
DROP POLICY IF EXISTS "Members can delete folders" ON public.folders;
DROP POLICY IF EXISTS "Workspace members can view videos" ON public.videos;
DROP POLICY IF EXISTS "Public videos readable by anyone" ON public.videos;
DROP POLICY IF EXISTS "Unlisted videos readable by anyone" ON public.videos;
DROP POLICY IF EXISTS "Members can create videos" ON public.videos;
DROP POLICY IF EXISTS "Owners can update videos" ON public.videos;
DROP POLICY IF EXISTS "Owners can delete videos" ON public.videos;
DROP POLICY IF EXISTS "View video assets if can view video" ON public.video_assets;
DROP POLICY IF EXISTS "Owners can insert video assets" ON public.video_assets;
DROP POLICY IF EXISTS "Owners can update video assets" ON public.video_assets;
DROP POLICY IF EXISTS "Owners can delete video assets" ON public.video_assets;
DROP POLICY IF EXISTS "View comments if can view video" ON public.comments;
DROP POLICY IF EXISTS "Auth users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "View reactions if can view video" ON public.reactions;
DROP POLICY IF EXISTS "Auth users can insert reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.reactions;
DROP POLICY IF EXISTS "Insert analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Video owners can read analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Workspace members can view jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Insert processing jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Update processing jobs" ON public.processing_jobs;

-- Drop storage policies (before dropping storage functions)
DROP POLICY IF EXISTS "Users can upload to own workspace recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own workspace recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can read workspace recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public read recordings for public videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own workspace recordings" ON storage.objects;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_workspace();
DROP FUNCTION IF EXISTS public.user_is_workspace_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.user_can_access_workspace(UUID);
DROP FUNCTION IF EXISTS public.user_can_view_video(UUID);
DROP FUNCTION IF EXISTS public.user_is_workspace_admin(UUID);
DROP FUNCTION IF EXISTS public.user_can_access_storage_path(TEXT);

-- Drop tables (reverse dependency order)
DROP TABLE IF EXISTS public.processing_jobs CASCADE;
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.reactions CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.video_assets CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.folders CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop types
DROP TYPE IF EXISTS processing_job_status CASCADE;
DROP TYPE IF EXISTS processing_job_type CASCADE;
DROP TYPE IF EXISTS analytics_event_type CASCADE;
DROP TYPE IF EXISTS video_asset_type CASCADE;
DROP TYPE IF EXISTS video_visibility CASCADE;
DROP TYPE IF EXISTS video_status CASCADE;
DROP TYPE IF EXISTS workspace_role CASCADE;
