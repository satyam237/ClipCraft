-- ============================================================================
-- ClipCraft Initial Database Schema
-- ============================================================================
-- This migration creates all tables, types, functions, triggers, and RLS
-- policies for the ClipCraft application. It uses SECURITY DEFINER functions
-- to avoid RLS recursion issues.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE video_status AS ENUM ('uploading', 'processing', 'ready', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE video_visibility AS ENUM ('public', 'unlisted', 'workspace', 'password');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE video_asset_type AS ENUM (
    'raw_webm', 'mp4', 'hls', 'thumbnail', 'srt', 'vtt',
    'transcript_json', 'summary_md', 'chapters_json', 'highlights_mp4'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE analytics_event_type AS ENUM ('view', 'play', 'pause', 'seek', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE processing_job_type AS ENUM ('transcode', 'transcribe', 'thumbnail');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE processing_job_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Workspace members
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Folders
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Videos
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT,
  status video_status NOT NULL DEFAULT 'uploading',
  duration NUMERIC(10,2),
  visibility video_visibility NOT NULL DEFAULT 'unlisted',
  password_hash TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Video assets
CREATE TABLE public.video_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  asset_type video_asset_type NOT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp_ms BIGINT,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reactions
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  timestamp_ms BIGINT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Analytics events
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type analytics_event_type NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Processing jobs
CREATE TABLE public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  job_type processing_job_type NOT NULL,
  status processing_job_status NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_folders_workspace ON public.folders(workspace_id);
CREATE INDEX idx_folders_parent ON public.folders(parent_folder_id);
CREATE INDEX idx_videos_workspace ON public.videos(workspace_id);
CREATE INDEX idx_videos_owner ON public.videos(owner_id);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_folder ON public.videos(folder_id);
CREATE INDEX idx_video_assets_video ON public.video_assets(video_id);
CREATE INDEX idx_comments_video ON public.comments(video_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);
CREATE INDEX idx_reactions_video ON public.reactions(video_id);
CREATE INDEX idx_analytics_video ON public.analytics_events(video_id);
CREATE INDEX idx_analytics_created ON public.analytics_events(created_at);
CREATE INDEX idx_processing_jobs_video ON public.processing_jobs(video_id);

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================

-- Check if a user is a member of a workspace
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = user_uuid
  );
$$;

-- Check if a user can access a workspace (owner OR member)
CREATE OR REPLACE FUNCTION public.user_can_access_workspace(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_uuid
      AND (w.owner_id = auth.uid() OR public.user_is_workspace_member(workspace_uuid, auth.uid()))
  );
$$;

-- Check if a user can view a video
CREATE OR REPLACE FUNCTION public.user_can_view_video(video_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_uuid
      AND (
        v.visibility IN ('public', 'unlisted')
        OR v.owner_id = auth.uid()
        OR public.user_can_access_workspace(v.workspace_id)
      )
  );
$$;

-- Check if a user is workspace owner or admin
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_uuid AND w.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_uuid
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  );
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add owner to workspace_members when workspace is created
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - PROFILES
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- RLS POLICIES - WORKSPACES
-- ============================================================================

-- Owners can always view their workspaces
CREATE POLICY "Owners can view own workspaces"
  ON public.workspaces FOR SELECT
  USING (owner_id = auth.uid());

-- Members can view workspaces they belong to (via helper function)
CREATE POLICY "Members can view accessible workspaces"
  ON public.workspaces FOR SELECT
  USING (public.user_can_access_workspace(id));

-- Users can create workspaces
CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can update workspaces
CREATE POLICY "Owners can update workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - WORKSPACE MEMBERS
-- ============================================================================

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON public.workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Users can view members of workspaces they belong to
CREATE POLICY "Users can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.user_can_access_workspace(workspace_id));

-- Admins/Owners can insert members (trigger handles owner insertion)
CREATE POLICY "Admins can insert workspace members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (public.user_is_workspace_admin(workspace_id));

-- Admins/Owners can update members
CREATE POLICY "Admins can update workspace members"
  ON public.workspace_members FOR UPDATE
  USING (public.user_is_workspace_admin(workspace_id));

-- Admins/Owners can delete members
CREATE POLICY "Admins can delete workspace members"
  ON public.workspace_members FOR DELETE
  USING (public.user_is_workspace_admin(workspace_id));

-- ============================================================================
-- RLS POLICIES - FOLDERS
-- ============================================================================

CREATE POLICY "Members can view folders"
  ON public.folders FOR SELECT
  USING (public.user_can_access_workspace(workspace_id));

CREATE POLICY "Members can create folders"
  ON public.folders FOR INSERT
  WITH CHECK (public.user_can_access_workspace(workspace_id));

CREATE POLICY "Members can update folders"
  ON public.folders FOR UPDATE
  USING (public.user_can_access_workspace(workspace_id));

CREATE POLICY "Members can delete folders"
  ON public.folders FOR DELETE
  USING (public.user_can_access_workspace(workspace_id));

-- ============================================================================
-- RLS POLICIES - VIDEOS
-- ============================================================================

-- Workspace members can view videos
CREATE POLICY "Workspace members can view videos"
  ON public.videos FOR SELECT
  USING (public.user_can_access_workspace(workspace_id));

-- Public videos readable by anyone
CREATE POLICY "Public videos readable by anyone"
  ON public.videos FOR SELECT
  USING (visibility = 'public');

-- Unlisted videos readable by anyone
CREATE POLICY "Unlisted videos readable by anyone"
  ON public.videos FOR SELECT
  USING (visibility = 'unlisted');

-- Members can create videos (must be owner of the video)
CREATE POLICY "Members can create videos"
  ON public.videos FOR INSERT
  WITH CHECK (
    public.user_can_access_workspace(workspace_id)
    AND owner_id = auth.uid()
  );

-- Owners can update videos
CREATE POLICY "Owners can update videos"
  ON public.videos FOR UPDATE
  USING (owner_id = auth.uid());

-- Owners can delete videos
CREATE POLICY "Owners can delete videos"
  ON public.videos FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - VIDEO ASSETS
-- ============================================================================

-- View assets if can view video
CREATE POLICY "View video assets if can view video"
  ON public.video_assets FOR SELECT
  USING (public.user_can_view_video(video_id));

-- Insert assets if owner of video
CREATE POLICY "Owners can insert video assets"
  ON public.video_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_assets.video_id
        AND v.owner_id = auth.uid()
    )
  );

