-- ============================================================
-- RLS Policy: Allow authenticated users to UPDATE leads
-- Needed for the front-end "mark as read" feature (unread_count)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Make sure RLS is enabled on the leads table (it likely already is)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 2. Drop the policy if it already exists (safe to re-run)
DROP POLICY IF EXISTS "Allow authenticated users to update leads" ON public.leads;

-- 3. Create the UPDATE policy for authenticated users
--    USING: which rows the user is allowed to UPDATE (row-level filter)
--    WITH CHECK: which values are allowed to be written
CREATE POLICY "Allow authenticated users to update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- ALTERNATIVE (more restrictive): only allow updating leads
-- that belong to the authenticated user's client accounts.
-- Use this if you have a user_id or client_id relation to auth.uid().
-- ============================================================
-- CREATE POLICY "Allow users to update their own client leads"
-- ON public.leads
-- FOR UPDATE
-- TO authenticated
-- USING (client_id IN (
--   SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
-- ))
-- WITH CHECK (client_id IN (
--   SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
-- ));
