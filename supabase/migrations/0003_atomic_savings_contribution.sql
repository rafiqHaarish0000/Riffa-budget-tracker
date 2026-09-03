-- RIFAA atomic savings contribution RPC
--
-- Hardens `add_savings_contribution(uuid,numeric,date)` so a contribution is
-- created and the goal's `current_amount` is incremented atomically on the
-- server, with the caller's identity and family membership enforced server-side.
--
-- Why: the app previously performed a non-atomic client-side read-modify-write
-- of `savings_goals.current_amount` followed by a separate direct insert into
-- `savings_contributions`. Two concurrent contributions could both read the
-- same balance and clobber one another, and the client sent `user_id` with the
-- insert (relying on RLS to keep it honest).
--
-- This function:
--   * derives `user_id` from `auth.uid()` (client can never forge ownership)
--   * verifies the target goal exists and belongs to a family the caller is a
--     member of (prevents cross-family contributions)
--   * validates `p_amount > 0`
--   * inserts the contribution and increments the goal balance in ONE atomic
--     statement scope (functions run in a single implicit transaction)
--
-- It is SECURITY DEFINER (as the table owner) but sets an explicit `search_path`
-- and never trusts client-supplied identity. Only `authenticated` can invoke it.
--
-- This migration has NOT been applied to the live Supabase project. Apply it
-- after the audit report. It re-creates the existing RPC with the same signature,
-- so it is safe to apply idempotently.
create or replace function public.add_savings_contribution(p_goal_id uuid, p_amount numeric, p_date date)
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

  if p_amount is null or p_amount <= 0 then
    raise exception 'Contribution must be greater than zero';
  end if;

  select * into v_goal
    from public.savings_goals
   where id = p_goal_id;

  if v_goal.id is null then
    raise exception 'Goal not found';
  end if;

  -- The caller must belong to the goal's family (contribution -> goal -> family).
  select exists(
    select 1 from public.family_members fm
     where fm.family_id = v_goal.family_id
       and fm.user_id = v_uid
  ) into v_member;

  if not v_member then
    raise exception 'Not a member of this goal''s family';
  end if;

  insert into public.savings_contributions (goal_id, user_id, amount, date)
  values (p_goal_id, v_uid, p_amount, coalesce(p_date, now()::date));

  update public.savings_goals
     set current_amount = current_amount + p_amount
   where id = p_goal_id;
end;
$$;

revoke execute on function public.add_savings_contribution(uuid, numeric, date) from public;
revoke execute on function public.add_savings_contribution(uuid, numeric, date) from anon;
grant execute on function public.add_savings_contribution(uuid, numeric, date) to authenticated;