-- RIFAA device push tokens
--
-- FUTURE-READY. This table stores push-notification device tokens for a future
-- provider (Expo Notifications / FCM / APNs). It is intentionally INERT: no app
-- code writes to it yet, and no push delivery is enabled. It exists so the
-- schema, RLS, and security posture are settled ahead of the provider wiring.
--
-- This migration has NOT been applied to the live Supabase project and is NOT
-- required for the current app to function. Apply it manually only when push
-- delivery is being enabled (see docs/push-notifications.md).

-- 1. TABLE ------------------------------------------------------------------
create table if not exists public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  push_token text not null,
  platform   text not null check (platform in ('ios', 'android', 'web')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A given token belongs to one user (prevents duplicates / cross-user reuse).
  constraint push_tokens_token_unique unique (push_token)
);

comment on column public.push_tokens.push_token is
  'Opaque provider token identifying a deliverable device. Treated as sensitive; never logged.';

-- 2. INDEXES ---------------------------------------------------------------
create index if not exists push_tokens_user_idx
  on public.push_tokens (user_id);
create index if not exists push_tokens_active_user_idx
  on public.push_tokens (user_id) where is_active;

-- 3. UPDATED_AT TRIGGER ----------------------------------------------------
-- Keeps updated_at in sync on any row change (idempotent; safe to re-run).
drop function if exists public.set_updated_at() cascade;
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists push_tokens_set_updated_at on public.push_tokens;
create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row
execute function public.set_updated_at();

-- 4. ROW LEVEL SECURITY ----------------------------------------------------
alter table public.push_tokens enable row level security;

-- A user may only view their own push tokens.
create policy "push_tokens_select_own"
  on public.push_tokens for select
  using (user_id = auth.uid());

-- A user may only modify their own push tokens, and may never reassign the row
-- to another user_id. The user_id is resolved server-side from auth.uid() so a
-- malicious client cannot register a token for / against someone else.
create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  with check (user_id = auth.uid());

create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (user_id = auth.uid());