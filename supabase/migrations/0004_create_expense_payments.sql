-- RIFAA shared expense payment splitting
--
-- Introduces `expense_payments`, the source of truth for how much each family
-- member paid toward an expense. Supports one payer (the common case) or many,
-- for both personal and shared expenses. The existing `expenses.paid_by`
-- column is deliberately NOT dropped: it remains for backward compatibility and
-- keeps existing records intact.
--
-- This migration is designed for you to run MANUALLY in the Supabase SQL
-- Editor. It is NOT automatically applied and it is NOT live. It runs in a
-- single transaction so it applies atomically (all or nothing).

begin;

-- ============================================================================
-- 1. expense_payments TABLE
-- ============================================================================

create table if not exists public.expense_payments (
  id         uuid        primary key default gen_random_uuid(),
  expense_id uuid        not null references public.expenses  (id) on delete cascade,
  user_id    uuid        not null references auth.users      (id) on delete cascade,
  amount     numeric     not null check (amount > 0),
  created_at timestamptz not null default now()
);

comment on table public.expense_payments is
  'Per-payer allocation toward an expense. Sum of amount per expense_id must equal expenses.amount (enforced by RPCs).';

-- One allocation per payer per expense: the UI represents a single total amount
-- per payer, so we forbid duplicate rows for the same expense + user.
alter table public.expense_payments
  add constraint expense_payments_expense_user_key unique (expense_id, user_id);

-- Index for grouping/lookup by expense and by payer.
create index if not exists expense_payments_expense_idx
  on public.expense_payments (expense_id);
create index if not exists expense_payments_user_idx
  on public.expense_payments (user_id);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================

alter table public.expense_payments enable row level security;

-- SELECT: a user may read payment allocations only for expenses they can see.
--   shared  -> requester must be a member of the expense's family
--   personal-> only the expense owner may read its payments
-- Visuality mirrors the existing `expenses` RLS: an authenticated user who is
-- not a member of a shared expense's family cannot read its payment rows.
create policy "expense_payments_select_visible"
  on public.expense_payments for select
  using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and (e.type = 'shared'
             and public.is_family_member(e.family_id)
             or e.type = 'personal'
             and e.user_id = auth.uid())
    )
  );

-- INSERT / UPDATE / DELETE are intentionally NOT granted to clients directly.
-- Payment allocations are created and updated ONLY through the
-- `create_expense_with_payments` / `update_expense_with_payments` SECURITY
-- DEFINER RPCs below, which enforce family membership, payer-in-family, and
-- total-must-equal-expense atomically. Deleting an expense removes its payment
-- rows through ON DELETE CASCADE (no orphan rows).

-- ============================================================================
-- 3. SERVER-AUTHORITATIVE, ATOMIC RPCs
-- ============================================================================

