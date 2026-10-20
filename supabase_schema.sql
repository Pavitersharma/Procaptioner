-- ==============================================================================
-- ProCaptioner — Complete Supabase Database & Storage Setup Script
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/eirsktuklnqjmdkoyvno
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query", paste this entire script, and click "Run" (or Ctrl+Enter)
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE: Ensure table exists & has all required columns
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  plan text default 'free',
  storage_used_bytes bigint default 0,
  created_at timestamptz default now() not null
);

-- Ensure all columns exist if table was already created
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists plan text default 'free';
alter table public.profiles add column if not exists storage_used_bytes bigint default 0;
alter table public.profiles add column if not exists created_at timestamptz default now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROJECTS TABLE: Ensure table exists & has all required columns
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id text,
  title text not null default 'Untitled Project',
  name text,
  filename text,
  duration numeric default 0,
  file_size bigint default 0,
  storage_path text,
  video_url text,
  language text default 'auto',
  subtitles jsonb default '[]'::jsonb,
  caption_style jsonb default '{}'::jsonb,
  status text default 'completed',
  audio_clean_applied boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ensure newly added columns exist in case table was created with core columns
alter table public.projects add column if not exists title text default 'Untitled Project';
alter table public.projects add column if not exists name text;
alter table public.projects add column if not exists filename text;
alter table public.projects add column if not exists job_id text;
alter table public.projects add column if not exists duration numeric default 0;
alter table public.projects add column if not exists file_size bigint default 0;
alter table public.projects add column if not exists storage_path text;
alter table public.projects add column if not exists video_url text;
alter table public.projects add column if not exists language text default 'auto';
alter table public.projects add column if not exists subtitles jsonb default '[]'::jsonb;
alter table public.projects add column if not exists caption_style jsonb default '{}'::jsonb;
alter table public.projects add column if not exists status text default 'completed';
alter table public.projects add column if not exists audio_clean_applied boolean default false;
alter table public.projects add column if not exists updated_at timestamptz default now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS) FOR PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS) FOR PROJECTS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.projects enable row level security;

drop policy if exists "Users can view their own projects" on public.projects;
create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own projects" on public.projects;
create policy "Users can insert their own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- High-speed query indexes
create index if not exists idx_projects_user_created 
  on public.projects(user_id, created_at desc);

create index if not exists idx_projects_job_id 
  on public.projects(job_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. AUTOMATIC TRIGGER FOR NEW USERS (Google OAuth & Email Signup)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, plan, storage_used_bytes)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Creator'),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null),
    'free',
    0
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill any existing users from auth.users into profiles
insert into public.profiles (id, full_name, email, avatar_url, plan, storage_used_bytes)
select 
  id,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1), 'Creator'),
  email,
  coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', null),
  'free',
  0
from auth.users
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SUPABASE STORAGE BUCKET & RLS POLICIES FOR VIDEOS
-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure the 'videos' bucket exists and is marked as public
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do update set public = true;

-- Storage RLS policies on storage.objects
drop policy if exists "Authenticated users can upload videos" on storage.objects;
create policy "Authenticated users can upload videos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'videos');

drop policy if exists "Public video read access" on storage.objects;
create policy "Public video read access"
  on storage.objects for select
  using (bucket_id = 'videos');

drop policy if exists "Users can delete their own uploaded videos" on storage.objects;
create policy "Users can delete their own uploaded videos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'videos' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own uploaded videos" on storage.objects;
create policy "Users can update their own uploaded videos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'videos' and (auth.uid())::text = (storage.foldername(name))[1]);
