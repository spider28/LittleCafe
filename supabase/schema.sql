create extension if not exists "pgcrypto";

create table if not exists public.site_settings (
  id text primary key,
  chatbot_enabled boolean not null default true,
  chatbot_provider text not null default 'openai' check (chatbot_provider in ('openai', 'github')),
  updated_at timestamptz not null default now(),
  check (id = 'global')
);

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

alter table public.admin_profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.reservations enable row level security;
alter table public.waiver_submissions enable row level security;
alter table public.contact_messages enable row level security;

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
