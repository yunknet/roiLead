-- ===============================
-- TYPES
-- ===============================

CREATE TYPE payment_status_type AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE subscription_status_type AS ENUM ('inactive', 'active', 'suspended');

-- ===============================
-- TABLE
-- ===============================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Status
    payment_status payment_status_type NOT NULL DEFAULT 'pending',
    subscription_status subscription_status_type NOT NULL DEFAULT 'inactive',

    -- User info (post-payment)
    full_name TEXT,
    email TEXT,
    phone_number TEXT,

    -- Verification
    email_verified BOOLEAN NOT NULL DEFAULT false,
    phone_verified BOOLEAN NOT NULL DEFAULT false,

    -- Payment tracking
    external_reference_id UUID NOT NULL,
    abacate_billing_id TEXT,
    plan_name TEXT,
    amount_paid NUMERIC(10,2)
);

-- ===============================
-- CONSTRAINTS & INDEXES
-- ===============================

-- External reference must be unique (CRITICAL)
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_external_reference_unique
UNIQUE (external_reference_id);

-- Unique email only when present
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_email
ON public.subscriptions (email)
WHERE email IS NOT NULL;

-- Unique phone only when present
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_phone
ON public.subscriptions (phone_number)
WHERE phone_number IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_phone
ON public.subscriptions (phone_number);

CREATE INDEX IF NOT EXISTS idx_subscriptions_reference
ON public.subscriptions (external_reference_id);

-- ===============================
-- UPDATED_AT TRIGGER
-- ===============================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- ROW LEVEL SECURITY
-- ===============================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Remove insecure policy if exists
DROP POLICY IF EXISTS "Public read by reference" ON public.subscriptions;

-- Secure read policy (used only if needed)
-- RECOMMENDED: use Edge Functions instead of direct SELECT
CREATE POLICY "Read own subscription by reference"
ON public.subscriptions
FOR SELECT
USING (
  external_reference_id::text =
  (current_setting('request.jwt.claims', true)::json ->> 'external_reference_id')
);