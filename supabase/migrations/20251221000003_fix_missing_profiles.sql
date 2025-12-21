-- Migration to fix missing profiles for existing auth users
-- This script backfills public.profiles from auth.users for any users that are missing.

DO $$
DECLARE
    user_record record;
BEGIN
    FOR user_record IN
        SELECT * FROM auth.users
        WHERE id NOT IN (SELECT id FROM public.profiles)
    LOOP
        INSERT INTO public.profiles (
            id,
            email,
            phone_number,
            first_name,
            last_name,
            created_at,
            updated_at,
            email_verified
        )
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data ->> 'phone', ''),
            COALESCE(user_record.raw_user_meta_data ->> 'first_name', ''),
            COALESCE(user_record.raw_user_meta_data ->> 'last_name', ''),
            user_record.created_at,
            now(),
            (user_record.email_confirmed_at IS NOT NULL)
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END;
$$;
