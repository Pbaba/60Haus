-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 12
-- SCHEMA: public.properties Schema Additions
-- ==========================================

-- 1. Alter listing status enum to support new lifecycle status values
-- Note: In Postgres, ALTER TYPE ADD VALUE cannot run inside transactional block.
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'available';
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'coming-soon';

-- 2. Add Sale Specific Columns
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS carpet_area numeric,
  ADD COLUMN IF NOT EXISTS built_up_area numeric,
  ADD COLUMN IF NOT EXISTS super_built_up_area numeric,
  ADD COLUMN IF NOT EXISTS plot_area numeric,
  ADD COLUMN IF NOT EXISTS property_age integer,
  ADD COLUMN IF NOT EXISTS possession_status text CHECK (possession_status IN ('ready-to-move', 'under-construction')),
  ADD COLUMN IF NOT EXISTS ownership_type text CHECK (ownership_type IN ('freehold', 'leasehold', 'co-operative', 'power-of-attorney'));

-- 3. Add Rent Specific Columns
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS security_deposit numeric,
  ADD COLUMN IF NOT EXISTS monthly_maintenance numeric,
  ADD COLUMN IF NOT EXISTS brokerage numeric,
  ADD COLUMN IF NOT EXISTS lease_duration integer,
  ADD COLUMN IF NOT EXISTS available_from text,
  ADD COLUMN IF NOT EXISTS preferred_tenant text CHECK (preferred_tenant IN ('anyone', 'family', 'bachelors', 'company'));

-- 4. Create Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON public.properties(listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON public.properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_carpet_area ON public.properties(carpet_area);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
