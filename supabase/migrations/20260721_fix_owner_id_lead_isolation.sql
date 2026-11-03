
-- Migration: Fix CRE lead isolation (owner_id not being set by claim triggers)
-- Date: 2026-07-21
--
-- PROBLEM:
-- RLS policy on `leads` table (leads_allow_select) checks `owner_id` (uuid, compared
-- against auth.uid()), but the claim-on-first-action triggers were only setting
-- `assigned_to` (text, storing employees.id) and never touched `owner_id`.
-- Result: owner_id stayed NULL for every lead forever, so the RLS clause
-- "owner_id IS NULL" was always true -> every CRE could see every lead,
-- regardless of who claimed it. CRE1/CRE2/Admin isolation was not enforced.
--
-- FIX:
-- Update both trigger functions to also set owner_id = auth.uid() when a lead
-- is claimed (first update after being unassigned), so it lines up with what
-- the RLS SELECT policy actually checks.
--
-- After running this, a one-time backfill was also run in production to set
-- owner_id for already-claimed historical leads (see backfill query below).

-- 1. Fix claim_lead_on_update()
create or replace function claim_lead_on_update()
returns trigger as $$
begin
  if old.assigned_to is null and new.assigned_to is null then
    new.assigned_to := get_my_employee_id()::text;
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql;

-- 2. Fix auto_assign_lead()
create or replace function auto_assign_lead()
returns trigger as $$
declare
  emp_id uuid;
begin
  if OLD.assigned_to is null then
    emp_id := public.current_employee_id();
    if emp_id is not null then
      NEW.assigned_to := emp_id;
      NEW.owner_id := auth.uid();
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- 3. One-time backfill: populate owner_id for leads that were already
--    claimed (assigned_to set) before this fix existed.
--    Safe to re-run — only touches rows where owner_id is still NULL.
update leads l
set owner_id = e.user_id
from employees e
where l.assigned_to is not null
  and l.assigned_to != ''
  and l.owner_id is null
  and e.id = l.assigned_to::uuid;
