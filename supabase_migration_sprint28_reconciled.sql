-- =============================================================================
-- SUPABASE CONSOLIDATED MIGRATION: SPRINT 28 (v1.0.0-beta.1 RECONCILED)
-- Target Project: 60Haus (fuhktkhnmhttnzrtkypp)
-- Description: Fully idempotent, production-ready schema reconciliation supporting
--              Phase 1-27 applications, vertical video discovery, messaging,
--              lead management, trust & verification, owner analytics, and beta telemetry.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS & UTILITIES
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2. CORE USERS & PROFILES MODULE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone_number TEXT,
  push_token TEXT,
  role TEXT DEFAULT 'hunter' NOT NULL CHECK (role IN ('hunter', 'owner', 'admin', 'beta')),
  contact_preference TEXT DEFAULT 'both' NOT NULL CHECK (contact_preference IN ('phone', 'whatsapp', 'both')),
  preferred_city TEXT,
  preferred_listing_type TEXT CHECK (preferred_listing_type IN ('rent', 'buy')),
  preferred_budget NUMERIC,
  verification_level TEXT DEFAULT 'unverified' CHECK (verification_level IN ('unverified', 'basic', 'verified', 'premium')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Trigger: Auto-provision profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    role,
    contact_preference
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    'hunter',
    'both'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger: Sync email confirmation from auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET verification_level = 'basic',
        updated_at = timezone('utc'::text, NOW())
    WHERE id = NEW.id
      AND (verification_level IS NULL OR verification_level = 'unverified');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_email_confirmed();

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_update_timestamp();

-- -----------------------------------------------------------------------------
-- 3. PROPERTIES ENGINE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  listing_type TEXT DEFAULT 'rent' CHECK (listing_type IN ('rent', 'buy')),
  city TEXT NOT NULL,
  locality TEXT,
  address TEXT,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  furnishing TEXT DEFAULT 'unfurnished' CHECK (furnishing IN ('unfurnished', 'semi-furnished', 'fully-furnished')),
  property_type TEXT DEFAULT 'apartment',
  amenities TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  video_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'published' NOT NULL,
  deleted_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0 NOT NULL,
  save_count INTEGER DEFAULT 0 NOT NULL,
  contact_count INTEGER DEFAULT 0 NOT NULL,
  
  -- Sale Metadata
  carpet_area NUMERIC,
  built_up_area NUMERIC,
  super_built_up_area NUMERIC,
  plot_area NUMERIC,
  property_age NUMERIC,
  possession_status TEXT CHECK (possession_status IN ('ready-to-move', 'under-construction')),
  ownership_type TEXT CHECK (ownership_type IN ('freehold', 'leasehold', 'co-operative', 'power-of-attorney')),
  property_age_confidence TEXT DEFAULT 'estimated' CHECK (property_age_confidence IN ('verified', 'estimated')),
  last_inspection_date DATE,
  last_inspection_confidence TEXT DEFAULT 'estimated' CHECK (last_inspection_confidence IN ('verified', 'estimated')),
  occupancy_status TEXT CHECK (occupancy_status IN ('vacant', 'occupied', 'tenant-occupied')),
  registration_availability BOOLEAN DEFAULT true,
  rera_number TEXT,
  rera_number_confidence TEXT DEFAULT 'estimated' CHECK (rera_number_confidence IN ('verified', 'estimated')),

  -- Rent Metadata
  security_deposit NUMERIC,
  monthly_maintenance NUMERIC,
  brokerage NUMERIC,
  lease_duration NUMERIC,
  available_from TEXT,
  preferred_tenant TEXT CHECK (preferred_tenant IN ('anyone', 'family', 'bachelors', 'company')),

  -- Location & Address Format
  state TEXT,
  postal_code TEXT,
  formatted_address TEXT,

  -- Verification Cadence
  last_verified_at TIMESTAMPTZ,
  verification_due_at TIMESTAMPTZ,
  next_verification_at TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'active' CHECK (verification_status IN ('active', 'awaiting_verification', 'grace_period', 'inactive_unverified')),
  verification_miss_count INTEGER DEFAULT 0,

  -- Integrity & Health Scores
  health_score NUMERIC DEFAULT 100,
  health_status TEXT DEFAULT 'good' CHECK (health_status IN ('excellent', 'good', 'needs_attention', 'poor')),
  health_breakdown JSONB DEFAULT '{}'::jsonb,
  last_integrity_check_at TIMESTAMPTZ,
  is_sponsored BOOLEAN DEFAULT false,
  priority_score NUMERIC DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_deleted ON public.properties(deleted_at);

DROP TRIGGER IF EXISTS on_property_updated ON public.properties;
CREATE TRIGGER on_property_updated
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE PROCEDURE public.handle_update_timestamp();

-- Property Gallery Images
CREATE TABLE IF NOT EXISTS public.property_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_property ON public.property_images(property_id);

-- Property Walkthrough Videos
CREATE TABLE IF NOT EXISTS public.property_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  processing_status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_videos_property ON public.property_videos(property_id);

-- -----------------------------------------------------------------------------
-- 4. DISCOVERY & FEED RANKING VIEW
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.ranked_feed_listings AS
SELECT 
  p.*,
  COALESCE(
    (1.0 / (1.0 + (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0))) + COALESCE(p.priority_score, 0),
    1.0
  ) AS dynamic_trust_rank
FROM public.properties p
WHERE p.status = 'published' AND p.deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 5. COMMUNICATION & MESSAGING ENGINE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  lead_status TEXT DEFAULT 'new_inquiry' NOT NULL CHECK (lead_status IN ('new_inquiry', 'responded', 'visit_scheduled', 'negotiating', 'closed', 'archived')),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  CONSTRAINT conversations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT conversations_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(property_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_owner ON public.conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_property ON public.conversations(property_id);

DROP TRIGGER IF EXISTS on_conversation_updated ON public.conversations;
CREATE TRIGGER on_conversation_updated
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_update_timestamp();

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL allowed for system messages
  text TEXT NOT NULL,
  type TEXT DEFAULT 'text' NOT NULL CHECK (type IN ('text', 'system', 'visit_request', 'attachment')),
  status TEXT DEFAULT 'sent' NOT NULL CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- Message Attachments
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'property_card')),
  url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- Conversation Participants (Unread tracking)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