-- Update/delete assets if owner of video
CREATE POLICY "Owners can update video assets"
  ON public.video_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_assets.video_id
        AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete video assets"
  ON public.video_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_assets.video_id
        AND v.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - COMMENTS
-- ============================================================================

CREATE POLICY "View comments if can view video"
  ON public.comments FOR SELECT
  USING (public.user_can_view_video(video_id));

CREATE POLICY "Auth users can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_view_video(video_id)
  );

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - REACTIONS
-- ============================================================================

CREATE POLICY "View reactions if can view video"
  ON public.reactions FOR SELECT
  USING (public.user_can_view_video(video_id));

CREATE POLICY "Auth users can insert reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_view_video(video_id)
  );

CREATE POLICY "Users can delete own reactions"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - ANALYTICS EVENTS
-- ============================================================================

-- Anyone can insert analytics (for tracking)
CREATE POLICY "Insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Video owners can read analytics
CREATE POLICY "Video owners can read analytics"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = analytics_events.video_id
        AND v.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - PROCESSING JOBS
-- ============================================================================

-- Workspace members can view jobs
CREATE POLICY "Workspace members can view jobs"
  ON public.processing_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = processing_jobs.video_id
        AND public.user_can_access_workspace(v.workspace_id)
    )
  );

-- Anyone can insert jobs (backend service)
CREATE POLICY "Insert processing jobs"
  ON public.processing_jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = processing_jobs.video_id
    )
  );

-- Backend can update jobs (service role)
CREATE POLICY "Update processing jobs"
  ON public.processing_jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = processing_jobs.video_id
    )
  );

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Create recordings bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Helper function to check workspace access for storage paths
CREATE OR REPLACE FUNCTION public.user_can_access_storage_path(path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id::text = (string_to_array(path, '/'))[1]
      AND (w.owner_id = auth.uid() OR public.user_is_workspace_member(w.id, auth.uid()))
  );
$$;

-- Upload to workspace recordings
CREATE POLICY "Users can upload to own workspace recordings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recordings'
    AND public.user_can_access_storage_path(name)
  );

-- Update recordings (for upsert operations)
CREATE POLICY "Users can update own workspace recordings"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND public.user_can_access_storage_path(name)
  )
  WITH CHECK (
    bucket_id = 'recordings'
    AND public.user_can_access_storage_path(name)
  );

-- Read workspace recordings
CREATE POLICY "Users can read workspace recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND public.user_can_access_storage_path(name)
  );

-- Public read for public/unlisted videos
CREATE POLICY "Public read recordings for public videos"
  ON storage.objects FOR SELECT
  TO anon
  USING (
    bucket_id = 'recordings'
    AND EXISTS (
      SELECT 1 FROM public.video_assets va
      JOIN public.videos v ON v.id = va.video_id
      WHERE va.storage_path = name
        AND v.visibility IN ('public', 'unlisted')
    )
  );

-- Delete recordings
CREATE POLICY "Users can delete own workspace recordings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND public.user_can_access_storage_path(name)
  );
