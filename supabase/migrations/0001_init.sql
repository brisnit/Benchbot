-- ─────────────────────────────────────────────────────────────
-- BenchBot schema + Row Level Security.
-- Apply with the Supabase CLI:  supabase db push
-- Auth is handled by Supabase Auth (auth.users); these tables reference it.
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ---------- workspaces ----------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','editor','viewer','client')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ---------- audits ----------
create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  target_url text not null,
  target_name text,
  site_type text not null,
  audit_goal text not null,
  status text not null default 'draft',
  device_mode text not null default 'desktop',
  crawl_settings jsonb not null default '[]'::jsonb,
  progress int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  name text not null,
  url text not null,
  competitor_type text not null check (competitor_type in ('direct','indirect','inspiration','custom','target')),
  reason text,
  selected boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.crawl_results (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  competitor_id uuid references public.competitors (id) on delete cascade,
  url text not null,
  page_type text,
  title text,
  meta_description text,
  h1 text,
  nav_items jsonb default '[]'::jsonb,
  links jsonb default '[]'::jsonb,
  status_code int,
  created_at timestamptz not null default now()
);

create table if not exists public.screenshots (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  competitor_id uuid references public.competitors (id) on delete cascade,
  url text not null,
  device_type text not null,
  page_type text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sitemaps (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  competitor_id uuid references public.competitors (id) on delete cascade,
  tree jsonb not null,
  page_count int,
  depth int,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_scores (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  competitor_id uuid references public.competitors (id) on delete cascade,
  ux_score int,
  mobile_score int,
  navigation_score int,
  content_score int,
  conversion_score int,
  ai_visibility_score int,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  competitor_id uuid references public.competitors (id) on delete cascade,
  category text,
  title text,
  description text,
  evidence text,
  recommendation text,
  score int,
  priority text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  executive_summary text,
  full_report_markdown text,
  report_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- helper: is the current user a member of a workspace? ----------
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.audit_in_my_workspace(a uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.audits au
    join public.workspace_members m on m.workspace_id = au.workspace_id
    where au.id = a and m.user_id = auth.uid()
  );
$$;

-- ---------- enable RLS ----------
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.audits enable row level security;
alter table public.competitors enable row level security;
alter table public.crawl_results enable row level security;
alter table public.screenshots enable row level security;
alter table public.sitemaps enable row level security;
alter table public.audit_scores enable row level security;
alter table public.audit_findings enable row level security;
alter table public.reports enable row level security;

-- workspaces: members can read; owner can write
create policy "ws read" on public.workspaces for select using (public.is_workspace_member(id));
create policy "ws insert" on public.workspaces for insert with check (owner_id = auth.uid());
create policy "ws update" on public.workspaces for update using (owner_id = auth.uid());
create policy "ws delete" on public.workspaces for delete using (owner_id = auth.uid());

-- members: visible to fellow members
create policy "mem read" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "mem write" on public.workspace_members for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- audits: scoped to the user's workspaces
create policy "audit read" on public.audits for select using (public.is_workspace_member(workspace_id));
create policy "audit write" on public.audits for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- child tables: scoped via the parent audit
create policy "competitors rw" on public.competitors for all
  using (public.audit_in_my_workspace(audit_id)) with check (public.audit_in_my_workspace(audit_id));
create policy "crawl rw" on public.crawl_results for all
  using (public.audit_in_my_workspace(audit_id)) with check (public.audit_in_my_workspace(audit_id));
create policy "shots rw" on public.screenshots for all
  using (public.audit_in_my_workspace(audit_id)) with check (public.audit_in_my_workspace(audit_id));
create policy "sitemaps rw" on public.sitemaps for all
  using (public.audit_in_my_workspace(audit_id)) with check (public.audit_in_my_workspace(audit_id));
create policy "scores rw" on public.audit_scores for all
  using (public.audit_in_my_workspace(audit_id)) with check (public.audit_in_my_workspace(audit_id));
create policy "findings rw" on public.audit_findings for all
  using (public.audit_in_my_workspace(audit_id)) with check (public.audit_in_my_workspace(audit_id));
create policy "reports rw" on public.reports for all
  using (public.audit_in_my_workspace(audit_id)) with check (public.audit_in_my_workspace(audit_id));

-- ---------- storage bucket for screenshots ----------
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;
