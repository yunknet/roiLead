-- Remove unique constraint from phone_number to allow testing with same phone
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_number_key;