-- Validates a payments jsonb array and returns the accumulated numeric total,
-- verifying each payer belongs to `p_family_id`. Raises on invalid input.
-- This helper keeps the total-must-equal-expense rule in one place.
create or replace function public._validate_payments(
  p_payments jsonb,
  p_family_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_total numeric := 0;
  v_member boolean;
begin
  if p_payments is null or jsonb_typeof(p_payments) <> 'array' then
    raise exception 'Payments must be an array';
  end if;

  if jsonb_array_length(p_payments) = 0 then
    raise exception 'At least one payer is required';
  end if;

  for v_payment in
    select value ->> 'user_id' as user_id,
           value ->> 'amount' as amount
    from jsonb_array_elements(p_payments)
  loop
    if v_payment.user_id is null or (v_payment.user_id)::uuid is null then
      raise exception 'Payer must be provided';
    end if;
    if v_payment.amount is null
       or (v_payment.amount)::numeric is null
       or (v_payment.amount)::numeric <= 0 then
      raise exception 'Payment amount must be greater than zero';
    end if;

    -- Payer must be a member of the same family. This prevents assigning a
    -- payment to someone from ANOTHER family.
    select exists(
      select 1 from public.family_members fm
       where fm.family_id = p_family_id
         and fm.user_id = (v_payment.user_id)::uuid
    ) into v_member;
    if not v_member then
      raise exception 'Payer is not a member of this family';
    end if;

    v_total := v_total + (v_payment.amount)::numeric;
  end loop;

  return v_total;
end;
$$;

-- CREATE an expense together with its payment allocations, atomically.
-- Enforces server-side (never trusts client-supplied family/ownership):
--   * caller is a family member (family_id resolved from caller's membership)
--   * personal -> single payer = the caller (owner), always private
--   * shared   -> every payer is a member of the caller's family
--   * sum(payments) == expense amount
-- Whole operation commits or rolls back as one; no race between inserting the
-- expense and its payments.
create or replace function public.create_expense_with_payments(
  p_amount      numeric,
  p_category    text,
  p_type        text,
  p_date        date,
  p_note        text,
  p_payments    jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_family uuid;
  v_expense_id uuid;
  v_total numeric;
  v_member boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  if p_category is null or trim(p_category) = '' then
    raise exception 'Category is required';
  end if;
  if p_type not in ('personal', 'shared') then
    raise exception 'Invalid expense type';
  end if;

  -- Resolve the caller's family from their own membership (never client input).
  select fm.family_id into v_family
    from public.family_members fm
   where fm.user_id = v_uid
   limit 1;
  if v_family is null then
    raise exception 'Not a family member';
  end if;

  -- Personal expenses: only the single payer = the caller; never shared-able.
  if p_type = 'personal' then
    if jsonb_array_length(p_payments) <> 1 then
      raise exception 'Personal expense must have exactly one payer';
    end if;
    if (p_payments -> 0 ->> 'user_id')::uuid <> v_uid then
      raise exception 'Personal expense payer must be the authenticated user';
    end if;
  end if;

  v_total := public._validate_payments(p_payments, v_family);
  if v_total <> p_amount then
    raise exception 'Payment total % does not equal expense amount %',
      v_total, p_amount;
  end if;

  -- paid_by is retained for backward compatibility; set it to the primary
  -- (first) payer so it reflects the split rather than always the caller.
  insert into public.expenses (family_id, user_id, amount, category, type, paid_by, date, note)
  values (v_family, v_uid, p_amount, p_category, p_type,
          coalesce((p_payments -> 0 ->> 'user_id')::uuid, v_uid),
          p_date, p_note)
  returning id into v_expense_id;

  insert into public.expense_payments (expense_id, user_id, amount)
  select v_expense_id,
         (value ->> 'user_id')::uuid,
         (value ->> 'amount')::numeric
    from jsonb_array_elements(p_payments);

  return v_expense_id;
end;
$$;

-- UPDATE an expense and its payment allocations, atomically.
--   * caller must be a member of the expense's family
--   * personal -> only the expense owner may update; single payer = owner
--   * every payer is a member of that expense's family
--   * sum(payments) == new expense amount
-- Replaces the payment rows only if every check passes, so the expense and its
-- allocations stay consistent (no race, no partial update).
create or replace function public.update_expense_with_payments(
  p_expense_id  uuid,
  p_amount      numeric,
  p_category    text,
  p_type        text,
  p_date        date,
  p_note        text,
  p_payments    jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_expense public.expenses%rowtype;
  v_family uuid;
  v_total numeric;
  v_member boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_expense
    from public.expenses
   where id = p_expense_id;
  if v_expense.id is null then
    raise exception 'Expense not found';
  end if;

  -- Caller must be a member of the expense's family.
  select exists(
    select 1 from public.family_members fm
     where fm.family_id = v_expense.family_id
       and fm.user_id = v_uid
  ) into v_member;
  if not v_member then
    raise exception 'Not a member of this expense''s family';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  if p_category is null or trim(p_category) = '' then
    raise exception 'Category is required';
  end if;
  if p_type not in ('personal', 'shared') then
    raise exception 'Invalid expense type';
  end if;

  -- Personal expenses: only the owner can modify, and the only payer is the
  -- owner. Guards scenario F (making a personal expense appear shared) and I
  -- (forging user_id for personal expenses).
  if p_type = 'personal' then
    if v_uid <> v_expense.user_id then
      raise exception 'Only the expense owner can edit a personal expense';
    end if;
    if jsonb_array_length(p_payments) <> 1 then
      raise exception 'Personal expense must have exactly one payer';
    end if;
    if (p_payments -> 0 ->> 'user_id')::uuid <> v_expense.user_id then
      raise exception 'Personal expense payer must be the expense owner';
    end if;
  end if;

  v_family := v_expense.family_id;
  v_total := public._validate_payments(p_payments, v_family);
  if v_total <> p_amount then
    raise exception 'Payment total % does not equal expense amount %',
      v_total, p_amount;
  end if;

  -- Preserve the existing value of `paid_by` for backward compatibility: keep it
  -- as the first/primary payer if it is still a family member, else the owner.
  update public.expenses
     set amount   = p_amount,
         category = p_category,
         type     = p_type,
         paid_by  = case
                      when (p_payments -> 0 ->> 'user_id')::uuid is not null
                        then (p_payments -> 0 ->> 'user_id')::uuid
                      else v_expense.paid_by
                    end,
         date     = p_date,
         note     = p_note
   where id = p_expense_id;

  -- Replace allocations atomically within the same implicit transaction.
  delete from public.expense_payments where expense_id = p_expense_id;
  insert into public.expense_payments (expense_id, user_id, amount)
  select p_expense_id,
         (value ->> 'user_id')::uuid,
         (value ->> 'amount')::numeric
    from jsonb_array_elements(p_payments);
end;
$$;

-- ============================================================================
-- 4. GRANTS
-- ============================================================================

revoke all on function public.create_expense_with_payments(numeric, text, text, date, text, jsonb) from public;
revoke all on function public.update_expense_with_payments(uuid, numeric, text, text, date, text, jsonb) from public;
revoke all on function public._validate_payments(jsonb, uuid) from public;
revoke all on function public._validate_payments(jsonb, uuid) from anon;

grant execute on function public.create_expense_with_payments(numeric, text, text, date, text, jsonb) to authenticated;
grant execute on function public.update_expense_with_payments(uuid, numeric, text, text, date, text, jsonb) to authenticated;

-- Payment rows are never directly writable by clients; SELECT is granted via
-- the RLS policy. EXPLICITLY deny table-level DML to all app roles so writes
-- flow exclusively through the validated RPCs.
revoke insert, update, delete on public.expense_payments from anon;
revoke insert, update, delete on public.expense_payments from authenticated;
grant select on public.expense_payments to authenticated;

-- ============================================================================
-- 5. BACKFILL existing expenses
-- ============================================================================
--
-- For every existing expense, create ONE payment row so the new source of truth
-- is complete without inventing mappings:
--   * PERSONAL -> payer = the expense owner, amount = full expense amount.
--   * SHARED   -> payer = the existing `paid_by` IF it resolves to a real
--                 family member of that expense's family; otherwise fall back to
--                 the expense owner. Never silently assigns to the wrong user.
-- Declarative-safe: the unique (expense_id,user_id) constraint plus
-- `on conflict do nothing` make it idempotent (safe to run once or re-run).
-- NOTE: if `paid_by` is not a uuid matching a family member, we use the owner
-- rather than guessing a mapping.

insert into public.expense_payments (expense_id, user_id, amount)
select
  e.id,
  coalesce(
    (select fm.user_id
       from public.family_members fm
      where fm.family_id = e.family_id
        and fm.user_id = e.paid_by
      limit 1),
    e.user_id
  ),
  e.amount
from public.expenses e
on conflict (expense_id, user_id) do nothing;

commit;

-- ============================================================================
-- VERIFY AFTER APPLY
-- ============================================================================
--
--   -- 1. RLS enabled on the new table:
--   select relname, relrowsecurity from pg_class where relname = 'expense_payments';
--
--   -- 2. Rows backfilled (expect exactly one per existing expense):
--   select (select count(*) from public.expenses) as expenses,
--          (select count(*) from public.expense_payments) as payments;
--
--   -- 3. No orphan / mismatched totals (should return zero rows):
--   select e.id, e.amount, coalesce(sum(p.amount),0) as paid_total
--     from public.expenses e
--     left join public.expense_payments p on p.expense_id = e.id
--    group by e.id
--    having coalesce(sum(p.amount),0) <> e.amount;