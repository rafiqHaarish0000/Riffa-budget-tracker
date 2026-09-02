-- RIFAA in-app notifications
-- Applies the `notifications` table, its RLS policies, and a secure
-- `notify_family` RPC used by the app to create server-authoritative
-- notifications for the caller's family members.

-- 1. TABLE ------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  family_id  uuid references public.families (id) on delete cascade,
  type       text not null check (
               type in ('shared_expense_added', 'savings_contribution_added', 'system')
             ),
  title      text not null,
  message    text not null,
  is_read    boolean not null default false,
  read_at    timestamptz,
  route      text,                 -- internal app href, e.g. '/expense/details?id=...'
  metadata   jsonb,
  created_at timestamptz not null default now()
);

comment on column public.notifications.route is
  'Internal, app-controlled navigation target. Never an untrusted URL.';

-- 2. INDEXES ---------------------------------------------------------------
create index if not exists notifications_user_id_idx
  on public.notifications (user_id);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read);
create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

-- 3. ROW LEVEL SECURITY ----------------------------------------------------
alter table public.notifications enable row level security;

-- Members can only ever see their own notifications.
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

-- Members can mark their own notifications read.
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Members can delete their own notifications.
create policy "notifications_delete_own"
  on public.notifications for delete
  using (user_id = auth.uid());

-- Inserts are intentionally NOT exposed to clients directly. Notifications are
-- created only through notify_family() below.

-- 4. SECURE CREATION RPC ---------------------------------------------------
-- Server-authoritative. The actor's identity (auth.uid()) is resolved server
-- side; the client can never choose a recipient. A notification is inserted
-- for every OTHER member of the caller's family (never the caller themselves).
create or replace function public.notify_family(
  p_type    text,
  p_title   text,
  p_message text,
  p_route   text default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_family uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Resolve the caller's family through family_memberships.
  select fm.family_id into v_family
    from public.family_members fm
   where fm.user_id = v_uid
   limit 1;

  if v_family is null then
    raise exception 'Not a family member';
  end if;

  insert into public.notifications (user_id, family_id, type, title, message, route, metadata)
  select fm.user_id, v_family, p_type, p_title, p_message, p_route, p_metadata
    from public.family_members fm
   where fm.family_id = v_family
     and fm.user_id <> v_uid;
end;
$$;

revoke execute on function public.notify_family(text, text, text, text, jsonb)
  from public;
grant execute on function public.notify_family(text, text, text, text, jsonb)
  to authenticated;
