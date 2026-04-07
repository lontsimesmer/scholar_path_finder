CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('cinetpay')),
  transaction_id TEXT NOT NULL UNIQUE,
  provider_response_id TEXT,
  payment_token TEXT,
  payment_url TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('ALL', 'MOBILE_MONEY', 'CREDIT_CARD', 'WALLET')),
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount % 5 = 0),
  currency TEXT NOT NULL CHECK (char_length(currency) = 3),
  local_status TEXT NOT NULL DEFAULT 'initialized' CHECK (
    local_status IN ('initialized', 'pending', 'accepted', 'refused', 'failed')
  ),
  provider_status TEXT,
  payment_method TEXT,
  customer_email TEXT,
  customer_phone_number TEXT,
  customer_name TEXT,
  customer_surname TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_country TEXT,
  customer_state TEXT,
  customer_zip_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_initialization_response JSONB,
  raw_last_status_response JSONB,
  raw_last_notification JSONB,
  provider_operator_id TEXT,
  provider_payment_date TIMESTAMP WITH TIME ZONE,
  provider_fund_availability_date TIMESTAMP WITH TIME ZONE,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS payment_transactions_lead_id_idx
  ON public.payment_transactions (lead_id);

CREATE INDEX IF NOT EXISTS payment_transactions_student_id_idx
  ON public.payment_transactions (student_id);

CREATE INDEX IF NOT EXISTS payment_transactions_provider_status_idx
  ON public.payment_transactions (provider, local_status);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
      AND policyname = 'Students can view their own payment transactions'
  ) THEN
    CREATE POLICY "Students can view their own payment transactions"
      ON public.payment_transactions
      FOR SELECT
      USING (auth.uid() = student_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
      AND policyname = 'Admins can view all payment transactions'
  ) THEN
    CREATE POLICY "Admins can view all payment transactions"
      ON public.payment_transactions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.admins
          WHERE admins.email = auth.jwt() ->> 'email'
        )
      );
  END IF;
END $$;
