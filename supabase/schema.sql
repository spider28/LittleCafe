create extension if not exists "pgcrypto";
create extension if not exists vector with schema extensions;

create table if not exists public.site_settings (
  id text primary key,
  chatbot_enabled boolean not null default true,
  chatbot_provider text not null default 'openai' check (chatbot_provider in ('openai', 'github')),
  updated_at timestamptz not null default now(),
  check (id = 'global')
);

create table if not exists public.chatbot_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  source text not null default 'admin',
  active boolean not null default true,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_threads (
  session_id text primary key,
  state jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists chatbot_knowledge_chunks_embedding_idx
on public.chatbot_knowledge_chunks
using hnsw (embedding extensions.vector_cosine_ops);

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  alt_text text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  guest_name text,
  guest_phone text,
  notes text,
  party_size integer not null check (party_size > 0),
  status text not null default 'reserved' check (status in ('reserved', 'seated', 'completed', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.waiver_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  agreements text[] not null,
  signature text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  message text not null,
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.website_visits (
  id uuid primary key default gen_random_uuid(),
  visited_at timestamptz not null default now(),
  path text not null,
  search text,
  referrer text,
  host text,
  ip_address inet,
  country text,
  region text,
  city text,
  user_agent text,
  browser text,
  os text,
  device_type text,
  is_bot boolean not null default false
);

create index if not exists website_visits_visited_at_idx
on public.website_visits (visited_at desc);

create index if not exists website_visits_path_idx
on public.website_visits (path);

alter table public.admin_profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.chatbot_knowledge_chunks enable row level security;
alter table public.chatbot_threads enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.reservations enable row level security;
alter table public.waiver_submissions enable row level security;
alter table public.contact_messages enable row level security;
alter table public.website_visits enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

insert into public.site_settings (id, chatbot_enabled, chatbot_provider)
values ('global', true, 'openai')
on conflict (id) do nothing;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings for select
to anon, authenticated
using (id = 'global');

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings"
on public.site_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage chatbot knowledge" on public.chatbot_knowledge_chunks;
create policy "Admins manage chatbot knowledge"
on public.chatbot_knowledge_chunks for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage chatbot threads" on public.chatbot_threads;
create policy "Admins manage chatbot threads"
on public.chatbot_threads for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.match_chatbot_knowledge(
  query_embedding extensions.vector(1536),
  match_threshold double precision default 0.72,
  match_count integer default 5
)
returns table (
  id uuid,
  title text,
  content text,
  source text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    chunk.id,
    chunk.title,
    chunk.content,
    chunk.source,
    1 - (chunk.embedding <=> query_embedding) as similarity
  from public.chatbot_knowledge_chunks as chunk
  where
    chunk.active
    and 1 - (chunk.embedding <=> query_embedding) >= match_threshold
  order by chunk.embedding <=> query_embedding
  limit least(match_count, 10);
$$;

grant execute on function public.match_chatbot_knowledge(extensions.vector, double precision, integer) to anon, authenticated;

drop policy if exists "Admins can read admin profiles" on public.admin_profiles;
create policy "Admins can read admin profiles"
on public.admin_profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "Public can view gallery" on public.gallery_photos;
create policy "Public can view gallery"
on public.gallery_photos for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage gallery" on public.gallery_photos;
create policy "Admins manage gallery"
on public.gallery_photos for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can view reservations" on public.reservations;
create policy "Public can view reservations"
on public.reservations for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage reservations" on public.reservations;
create policy "Admins manage reservations"
on public.reservations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can submit waivers" on public.waiver_submissions;
create policy "Anyone can submit waivers"
on public.waiver_submissions for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins read waivers" on public.waiver_submissions;
create policy "Admins read waivers"
on public.waiver_submissions for select
to authenticated
using (public.is_admin());

drop policy if exists "Anyone can submit contact messages" on public.contact_messages;
create policy "Anyone can submit contact messages"
on public.contact_messages for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins read contact messages" on public.contact_messages;
create policy "Admins read contact messages"
on public.contact_messages for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins read website visits" on public.website_visits;
create policy "Admins read website visits"
on public.website_visits for select
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "Public reads gallery files" on storage.objects;
create policy "Public reads gallery files"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'gallery');

drop policy if exists "Admins manage gallery files" on storage.objects;
create policy "Admins manage gallery files"
on storage.objects for all
to authenticated
using (bucket_id = 'gallery' and public.is_admin())
with check (bucket_id = 'gallery' and public.is_admin());
