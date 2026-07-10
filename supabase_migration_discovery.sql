-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 6
-- SCHEMA: public.reports, public.saved_searches & discovery columns
-- ==========================================

-- 1. Create Report Categories Enum
create type public.report_reason as enum (
  'Spam', 
  'Duplicate Listing', 
  'Incorrect Information', 
  'Misleading Photos', 
  'Scam', 
  'Already Sold/Rented', 
  'Other'
);

-- 2. Create Reports Table
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  reason public.report_reason not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Saved Searches Table
create table public.saved_searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  filters jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table public.reports enable row level security;
alter table public.saved_searches enable row level security;

-- 5. Setup Reports and Saved Searches Security Policies
create policy "Users can insert their own reports" on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy "Users can manage their own saved searches" on public.saved_searches
  for all using (auth.uid() = user_id);

-- 6. Add Discovery Optimization Columns to Properties
alter table public.properties add column if not exists priority_score double precision default 0.0 not null;
alter table public.properties add column if not exists is_sponsored boolean default false not null;
alter table public.properties add column if not exists sponsored_expires_at timestamp with time zone;

-- 7. Setup Discovery Query Optimization Indexes
create index idx_properties_sponsored_priority on public.properties(is_sponsored, priority_score);
create index idx_properties_price_bedrooms on public.properties(price, bedrooms);
create index idx_properties_location on public.properties(city, locality);
create index idx_saved_searches_user on public.saved_searches(user_id);
create index idx_reports_property on public.reports(property_id);
