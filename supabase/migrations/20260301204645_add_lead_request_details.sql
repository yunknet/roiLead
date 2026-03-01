ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS request_details TEXT;
