-- 1. Create the private vault table
CREATE TABLE IF NOT EXISTS public.cupula_leads_private (
    lead_id UUID PRIMARY KEY REFERENCES public.cupula_leads(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS on the private table
ALTER TABLE public.cupula_leads_private ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Only the owner of the lead can view the private data
CREATE POLICY "Cofre visível apenas para o dono"
ON public.cupula_leads_private
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cupula_leads 
        WHERE id = cupula_leads_private.lead_id 
        AND owner_id = auth.uid()
    )
);

-- 4. Create Policy: Allow inserts/updates via security definer trigger or admins
-- The trigger runs as SECURITY DEFINER, so it bypasses RLS for inserting.
-- We don't need to grant direct INSERT/UPDATE to authenticated users.

-- 5. Backfill existing data BEFORE attaching the trigger
-- This copies all existing phones and notes to the vault
INSERT INTO public.cupula_leads_private (lead_id, phone, notes)
SELECT id, phone, notes 
FROM public.cupula_leads
WHERE phone IS NOT NULL OR notes IS NOT NULL
ON CONFLICT (lead_id) DO NOTHING;

-- 5.5. Remove a restrição NOT NULL para permitir salvar NULL na tabela pública
ALTER TABLE public.cupula_leads ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.cupula_leads ALTER COLUMN notes DROP NOT NULL;

-- 6. Clean up the public table for ALL leads
-- This is safe because we just copied them to the vault.
UPDATE public.cupula_leads
SET phone = NULL, notes = NULL
WHERE phone IS NOT NULL OR notes IS NOT NULL;

-- 7. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.protect_cupula_leads_data()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
    -- If there's sensitive data trying to be saved in the public table
    IF NEW.phone IS NOT NULL OR NEW.notes IS NOT NULL THEN
        -- Safely store it in the private vault
        INSERT INTO public.cupula_leads_private (lead_id, phone, notes)
        VALUES (NEW.id, NEW.phone, NEW.notes)
        ON CONFLICT (lead_id) DO UPDATE 
        SET phone = EXCLUDED.phone, 
            notes = EXCLUDED.notes,
            updated_at = timezone('utc'::text, now());
        
        -- Erase from the public row before it hits the table
        NEW.phone := NULL;
        NEW.notes := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Attach the trigger to cupula_leads
DROP TRIGGER IF EXISTS trg_protect_cupula_leads_data ON public.cupula_leads;
CREATE TRIGGER trg_protect_cupula_leads_data
    BEFORE INSERT OR UPDATE ON public.cupula_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_cupula_leads_data();
