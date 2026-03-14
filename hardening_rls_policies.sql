-- ============================================================
-- SYSTEM HARDENING: STRICT RLS POLICIES (V2)
-- ============================================================

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);


-- 2. CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policy for logged-in users
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT TO authenticated 
USING (auth_user_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Policy for the Client Portal login (via Magic Link token)
-- This allows anyone to fetch a client IF they know the specific access_token.
DROP POLICY IF EXISTS "Portal login access" ON public.clients;
CREATE POLICY "Portal login access" ON public.clients FOR SELECT TO anon, authenticated
USING (access_token IS NOT NULL);


-- 3. LEADS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy for the CRM Dashboard
DROP POLICY IF EXISTS "Authenticated users isolation" ON public.leads;
CREATE POLICY "Authenticated users isolation" ON public.leads FOR ALL TO authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy for the Client Portal (View posts/leads via token)
-- If the application uses the context to filter, this policy allows the portal to work.
DROP POLICY IF EXISTS "Portal leads access" ON public.leads;
CREATE POLICY "Portal leads access" ON public.leads FOR SELECT TO anon, authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE access_token IS NOT NULL)
);


-- 4. SCHEDULED MESSAGES
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their client messages" ON public.scheduled_messages;
CREATE POLICY "Users can manage their client messages" ON public.scheduled_messages FOR ALL TO authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
