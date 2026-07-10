-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 4
-- SCHEMA: public.properties & public.property_images
-- ==========================================

-- 1. Create Listings Lifecycle Status Enum
create type public.listing_status as enum ('draft', 'published', 'rented', 'sold', 'archived');

-- 2. Create Properties Table
create table public.properties (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  price numeric not null,
  listing_type text default 'rent' check (listing_type in ('rent', 'buy')),
  city text not null,
  locality text,
  address text,
  bedrooms integer default 1,
  bathrooms integer default 1,
  area_sqft integer,
  furnishing text default 'unfurnished' check (furnishing in ('unfurnished', 'semi-furnished', 'fully-furnished')),
  property_type text default 'apartment',
  amenities text[] default '{}',
  thumbnail_url text,
  video_url text,
  latitude double precision,
  longitude double precision,
  status public.listing_status default 'published'::public.listing_status not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Normalized Property Images Table
create table public.property_images (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  image_url text not null,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Database Query Optimization Indexes
create index idx_properties_city on public.properties(city);
create index idx_properties_status on public.properties(status);
create index idx_properties_owner on public.properties(owner_id);
create index idx_images_property on public.property_images(property_id);

-- 5. Enable Row Level Security (RLS)
alter table public.properties enable row level security;
alter table public.property_images enable row level security;

-- 6. Setup Properties Table Security Policies
create policy "Published listings are viewable by everyone" on public.properties
  for select using (status = 'published');

create policy "Owners can read their own draft/published listings" on public.properties
  for select using (auth.uid() = owner_id);

create policy "Owners can insert their own listings" on public.properties
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update their own listings" on public.properties
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owners can delete their own listings" on public.properties
  for delete using (auth.uid() = owner_id);

-- 7. Setup Normalized Property Images Table Security Policies
create policy "Images of published properties are viewable by everyone" on public.property_images
  for select using (
    exists (
      select 1 from public.properties 
      where id = property_id and status = 'published'
    )
  );

create policy "Owners can manage images of their own listings" on public.property_images
  for all using (
    exists (
      select 1 from public.properties 
      where id = property_id and owner_id = auth.uid()
    )
  );
