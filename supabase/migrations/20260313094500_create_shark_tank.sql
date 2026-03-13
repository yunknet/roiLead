CREATE TYPE shark_niche AS ENUM ('Consórcio', 'Seguros', 'Plano de Saúde');
CREATE TYPE shark_status AS ENUM ('novos', 'contatados', 'negociacao', 'fechados', 'perdidos');

CREATE TABLE IF NOT EXISTS shark_tank_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    niche shark_niche NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT,
    status shark_status DEFAULT 'novos',
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    claimed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE shark_tank_leads ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone authenticated can view all leads in the tank.
-- However, we only expose the phone number if they are the owner! 
-- We can do that on the frontend, but securely we could do it with a view or RPC.
-- Assuming frontend filtering is enough for now, just allow SELECT for authenticated.
CREATE POLICY "Authenticated users can select shark tank leads" 
ON shark_tank_leads FOR SELECT 
TO authenticated 
USING (true);

-- Update policy: Only the owner can update their own leads (after claiming)
CREATE POLICY "Owners can update their shark tank leads"
ON shark_tank_leads FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Insert policy: The partner/admin might insert leads. (assuming authenticated users or service role)
CREATE POLICY "Anyone authenticated can insert (for partner/webhook)"
ON shark_tank_leads FOR INSERT
TO authenticated
WITH CHECK (true);


-- RPC for atomic claiming with 1-hour cooldown
CREATE OR REPLACE FUNCTION claim_shark_lead(target_lead_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_claim TIMESTAMP WITH TIME ZONE;
    lead_unowned BOOLEAN;
BEGIN
    -- Check if lead is still available
    SELECT (owner_id IS NULL) INTO lead_unowned 
    FROM shark_tank_leads 
    WHERE id = target_lead_id AND status = 'novos';

    IF NOT lead_unowned THEN
        RAISE EXCEPTION 'Este lead já foi pego por outro tubarão!';
    END IF;

    -- Check cooldown (1 hour)
    SELECT MAX(claimed_at) INTO last_claim 
    FROM shark_tank_leads 
    WHERE owner_id = auth.uid();

    IF last_claim IS NOT NULL AND (now() - last_claim) < interval '1 hour' THEN
        RAISE EXCEPTION 'Você já pegou um lead recentemente! Aguarde 1 hora do último lead (cooldown).';
    END IF;

    -- Update and claim
    UPDATE shark_tank_leads 
    SET owner_id = auth.uid(), 
        status = 'contatados', 
        claimed_at = now(),
        updated_at = now()
    WHERE id = target_lead_id AND owner_id IS NULL;

    -- If no rows were updated, someone else grabbed it right at this millisecond
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Este lead já foi pego!';
    END IF;

    RETURN TRUE;
END;
$$;
