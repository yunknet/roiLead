-- =============================================
-- CUPULA ROUND-ROBIN & FULL NAME MIGRATION
-- =============================================

-- 1. Add full_name column to cupula_access
ALTER TABLE cupula_access ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Add assigned_to column to cupula_leads (backend round-robin assignment)
ALTER TABLE cupula_leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- 3. Add assigned_at timestamp to track when each lead was assigned
ALTER TABLE cupula_leads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- 4. Create index for faster queue lookups
CREATE INDEX IF NOT EXISTS idx_cupula_leads_assigned_to ON cupula_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cupula_leads_status ON cupula_leads(status);

-- 5. Allow all authenticated users to read cupula_access (for the queue display)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cupula_access' AND policyname = 'Authenticated users can read cupula_access'
    ) THEN
        CREATE POLICY "Authenticated users can read cupula_access"
        ON cupula_access FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;
