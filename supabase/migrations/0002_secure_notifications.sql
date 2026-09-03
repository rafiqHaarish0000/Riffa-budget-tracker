-- RIFAA secure notification creation
--
-- Hardens the notification surface introduced in 0000_create_notifications.sql.
--
-- Why: 0000 exposed a general-purpose `notify_family(p_type,p_title,p_message,
-- p_route,p_metadata)` RPC to `authenticated`. Any family member could call it
-- directly with arbitrary type/title/message/route/metadata and broadcast a
-- forged or spammy notification to every other member — without there being a
-- real expense or savings event behind it.
--
-- Fix: introduce two narrowly-scoped, server-authoritative RPCs. Each one
-- derives the actor (auth.uid()), the family, the recipients, the notification
-- type, the title/message, and the route entirely on the server from real
-- domain rows. The client can neither choose the recipients nor forge the
-- content. We then REVOKE `authenticated`'s EXECUTE on `notify_family` so the
-- general-purpose function can no longer be invoked by clients.
--
-- This migration has NOT been applied to the live Supabase project. Apply it
-- after the audit report (see docs in the report). It does not touch the
-- `notifications` table or its RLS; it only changes the RPCs that create rows.

-- 1. SHARED EXPENSE NOTIFICATION -------------------------------------------
-- Server-derived. Reads the real expense row off `p_expense_id`, requires it to
-- be `type = 'shared'`, verifies the caller is a member of that expense's
-- family, then notifies every OTHER member. Title/message/route/metadata are all
-- built server-side from the actual expense record.
create or replace function public.notify_shared_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_expense public.expenses%rowtype;
  v_member boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_expense
    from public.expenses
   where id = p_expense_id;

  if v_expense.id is null then
    -- Unknown / removed expense: nothing to notify about.
    return;
  end if;

  -- Only shared expenses are broadcast. A personal expense must never notify
  -- anyone (including the partner).
  if v_expense.type <> 'shared' then
    return;
  end if;

  -- The caller must be a member of the family this (shared) expense belongs to.
  select exists(
    select 1 from public.family_members fm
     where fm.family_id = v_expense.family_id
       and fm.user_id = v_uid
  ) into v_member;

  if not v_member then
    raise exception 'Not a family member';
  end if;

  insert into public.notifications (user_id, family_id, type, title, message, route, metadata)
  select fm.user_id, v_expense.family_id, 'shared_expense_added',
         'New shared expense',
         '₹' || v_expense.amount::numeric::text || ' · ' || v_expense.category,
         '/expense/details?id=' || v_expense.id::text,
         jsonb_build_object('expense_id', v_expense.id, 'amount', v_expense.amount, 'category', v_expense.category)
    from public.family_members fm
   where fm.family_id = v_expense.family_id
     and fm.user_id <> v_uid;
end;
$$;

-- 2. SAVINGS CONTRIBUTION NOTIFICATION -------------------------------------
-- Server-derived. Resolves the goal's family from `p_goal_id`, verifies the
-- caller is a member, then notifies every OTHER member. The goal name drives the
-- message; the amount is passed by the client because it is the value just
-- contributed, but the type/route/recipients remain server-controlled.
create or replace function public.notify_savings_contribution(p_goal_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_goal public.savings_goals%rowtype;
  v_member boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_goal
    from public.savings_goals
   where id = p_goal_id;

  if v_goal.id is null then
    return;
  end if;

  select exists(
    select 1 from public.family_members fm
     where fm.family_id = v_goal.family_id
       and fm.user_id = v_uid
  ) into v_member;

  if not v_member then
    raise exception 'Not a family member';
  end if;

  insert into public.notifications (user_id, family_id, type, title, message, route, metadata)
  select fm.user_id, v_goal.family_id, 'savings_contribution_added',
         'Savings contribution',
         '₹' || p_amount::numeric::text || ' added to ' || v_goal.name,
         '/savings/details?id=' || v_goal.id::text,
         jsonb_build_object('goal_id', v_goal.id, 'amount', p_amount)
    from public.family_members fm
   where fm.family_id = v_goal.family_id
     and fm.user_id <> v_uid;
end;
$$;

-- 3. LOCK DOWN THE GENERAL-PURPOSE RPC --------------------------------------
-- Clients must no longer be able to forge arbitrary notifications. The function
-- is kept but is no longer callable by anon or authenticated roles.
revoke execute on function public.notify_family(text, text, text, text, jsonb)
  from public;
revoke execute on function public.notify_family(text, text, text, text, jsonb)
  from anon;
revoke execute on function public.notify_family(text, text, text, text, jsonb)
  from authenticated;

-- 4. GRANTS FOR THE NEW SCOPED RPCs -----------------------------------------
revoke execute on function public.notify_shared_expense(uuid) from public;
revoke execute on function public.notify_shared_expense(uuid) from anon;
grant execute on function public.notify_shared_expense(uuid) to authenticated;

revoke execute on function public.notify_savings_contribution(uuid, numeric) from public;
revoke execute on function public.notify_savings_contribution(uuid, numeric) from anon;
grant execute on function public.notify_savings_contribution(uuid, numeric) to authenticated;