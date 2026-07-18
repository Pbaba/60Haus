-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 17
-- SCHEMA: Add 'pending' to listing_status enum type
-- ==========================================

-- Alter listing_status enum to add 'pending' state
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'pending';
