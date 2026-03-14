-- ============================================================
-- DATABASE PREPARATION (PRE-RLS HARDENING)
-- ============================================================

-- 1. SECURE RPC: get_portal_data
-- This function allows the Client Portal to fetch data securely.
-- Since it uses SECURITY DEFINER, it bypasses RLS policies.

CREATE OR REPLACE FUNCTION public.get_portal_data(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: Bypasses RLS to allow the portal to work
SET search_path = public
AS $$
DECLARE
    v_client_id UUID;
    v_client_name TEXT;
    v_result JSONB;
BEGIN
    -- 1. Validate the token and find the client
    SELECT id, name INTO v_client_id, v_client_name
    FROM public.clients
    WHERE access_token = p_token
    LIMIT 1;

    IF v_client_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Invalid or expired token.');
    END IF;

    -- 2. Build the result: Client info + Posts + Questions
    SELECT jsonb_build_object(
        'client', jsonb_build_object(
            'id', v_client_id,
            'name', v_client_name
        ),
        'posts', (
            SELECT jsonb_agg(p)
            FROM (
                SELECT *
                FROM public.tabela_projetofred1
                WHERE nome_cliente = v_client_name
                ORDER BY created_at DESC
                LIMIT 50
            ) p
        ),
        'questions', (
            SELECT jsonb_agg(q)
            FROM (
                SELECT *
                FROM public.interview_questions
                WHERE id_client = v_client_id
                AND status = 'pending'
                ORDER BY created_at DESC
                LIMIT 50
            ) q
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 2. LEGACY DATA MIGRATION
-- Use this to associate existing clients with your user ID.
-- Replace 'SUBSTITUTE_WITH_YOUR_UUID' with your actual User ID 
-- (You can find it in the Supabase Dashboard -> Authentication -> Users).

-- UPDATE public.clients 
-- SET auth_user_id = 'SUBSTITUTE_WITH_YOUR_UUID'
-- WHERE auth_user_id IS NULL;

-- ALTERNATIVE (If you are the only user or want to associate all to the current auth user):
-- UPDATE public.clients 
-- SET auth_user_id = auth.uid()
-- WHERE auth_user_id IS NULL;

COMMENT ON FUNCTION public.get_portal_data(TEXT) IS 'Securely fetches client and lead data for the portal using an access token.';
