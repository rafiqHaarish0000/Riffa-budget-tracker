-- ============================================================================
-- 0005: family_members family-scoped SELECT policy
--
-- Fixes the Add Expense → Shared → "Paid by" flow, where `useFamily()` returns
-- an empty members array even though the authenticated user belongs to a family.
--
-- ROOT CAUSE
--   The client query is correct: `family_members WHERE family_id = auth.family`
--   (see hooks/useFamily.ts). The user's `public.users.family_id` is populated
--   after joining. The missing members are caused by the deployed
--   `family_members` SELECT policy not allowing a regular authenticated family
--   member to read their own family's rows, so the query returns zero rows
--   (no error, just empty).
--
--   The SQL Editor shows 0 rows but no error — a classic "policy silently
--   blocks the read" result rather than a data/migration problem.
--
-- FIX (uses the EXISTING family-scoped security model)
--   Allow an authenticated member to SELECT only the rows of the family they
--   belong to. The family id is resolved from the caller's own
--   `public.users.family_id` row (not from a second table-wide lookup on
--   family_members), which avoids a circular self-reference inside RLS and
--   does NOT broadly expose the table.
--
-- SECURITY
--   - RLS remains ENABLED (NOT FORCED) on family_members. FORCE ROW LEVEL
--     SECURITY is intentionally NOT used: `create_family()` / `join_family()`
--     are SECURITY DEFINER functions whose owner inserts/updates family_members
--     rows as the table owner and rely on the owner bypassing RLS. Forcing RLS
--     would subject those writes to row policies (none exist for the owner) and
--     break family onboarding — while providing no benefit for this SELECT fix.
--   - Only `authenticated` role can read, and only rows whose family matches
--     the caller's own family.
--   - No other tables/columns are exposed; INSERT/UPDATE/DELETE stay via the
--     existing SECURITY DEFINER RPCs.
-- ============================================================================

-- Keep RLS enabled but DO NOT force it (see note above). Idempotent so the fix
-- can be re-run safely against any deployed state.
alter table public.family_members enable row level security;

-- Refresh the read rows that belong to the caller's own family.
drop policy if exists "family_members_select_own_family" on public.family_members;
create policy "family_members_select_own_family"
  on public.family_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.family_id = public.family_members.family_id
    )
  );
