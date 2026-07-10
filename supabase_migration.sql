-- ==========================================
-- SUPABASE MIGRATION SCRIPT: SPRINT 3
-- SCHEMA: public.profiles
-- ==========================================

-- 1. Create Enums for Roles and Communication Preferences
create type public.user_role as enum ('hunter', 'owner');
create type public.contact_pref as enum ('phone', 'whatsapp', 'both');

-- 2. Create Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  phone_number text,
  role public.user_role default 'hunter'::public.user_role not null,
  contact_preference public.contact_pref default 'both'::public.contact_pref not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_active_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Indexes for Quick Retrieval Queries
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_username on public.profiles(username);

-- 4. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 5. Establish RLS Security Access Policies
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select 
  using (true);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Trigger Function to Auto-Provision Profiles on Auth User Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    username,
    full_name,
    role,
    contact_preference
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'hunter'::public.user_role,
    'both'::public.contact_pref
  );
  return new;
end;
$$ language plpgsql security definer;

-- 7. Trigger Binding to auth.users Table
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row 
  execute procedure public.handle_new_user();

-- 8. Auto-Update updated_at Timestamp Function
create or replace function public.handle_update_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create or replace trigger on_profile_updated
  before update on public.profiles
  for each row
  execute procedure public.handle_update_timestamp();
