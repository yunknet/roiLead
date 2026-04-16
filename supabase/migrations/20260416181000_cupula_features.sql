-- Add delete policy for cupula leads
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cupula_leads' AND policyname = 'Owners can delete their cupula leads'
    ) THEN
        CREATE POLICY "Owners can delete their cupula leads"
        ON cupula_leads FOR DELETE
        TO authenticated
        USING (auth.uid() = owner_id);
    END IF;
END $$;

-- Create settings table for cupula
CREATE TABLE IF NOT EXISTS cupula_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    niche TEXT NOT NULL,
    column_id TEXT NOT NULL,
    custom_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(user_id, niche, column_id)
);

-- RLS for settings
ALTER TABLE cupula_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cupula_settings' AND policyname = 'Users can manage their own cupula settings'
    ) THEN
        CREATE POLICY "Users can manage their own cupula settings"
        ON cupula_settings FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
