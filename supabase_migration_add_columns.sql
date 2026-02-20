
-- Migration to add cadence_stage and message_count to leads table if missing

-- Add cadence_stage column
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS cadence_stage TEXT DEFAULT 'G1';

-- Add message_count column
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Optional: Create an index for performance if needed
CREATE INDEX IF NOT EXISTS idx_leads_cadence_stage ON leads(cadence_stage);
