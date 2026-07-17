-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 15
-- SCHEMA: collections, collection_properties, alert_subscriptions, saved_searches
-- ==========================================

-- 1. Create Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Collection Properties Table
CREATE TABLE IF NOT EXISTS public.collection_properties (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(collection_id, property_id)
);

-- 3. Alter Saved Searches Table
ALTER TABLE public.saved_searches 
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS is_pinned boolean default false not null;

-- 4. Create Alert Subscriptions Table
CREATE TABLE IF NOT EXISTS public.alert_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  search_id uuid references public.saved_searches(id) on delete cascade,
  alert_type text not null check (alert_type in ('new_matching_property', 'price_drop', 'verified_owner', 'listing_updated')),
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. Setup RLS Security Policies
-- Collections Policies
CREATE POLICY "Users can manage their own collections" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

-- Collection Properties Policies (Checked via parent collection ownership)
CREATE POLICY "Users can manage properties in their own collections" ON public.collection_properties
  FOR ALL USING (
    exists (
      select 1 from public.collections
      where id = collection_id and user_id = auth.uid()
    )
  );

-- Alert Subscriptions Policies
CREATE POLICY "Users can manage their own alert subscriptions" ON public.alert_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 7. Setup Database Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_collections_user ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_properties_collection ON public.collection_properties(collection_id);
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_user ON public.alert_subscriptions(user_id);