-- Visit Requests
CREATE TABLE IF NOT EXISTS public.visit_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  requested_date TEXT NOT NULL,
  requested_time TEXT NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'rescheduled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visit_requests_conversation ON public.visit_requests(conversation_id);

-- -----------------------------------------------------------------------------
-- 6. DISCOVERY, SAVED & COLLECTIONS MODULE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, property_id)
);

CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.collection_properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  UNIQUE(collection_id, property_id)
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_pinned BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  last_searched_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.alert_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  search_id UUID REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('new_matching_property', 'price_drop', 'verified_owner', 'listing_updated')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, property_id)
);

-- -----------------------------------------------------------------------------
-- 7. TRUST, VERIFICATION & SAFETY MODULE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('owner', 'documents', 'address', 'photos', 'contact')),
  verified_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  UNIQUE(property_id, verification_type)
);

CREATE TABLE IF NOT EXISTS public.property_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.property_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('listed', 'price_updated', 'photos_added', 'description_updated', 'verification_completed', 'status_changed')),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- Canonical Reports Table
CREATE TABLE IF NOT EXISTS public.property_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  category TEXT,
  reason TEXT,
  details TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'under_review', 'dismissed', 'confirmed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- View Alias for backward compatibility
CREATE OR REPLACE VIEW public.listing_reports AS
SELECT * FROM public.property_reports;

