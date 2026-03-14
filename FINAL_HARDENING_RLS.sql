-- ============================================================
-- FINAL SYSTEM HARDENING: ROW LEVEL SECURITY (RLS)
-- ============================================================
-- IMPORTANT: This script locks down the database. 
-- Only logged-in users and admins can access data.
-- Anonymous access is now ONLY possible via secure RPC functions.

-- 0. HELPER FUNCTION: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_projetofred1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

-- 2. CLEAN UP OLD POLICIES (Safety check)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ============================================================
-- 3. DEFINE NEW POLICIES (Strictly Authenticated + Admin)
-- ============================================================

-- PROFILES
CREATE POLICY "Users can see their own profile or all if admin"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR is_admin());

CREATE POLICY "Users can update their own profile or all if admin"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR is_admin())
WITH CHECK (id = auth.uid() OR is_admin());

-- CLIENTS
CREATE POLICY "Users can manage their own clients or all if admin"
ON public.clients FOR ALL
TO authenticated
USING (auth_user_id = auth.uid() OR is_admin())
WITH CHECK (auth_user_id = auth.uid() OR is_admin());

-- LEADS
CREATE POLICY "Users can access leads of their clients or all if admin"
ON public.leads FOR ALL
TO authenticated
USING (
    client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()) 
    OR is_admin()
);

-- SCHEDULED MESSAGES
CREATE POLICY "Users can manage scheduled messages of their clients or admin"
ON public.scheduled_messages FOR ALL
TO authenticated
USING (
    client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()) 
    OR is_admin()
);

-- POSTS (tabela_projetofred1)
CREATE POLICY "Users can manage posts of their clients or admin"
ON public.tabela_projetofred1 FOR ALL
TO authenticated
USING (
    nome_cliente IN (SELECT name FROM public.clients WHERE auth_user_id = auth.uid()) 
    OR is_admin()
);

-- POST COMMENTS
CREATE POLICY "Users can manage comments for their posts or admin"
ON public.post_comments FOR ALL
TO authenticated
USING (
    post_id IN (
        SELECT id FROM public.tabela_projetofred1 
        WHERE nome_cliente IN (SELECT name FROM public.clients WHERE auth_user_id = auth.uid())
    ) 
    OR is_admin()
);

-- INTERVIEW QUESTIONS
CREATE POLICY "Users can manage questions of their clients or admin"
ON public.interview_questions FOR ALL
TO authenticated
USING (
    id_client IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()) 
    OR is_admin()
);

-- 4. STORAGE ACCESS (Bonus Hardening)
-- Ensure storage follows the same authenticated pattern
-- (Optional, requires storage bucket knowledge, but recommended)

COMMIT;

-- FINAL SUMMARY:
-- - RLS: Enabled
-- - Public Access: Blocked (except via RPC)
-- - Admin Access: Full
-- - User Access: Limited to their assigned clients (via auth_user_id)
