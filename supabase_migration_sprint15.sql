-- =============================================================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 15 (DEADLOCK-SAFE REPAIR VERSION)
-- SCHEMA: collections, collection_properties, alert_subscriptions, saved_searches
-- =============================================================================

-- Wrap in a transaction block
BEGIN;

-- 1. Acquire locks on existing tables in a consistent order (alphabetical parent-first)
-- to prevent concurrent transactions from causing deadlocks during lock escalation.
LOCK TABLE public.profiles IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.properties IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.saved_searches IN ACCESS EXCLUSIVE MODE;

-- 2. Alter Saved Searches Table (Add Columns)
ALTER TABLE public.saved_searches 
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false NOT NULL;

-- 3. Create Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Collection Properties Table
CREATE TABLE IF NOT EXISTS public.collection_properties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(collection_id, property_id)
);

-- 5. Create Alert Subscriptions Table
CREATE TABLE IF NOT EXISTS public.alert_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  search_id uuid REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('new_matching_property', 'price_drop', 'verified_owner', 'listing_updated')),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. Setup RLS Security Policies (Idempotent via DROP IF EXISTS)
DROP POLICY IF EXISTS "Users can manage their own collections" ON public.collections;
CREATE POLICY "Users can manage their own collections" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage properties in their own collections" ON public.collection_properties;
CREATE POLICY "Users can manage properties in their own collections" ON public.collection_properties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their own alert subscriptions" ON public.alert_subscriptions;
CREATE POLICY "Users can manage their own alert subscriptions" ON public.alert_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 8. Setup Database Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_collections_user ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_properties_collection ON public.collection_properties(collection_id);
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_user ON public.alert_subscriptions(user_id);

COMMIT;
