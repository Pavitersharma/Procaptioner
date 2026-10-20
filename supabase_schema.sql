-- ==============================================================================
-- ProCaptioner — Production Supabase Database & Storage Setup Script
-- Run this script in your Supabase Dashboard: SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Create projects table (or update if already exists)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id text not null unique,
  name text not null,
  filename text not null,
  duration numeric default 0,
  file_size bigint default 0,
  storage_path text,
  video_url text,
  language text default '',
  subtitles jsonb default '[]'::jsonb,
  caption_style jsonb default '{}'::jsonb,
  status text default 'completed',
  audio_clean_applied boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ensure all new columns exist if table was previously created
alter table public.projects add column if not exists file_size bigint default 0;
alter table public.projects add column if not exists storage_path text;
alter table public.projects add column if not exists video_url text;
alter table public.projects add column if not exists status text default 'completed';
alter table public.projects add column if not exists audio_clean_applied boolean default false;

-- 2. Create user profiles & plan usage limits table
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free', -- 'free' | 'creator_pro'
  storage_limit_bytes bigint not null default 5368709120, -- 5 GB
  transcription_limit_seconds numeric not null default 3600, -- 60 mins (3600 seconds)
  audio_clean_limit int not null default 3,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.projects enable row level security;
alter table public.user_profiles enable row level security;

-- 4. Projects RLS Policies
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

-- 5. User Profiles RLS Policies
drop policy if exists "Users can view their own profile" on public.user_profiles;
create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- 6. High-speed query indexes
create index if not exists idx_projects_user_created 
  on public.projects(user_id, created_at desc);

create index if not exists idx_projects_job_id 
  on public.projects(job_id);

-- 7. Trigger to automatically create a user_profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, plan)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Supabase Storage Bucket setup for Video Storage
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Storage RLS policies for 'videos' bucket
drop policy if exists "Authenticated users can upload videos" on storage.objects;
create policy "Authenticated users can upload videos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'videos' and (auth.uid())::text = (storage.foldername(name))[1]);

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
