-- 1. Create or ensure profiles table exists
create table if not exists public.profiles (
  id uuid not null,
  phone_number text not null,
  email text not null,
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Safely add columns if they don't exist
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists access_status text default 'NEW';
alter table public.profiles add column if not exists payment_status text default 'NONE';
alter table public.profiles add column if not exists subscription_id text;
alter table public.profiles add column if not exists subscription_expiration timestamp with time zone;
alter table public.profiles add column if not exists usage_quota integer default 0;
alter table public.profiles add column if not exists usage_consumed integer default 0;
alter table public.profiles add column if not exists current_step text default 'start';
alter table public.profiles add column if not exists created_at timestamp with time zone default now();
alter table public.profiles add column if not exists updated_at timestamp with time zone default now();
alter table public.profiles add column if not exists email_verified boolean default false;
alter table public.profiles add column if not exists currency text default 'BRL';

-- 2. Create Types Safely
DO $$ BEGIN
    CREATE TYPE public.access_status_enum AS ENUM ('NEW', 'ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status_enum AS ENUM ('NONE', 'PENDING', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Fix Column Types
ALTER TABLE public.profiles ALTER COLUMN access_status TYPE public.access_status_enum USING access_status::public.access_status_enum;
ALTER TABLE public.profiles ALTER COLUMN payment_status TYPE public.payment_status_enum USING payment_status::public.payment_status_enum;

-- 4. Helper Function for Updated At
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- 6. Function to handle new user AND FORCE EMAIL CONFIRMATION
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Insert into profiles
  insert into public.profiles (id, email, phone_number, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone_number = excluded.phone_number;
    
  -- FORCE CONFIRM EMAIL (Hack to bypass confirmation requirement)
  update auth.users
  set email_confirmed_at = now()
  where id = new.id;
  
  return new;
end;
$$;

-- 7. Trigger on Auth Users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Policies
alter table public.profiles enable row level security;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- 9. ONE-TIME FIX: Confirm all existing users
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;

-- 10. Backfill missing profiles
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
