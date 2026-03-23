-- ============================================================
-- FIX TARGET: CONTENT LIBRARY VISIBILITY
-- ============================================================
-- Description: Updates the RLS policies for the content_library table
-- so that users can view contents that belong to their assigned clients,
-- or global contents (where client_id IS NULL), alongside contents they created.

-- 1. Ensure RLS is enabled
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- 2. Drop the old restrictive SELECT policy if it exists
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own content" ON public.content_library;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- 3. Create a more robust generic policy for viewing content
-- Users can view content if:
-- A) The content has no client_id (Global material)
-- B) The content belongs to a client assigned to the logged-in user
-- C) The user is an admin
-- D) The user created the content themselves
CREATE POLICY "Users can view content_library"
ON public.content_library FOR SELECT
TO authenticated
USING (
    client_id IS NULL
    OR client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
    OR (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid())
    OR auth.uid() = user_id
);

-- 4. Create policies for managing content (Insert/Update/Delete)
-- We keep these restrictive to creators or admins, but ensure admins can manage everything
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert own content" ON public.content_library;
    DROP POLICY IF EXISTS "Users can update own content" ON public.content_library;
    DROP POLICY IF EXISTS "Users can delete own content" ON public.content_library;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

CREATE POLICY "Admins and creators can insert content"
ON public.content_library FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    OR (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins and creators can update content"
ON public.content_library FOR UPDATE
USING (
    auth.uid() = user_id 
    OR (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
    auth.uid() = user_id 
    OR (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins and creators can delete content"
ON public.content_library FOR DELETE
USING (
    auth.uid() = user_id 
    OR (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid())
);

COMMIT;
