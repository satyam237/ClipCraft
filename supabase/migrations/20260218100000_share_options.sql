-- ============================================================================
-- Share options: allow_download, restricted visibility, video_invitees
-- ============================================================================

-- Add restricted to video_visibility enum
ALTER TYPE video_visibility ADD VALUE IF NOT EXISTS 'restricted';

-- Add allow_download to videos (default true for backward compatibility)
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS allow_download BOOLEAN NOT NULL DEFAULT true;

-- Table: invitees for restricted videos (by email)
CREATE TABLE IF NOT EXISTS public.video_invitees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(video_id, email)
);

CREATE INDEX IF NOT EXISTS idx_video_invitees_video ON public.video_invitees(video_id);
CREATE INDEX IF NOT EXISTS idx_video_invitees_email ON public.video_invitees(email);

-- RLS for video_invitees: only video owner or workspace admin can manage
ALTER TABLE public.video_invitees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Video owners can manage invitees"
  ON public.video_invitees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_invitees.video_id
        AND v.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_invitees.video_id
        AND v.owner_id = auth.uid()
    )
  );

-- Workspace admins can also manage invitees
CREATE POLICY "Workspace admins can manage invitees"
  ON public.video_invitees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_invitees.video_id
        AND public.user_is_workspace_admin(v.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_invitees.video_id
        AND public.user_is_workspace_admin(v.workspace_id)
    )
  );

-- Invitees can read their own rows (to check if they have access)
CREATE POLICY "Invitees can read own access"
  ON public.video_invitees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) = lower(video_invitees.email)
    )
  );

-- Update user_can_view_video to allow restricted when user is invitee or owner/workspace
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
        OR (
          v.visibility = 'restricted'
          AND EXISTS (
            SELECT 1 FROM public.video_invitees vi
            INNER JOIN auth.users u ON u.id = auth.uid() AND lower(u.email) = lower(vi.email)
            WHERE vi.video_id = video_uuid
          )
        )
      )
  );
$$;

-- Policy: restricted videos are not selectable by "Unlisted videos readable by anyone"
-- We have "Unlisted videos readable by anyone" with USING (visibility = 'unlisted').
-- So restricted is not included there. We need a policy that allows SELECT for restricted
-- when user is invitee/owner/workspace. The user_can_view_video already covers that,
-- but the video RLS policies are: workspace members, public, unlisted. So we need
-- a policy that allows SELECT when visibility = 'restricted' AND user_can_view_video.
CREATE POLICY "Restricted videos viewable by invitees and owner"
  ON public.videos FOR SELECT
  USING (
    visibility = 'restricted'
    AND public.user_can_view_video(id)
  );
