-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 5
-- SCHEMA: public.property_videos, analytics & soft deletes
-- ==========================================

-- 1. Create Normalized Property Videos Table
create table public.property_videos (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  video_url text not null,
  thumbnail_url text,
  duration_seconds integer,
  processing_status text default 'completed' check (processing_status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add Soft Delete and Analytics Columns to Properties
alter table public.properties add column if not null deleted_at timestamp with time zone;
alter table public.properties add column if not null view_count integer default 0;
alter table public.properties add column if not null save_count integer default 0;
alter table public.properties add column if not null contact_count integer default 0;

-- 3. Create Index on Property Videos
create index idx_videos_property on public.property_videos(property_id);

-- 4. Enable Row Level Security (RLS) on Videos
alter table public.property_videos enable row level security;

-- 5. Setup Property Videos Table Security Policies
create policy "Videos of published properties are viewable by everyone" on public.property_videos
  for select using (
    exists (
      select 1 from public.properties 
      where id = property_id and status = 'published' and deleted_at is null
    )
  );

create policy "Owners can manage videos of their own listings" on public.property_videos
  for all using (
    exists (
      select 1 from public.properties 
      where id = property_id and owner_id = auth.uid()
    )
  );
