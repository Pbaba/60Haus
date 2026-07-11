-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 7
-- SCHEMA: public.saved_properties, public.recently_viewed & profiles preferences
-- ==========================================

-- 1. Create Saved Properties Table referencing auth.users(id)
create table if not exists public.saved_properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, property_id)
);

-- 2. Create Recently Viewed Table referencing auth.users(id)
create table if not exists public.recently_viewed (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  viewed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, property_id)
);

-- 3. Enable Row Level Security (RLS)
alter table public.saved_properties enable row level security;
alter table public.recently_viewed enable row level security;

-- 4. Setup RLS Security Policies
create policy "Users can manage their own saved properties" on public.saved_properties
  for all using (auth.uid() = user_id);

create policy "Users can manage their own viewed history" on public.recently_viewed
  for all using (auth.uid() = user_id);

-- 5. Extend profiles table with preference columns
alter table public.profiles add column if not exists preferred_city text;
alter table public.profiles add column if not exists preferred_listing_type text check (preferred_listing_type in ('rent', 'buy'));
alter table public.profiles add column if not exists preferred_budget integer;

-- 6. Setup Indexes for query performance optimizations
create index if not exists idx_saved_properties_user on public.saved_properties(user_id);
create index if not exists idx_recently_viewed_user on public.recently_viewed(user_id);
