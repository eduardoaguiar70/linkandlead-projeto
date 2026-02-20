-- ============================================================
-- Migration: create account_sync_status table
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.account_sync_status (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id    integer     NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    account_id   text        NOT NULL,
    status       text        NOT NULL DEFAULT 'idle'
                               CHECK (status IN ('idle', 'running', 'completed', 'error')),
    started_at   timestamptz,
    completed_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_account_sync_status_client_id
    ON public.account_sync_status (client_id);

CREATE INDEX IF NOT EXISTS idx_account_sync_status_status
    ON public.account_sync_status (status);

-- Enable Row-Level Security
ALTER TABLE public.account_sync_status ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated clients may only see and edit their own rows.
-- Uses the integer client_id stored in the profiles table.
CREATE POLICY "Clients see own sync status"
    ON public.account_sync_status
    FOR ALL
    USING (
        client_id = (
            SELECT client_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        client_id = (
            SELECT client_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Service-role bypass for n8n (optional: allow n8n to update status without RLS)
-- Uncomment if n8n uses the service role key:
-- CREATE POLICY "Service role full access"
--     ON public.account_sync_status
--     FOR ALL
--     TO service_role
--     USING (true)
--     WITH CHECK (true);
