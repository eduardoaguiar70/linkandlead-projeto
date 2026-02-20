-- ============================================================
-- Migration: create history_sync_progress table
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.history_sync_progress (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id    integer     NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
    status       text        NOT NULL DEFAULT 'idle'
                               CHECK (status IN ('idle', 'running', 'completed', 'cancelled', 'error')),
    total_leads  integer     DEFAULT 0,
    processed    integer     DEFAULT 0,
    failures     integer     DEFAULT 0,
    started_at   timestamptz,
    completed_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_history_sync_progress_client_id
    ON public.history_sync_progress (client_id);

-- Enable Row-Level Security
ALTER TABLE public.history_sync_progress ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated clients may only see and edit their own rows
CREATE POLICY "Clients see own sync progress"
    ON public.history_sync_progress
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