CREATE TABLE IF NOT EXISTS public.listing_verification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_taken TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.duplicate_listing_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  duplicate_of_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  similarity_score NUMERIC NOT NULL,
  confidence_level TEXT DEFAULT 'low' CHECK (confidence_level IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'dismissed', 'confirmed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 8. ANALYTICS, AGGREGATION & INSIGHTS ENGINE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.owner_statistics (
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  total_listings INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  avg_response_time_minutes NUMERIC DEFAULT 0,
  avg_trust_score NUMERIC DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.listing_statistics (
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  total_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  visit_requests INTEGER DEFAULT 0,
  closed_leads INTEGER DEFAULT 0,
  health_score NUMERIC DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.listing_daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  messages INTEGER DEFAULT 0,
  visits INTEGER DEFAULT 0,
  UNIQUE(property_id, date)
);

CREATE TABLE IF NOT EXISTS public.owner_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 9. BETA PLATFORM & INFRASTRUCTURE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'usability', 'general')),
  description TEXT NOT NULL,
  screen_name TEXT,
  app_version TEXT,
  device_model TEXT,
  os_version TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.beta_diagnostics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('crash', 'failed_request', 'slow_api', 'network_failure', 'exception')),
  error_message TEXT,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  app_version TEXT,
  device_model TEXT,
  os_version TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- Seed default feature flags for Phase 27 closed beta
INSERT INTO public.feature_flags (key, value, description)
VALUES 
  ('enable_realtime_chat', 'true'::jsonb, 'Enable websocket realtime messaging'),
  ('enable_trust_insights', 'true'::jsonb, 'Enable dynamic trust score calculations'),
  ('enable_beta_telemetry', 'true'::jsonb, 'Enable crash and telemetry diagnostics')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) SECURITY POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_listing_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Properties Policies
DROP POLICY IF EXISTS "Published properties viewable by everyone" ON public.properties;
CREATE POLICY "Published properties viewable by everyone" ON public.properties FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view their own properties" ON public.properties;
CREATE POLICY "Owners view their own properties" ON public.properties FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners insert their own properties" ON public.properties;
CREATE POLICY "Owners insert their own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners update their own properties" ON public.properties;
CREATE POLICY "Owners update their own properties" ON public.properties FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners delete their own properties" ON public.properties;
CREATE POLICY "Owners delete their own properties" ON public.properties FOR DELETE USING (auth.uid() = owner_id);

-- Property Images & Videos Policies
DROP POLICY IF EXISTS "Anyone can view property images" ON public.property_images;
CREATE POLICY "Anyone can view property images" ON public.property_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage property images" ON public.property_images;
CREATE POLICY "Owners manage property images" ON public.property_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can view property videos" ON public.property_videos;
CREATE POLICY "Anyone can view property videos" ON public.property_videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage property videos" ON public.property_videos;
CREATE POLICY "Owners manage property videos" ON public.property_videos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
);

-- Conversations Policies
DROP POLICY IF EXISTS "Participants view their conversations" ON public.conversations;
CREATE POLICY "Participants view their conversations" ON public.conversations FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers create conversations" ON public.conversations;
CREATE POLICY "Buyers create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Participants update conversations" ON public.conversations;
CREATE POLICY "Participants update conversations" ON public.conversations FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = buyer_id);

-- Messages Policies
DROP POLICY IF EXISTS "Participants view messages" ON public.messages;
CREATE POLICY "Participants view messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (owner_id = auth.uid() OR buyer_id = auth.uid()))
);

DROP POLICY IF EXISTS "Participants insert messages" ON public.messages;
CREATE POLICY "Participants insert messages" ON public.messages FOR INSERT WITH CHECK (
  (sender_id IS NULL OR sender_id = auth.uid()) AND
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (owner_id = auth.uid() OR buyer_id = auth.uid()))
);

-- Conversation Participants Policies
DROP POLICY IF EXISTS "Users manage their participant record" ON public.conversation_participants;
CREATE POLICY "Users manage their participant record" ON public.conversation_participants FOR ALL USING (auth.uid() = user_id);

-- Visit Requests Policies
DROP POLICY IF EXISTS "Participants view visit requests" ON public.visit_requests;
CREATE POLICY "Participants view visit requests" ON public.visit_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (owner_id = auth.uid() OR buyer_id = auth.uid()))
);

