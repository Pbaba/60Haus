-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 16
-- SCHEMA: property_verifications, property_price_history, property_activity_log, property_reports
-- ==========================================

-- 1. Alter Properties Table with Transparency Fields & Confidence Indicators
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ownership_type TEXT CHECK (ownership_type IN ('freehold', 'leasehold', 'co-operative', 'power-of-attorney')),
  ADD COLUMN IF NOT EXISTS property_age_confidence TEXT DEFAULT 'estimated' CHECK (property_age_confidence IN ('verified', 'estimated')),
  ADD COLUMN IF NOT EXISTS last_inspection_date DATE,
  ADD COLUMN IF NOT EXISTS last_inspection_confidence TEXT DEFAULT 'estimated' CHECK (last_inspection_confidence IN ('verified', 'estimated')),
  ADD COLUMN IF NOT EXISTS occupancy_status TEXT CHECK (occupancy_status IN ('vacant', 'occupied', 'tenant-occupied')),
  ADD COLUMN IF NOT EXISTS registration_availability BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS rera_number TEXT,
  ADD COLUMN IF NOT EXISTS rera_number_confidence TEXT DEFAULT 'estimated' CHECK (rera_number_confidence IN ('verified', 'estimated'));

-- 2. Alter Profiles Table with Verification Level
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'unverified' CHECK (verification_level IN ('unverified', 'basic', 'verified', 'premium'));

-- 3. Create Property Verifications Table (Extensible verification_type model)
CREATE TABLE IF NOT EXISTS public.property_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('owner', 'documents', 'address', 'photos', 'contact')),
  verified_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(property_id, verification_type)
);

-- 4. Create Property Price History Table
CREATE TABLE IF NOT EXISTS public.property_price_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  price numeric NOT NULL,
  changed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Property Activity Log (Listing Timeline)
CREATE TABLE IF NOT EXISTS public.property_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('listed', 'price_updated', 'photos_added', 'description_updated', 'verification_completed', 'status_changed')),
  description TEXT NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Property Reports Table
CREATE TABLE IF NOT EXISTS public.property_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('incorrect_information', 'fake_photos', 'duplicate_listing', 'already_sold', 'spam', 'suspicious_pricing', 'other')),
  details TEXT,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.property_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

-- 8. Setup RLS Security Policies
-- Verifications: Anyone can select, only owner/admin can insert/update
CREATE POLICY "Anyone can view verifications" ON public.property_verifications
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage verifications of their own properties" ON public.property_verifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Price History: Anyone can select, only owner can insert
CREATE POLICY "Anyone can view price history" ON public.property_price_history
  FOR SELECT USING (true);

CREATE POLICY "Owners can log price history for their own properties" ON public.property_price_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Activity Log: Anyone can select, only owner can insert
CREATE POLICY "Anyone can view activity logs" ON public.property_activity_log
  FOR SELECT USING (true);

CREATE POLICY "Owners can write activity logs for their own properties" ON public.property_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Reports: Anyone can insert, only reporter can select
CREATE POLICY "Anyone can submit listing reports" ON public.property_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Reporters can view their own reports" ON public.property_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- 9. Setup Database Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_property_verifications_property ON public.property_verifications(property_id);
CREATE INDEX IF NOT EXISTS idx_property_price_history_property ON public.property_price_history(property_id);
CREATE INDEX IF NOT EXISTS idx_property_activity_log_property ON public.property_activity_log(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reports_property ON public.property_reports(property_id);
