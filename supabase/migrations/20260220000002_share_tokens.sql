-- ============================================================================
-- Share tokens: tokenized links with restrictions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.share_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  max_views INT,
  current_views INT DEFAULT 0,
  require_password BOOLEAN DEFAULT false,
  allow_download BOOLEAN DEFAULT true,
  allowed_emails TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_video ON public.share_tokens(video_id);

ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

-- Owners can manage their share tokens
CREATE POLICY "Video owners can manage share tokens"
  ON public.share_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = share_tokens.video_id AND v.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = share_tokens.video_id AND v.owner_id = auth.uid()
    )
  );

-- Anyone can read tokens (needed for validation on watch page)
CREATE POLICY "Public can read share tokens for validation"
  ON public.share_tokens FOR SELECT
  USING (true);

-- Access logs for share tokens
CREATE TABLE IF NOT EXISTS public.video_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  share_token_id UUID REFERENCES public.share_tokens(id) ON DELETE SET NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_access_logs_video ON public.video_access_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_token ON public.video_access_logs(share_token_id);

ALTER TABLE public.video_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert access logs"
  ON public.video_access_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Video owners can read access logs"
  ON public.video_access_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_access_logs.video_id AND v.owner_id = auth.uid()
    )
  );

-- Function to validate a share token and increment views atomically
CREATE OR REPLACE FUNCTION public.validate_and_use_share_token(
  token_text TEXT,
  video_uuid UUID
)
RETURNS TABLE(valid BOOLEAN, reason TEXT, token_allow_download BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tok RECORD;
BEGIN
  SELECT * INTO tok FROM public.share_tokens st
  WHERE st.token = token_text AND st.video_id = video_uuid;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid or expired link'::TEXT, false;
    RETURN;
  END IF;

  IF tok.expires_at IS NOT NULL AND tok.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'This link has expired'::TEXT, false;
    RETURN;
  END IF;

  IF tok.max_views IS NOT NULL AND tok.current_views >= tok.max_views THEN
    RETURN QUERY SELECT false, 'This link has reached its maximum number of views'::TEXT, false;
    RETURN;
  END IF;

  UPDATE public.share_tokens
  SET current_views = current_views + 1, updated_at = NOW()
  WHERE id = tok.id;

  RETURN QUERY SELECT true, NULL::TEXT, tok.allow_download;
END;
$$;
