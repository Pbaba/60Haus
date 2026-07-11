-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 5
-- SCHEMA: public.property_videos, analytics & soft deletes
-- ==========================================

-- 1. Create Normalized Property Videos Table
CREATE TABLE IF NOT EXISTS public.property_videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  processing_status text DEFAULT 'completed'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamp with time zone
    DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add Soft Delete and Analytics Columns to Properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS save_count integer DEFAULT 0;

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS contact_count integer DEFAULT 0;

-- 3. Create Index on Property Videos
CREATE INDEX IF NOT EXISTS idx_videos_property
ON public.property_videos(property_id);

-- 4. Enable Row Level Security (RLS) on Videos
ALTER TABLE public.property_videos ENABLE ROW LEVEL SECURITY;

-- 5. Setup Property Videos Table Security Policies

CREATE POLICY "Videos of published properties are viewable by everyone"
ON public.property_videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = property_id
      AND status = 'published'
      AND deleted_at IS NULL
  )
);

CREATE POLICY "Owners can manage videos of their own listings"
ON public.property_videos
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = property_id
      AND owner_id = auth.uid()
  )
);