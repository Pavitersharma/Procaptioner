-- ==============================================================================
-- ProCaptioner — Supabase Database Setup Script
-- Run this script in your Supabase Dashboard: SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Create projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id text not null unique,
  name text not null,
  filename text not null,
  duration numeric default 0,
  language text default '',
  subtitles jsonb default '[]'::jsonb,
  caption_style jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.projects enable row level security;

-- 3. Create RLS Policies so each user can only access their own projects
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

-- 4. Create index for high-speed queries on user's recent projects
create index if not exists idx_projects_user_created 
  on public.projects(user_id, created_at desc);
