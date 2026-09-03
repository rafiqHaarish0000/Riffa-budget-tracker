-- RIFAA Security Verification SQL
--
-- READ-ONLY / NON-DESTRUCTIVE
-- Run in Supabase SQL Editor.

-- ============================================================
-- 1. TABLES THAT SHOULD HAVE RLS ENABLED
-- ============================================================

select
  relname,
  relrowsecurity,
  relforcerowsecurity
from pg_class
where relname in (
  'users',
  'families',
  'family_members',
  'expenses',
  'savings_goals',
  'savings_contributions',
  'notifications',
  'push_tokens'
)
and relkind = 'r'
order by relname;


-- ============================================================
-- 2. RLS POLICIES
-- ============================================================

select
  c.relname as table_name,
  pol.polname as policy_name,
  case pol.polcmd
    when 'r' then 'SELECT'
    when 'a' then 'INSERT'
    when 'w' then 'UPDATE'
    when 'd' then 'DELETE'
    when '*' then 'ALL'
  end as command,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
from pg_policy pol
join pg_class c
  on c.oid = pol.polrelid
where c.relname in (
  'users',
  'families',
  'family_members',
  'expenses',
  'savings_goals',
  'savings_contributions',
  'notifications',
  'push_tokens'
)
order by c.relname, pol.polname;


-- ============================================================
-- 3. FUNCTIONS / RPCs
-- ============================================================

select
  p.proname,
  pg_get_function_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer,
  left(p.prosrc, 400) as body_preview
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
and p.proname in (
  'create_family',
  'join_family',
  'leave_family',
  'add_savings_contribution',
  'notify_family',
  'notify_shared_expense',
  'notify_savings_contribution',
  'handle_new_user',
  'is_family_member',
  'set_updated_at'
)
order by p.proname;


-- ============================================================
-- 4. FUNCTION EXECUTE GRANTS
-- ============================================================

select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  g.grantee,
  g.privilege_type
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
join (
  select oid, proacl
  from pg_proc
) pa
  on pa.oid = p.oid,
  aclexplode(p.proacl) g
where n.nspname = 'public'
and p.proname in (
  'create_family',
  'join_family',
  'leave_family',
  'add_savings_contribution',
  'notify_family',
  'notify_shared_expense',
  'notify_savings_contribution',
  'handle_new_user',
  'is_family_member'
)
and g.grantee::text in (
  'public',
  'anon',
  'authenticated'
)
order by p.proname, g.grantee;


-- ============================================================
-- 5. TRIGGERS
-- ============================================================

select
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
from pg_trigger
where tgrelid = 'auth.users'::regclass
   or tgrelid = 'public.push_tokens'::regclass;


-- ============================================================
-- 6. STORAGE - AVATARS BUCKET
-- ============================================================

select
  id,
  name,
  public as is_public
from storage.buckets
where id = 'avatars';


-- Storage object-level policies for avatars

select
  pol.polname as policy_name,
  pol.polcmd as command,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
from pg_policy pol
join pg_class c
  on c.oid = pol.polrelid
where c.oid = 'storage.objects'::regclass
and (
  pg_get_expr(pol.polqual, pol.polrelid) ilike '%avatars%'
  or
  pg_get_expr(pol.polwithcheck, pol.polrelid) ilike '%avatars%'
);


-- ============================================================
-- 7. CHECK CONSTRAINTS
-- ============================================================

select
  conrelid::regclass as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.expenses'::regclass
   or conrelid = 'public.savings_goals'::regclass
   or conrelid = 'public.savings_contributions'::regclass
   or conrelid = 'public.notifications'::regclass;