DROP POLICY IF EXISTS "Buyers create visit requests" ON public.visit_requests;
CREATE POLICY "Buyers create visit requests" ON public.visit_requests FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Participants update visit requests" ON public.visit_requests;
CREATE POLICY "Participants update visit requests" ON public.visit_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (owner_id = auth.uid() OR buyer_id = auth.uid()))
);

-- Saved Properties & Collections Policies
DROP POLICY IF EXISTS "Users manage saved properties" ON public.saved_properties;
CREATE POLICY "Users manage saved properties" ON public.saved_properties FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage collections" ON public.collections;
CREATE POLICY "Users manage collections" ON public.collections FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage collection properties" ON public.collection_properties;
CREATE POLICY "Users manage collection properties" ON public.collection_properties FOR ALL USING (
  EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users manage saved searches" ON public.saved_searches;
CREATE POLICY "Users manage saved searches" ON public.saved_searches FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage search history" ON public.search_history;
CREATE POLICY "Users manage search history" ON public.search_history FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage alert subscriptions" ON public.alert_subscriptions;
CREATE POLICY "Users manage alert subscriptions" ON public.alert_subscriptions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage recently viewed" ON public.recently_viewed;
CREATE POLICY "Users manage recently viewed" ON public.recently_viewed FOR ALL USING (auth.uid() = user_id);

-- Trust & Reports Policies
DROP POLICY IF EXISTS "Anyone views verifications" ON public.property_verifications;
CREATE POLICY "Anyone views verifications" ON public.property_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone views price history" ON public.property_price_history;
CREATE POLICY "Anyone views price history" ON public.property_price_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone views activity logs" ON public.property_activity_log;
CREATE POLICY "Anyone views activity logs" ON public.property_activity_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone submits reports" ON public.property_reports;
CREATE POLICY "Anyone submits reports" ON public.property_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Reporters view own reports" ON public.property_reports;
CREATE POLICY "Reporters view own reports" ON public.property_reports FOR SELECT USING (auth.uid() = reporter_id);

-- Analytics & Beta Policies
DROP POLICY IF EXISTS "Anyone inserts analytics events" ON public.analytics_events;
CREATE POLICY "Anyone inserts analytics events" ON public.analytics_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners view statistics" ON public.owner_statistics;
CREATE POLICY "Owners view statistics" ON public.owner_statistics FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners view listing statistics" ON public.listing_statistics;
CREATE POLICY "Owners view listing statistics" ON public.listing_statistics FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners view daily metrics" ON public.listing_daily_metrics;
CREATE POLICY "Owners view daily metrics" ON public.listing_daily_metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Owners view achievements" ON public.owner_achievements;
CREATE POLICY "Owners view achievements" ON public.owner_achievements FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Anyone submits beta feedback" ON public.beta_feedback;
CREATE POLICY "Anyone submits beta feedback" ON public.beta_feedback FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone submits beta diagnostics" ON public.beta_diagnostics;
CREATE POLICY "Anyone submits beta diagnostics" ON public.beta_diagnostics FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone reads feature flags" ON public.feature_flags;
CREATE POLICY "Anyone reads feature flags" ON public.feature_flags FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- 11. STORAGE BUCKET CONFIGURATION & POLICIES
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('property-images', 'property-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('property-videos', 'property-videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime']),
  ('property-thumbnails', 'property-thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public read property-images" ON storage.objects;
CREATE POLICY "Public read property-images" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Auth upload property-images" ON storage.objects;
CREATE POLICY "Auth upload property-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read property-videos" ON storage.objects;
CREATE POLICY "Public read property-videos" ON storage.objects FOR SELECT USING (bucket_id = 'property-videos');

DROP POLICY IF EXISTS "Auth upload property-videos" ON storage.objects;
CREATE POLICY "Auth upload property-videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-videos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read property-thumbnails" ON storage.objects;
CREATE POLICY "Public read property-thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'property-thumbnails');

DROP POLICY IF EXISTS "Auth upload property-thumbnails" ON storage.objects;
CREATE POLICY "Auth upload property-thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-thumbnails' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Auth upload avatars" ON storage.objects;
CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 12. REALTIME PUBLICATION SETUP
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

COMMIT;
