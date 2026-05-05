-- Flyway baseline migration for Power Prestation.
-- This file replaces the former timestamped Supabase migrations with a single source of truth.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'follow_up', 'completed', 'expired')),
  payment_id TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (
    payment_status = ANY (
      ARRAY[
        'unpaid'::text,
        'paid'::text,
        'refunded'::text,
        'pending'::text,
        'mobile_money_pending'::text,
        'bank_transfer_pending'::text
      ]
    )
  ),
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only service role can read leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "No public updates allowed" ON public.leads;
DROP POLICY IF EXISTS "No public deletes allowed" ON public.leads;
DROP POLICY IF EXISTS "No direct public inserts allowed" ON public.leads;

CREATE POLICY "Only service role can read leads"
ON public.leads
FOR SELECT
USING (false);

CREATE POLICY "Admins can view all leads"
ON public.leads
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
);

CREATE POLICY "No public updates allowed"
ON public.leads
AS RESTRICTIVE
FOR UPDATE
USING (false);

CREATE POLICY "No public deletes allowed"
ON public.leads
AS RESTRICTIVE
FOR DELETE
USING (false);

CREATE POLICY "No direct public inserts allowed"
ON public.leads
FOR INSERT
WITH CHECK (false);

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS leads_email_idx
  ON public.leads (lower(email));

CREATE INDEX IF NOT EXISTS leads_payment_status_updated_at_idx
  ON public.leads (payment_status, updated_at DESC);

INSERT INTO public.admins (email) VALUES ('toubi.prestation@gmail.com') ON CONFLICT DO NOTHING;
INSERT INTO public.admins (email) VALUES ('powerprestationint@gmail.com') ON CONFLICT DO NOTHING;
INSERT INTO public.admins (email) VALUES ('admin@powerprestation.com') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by TEXT
);

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'checkout.consultation_price',
  '{"amount_xaf": 15625, "currency": "XAF", "usd_reference": 25}'::jsonb,
  'Consultation checkout price used by CinetPay.'
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;

CREATE POLICY "Admins can manage app settings"
  ON public.app_settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Allow admin all access on categories" ON public.blog_categories;

CREATE POLICY "Allow public read access on categories" ON public.blog_categories
  FOR SELECT USING (true);

CREATE POLICY "Allow admin all access on categories" ON public.blog_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_fr TEXT NOT NULL,
  slug_fr TEXT NOT NULL,
  content_fr TEXT NOT NULL,
  excerpt_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  slug_en TEXT NOT NULL,
  content_en TEXT NOT NULL,
  excerpt_en TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_fr_unique_idx
  ON public.blog_posts (slug_fr);

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_en_unique_idx
  ON public.blog_posts (slug_en);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;

CREATE POLICY "Public can read published posts" ON public.blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage all posts" ON public.blog_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_title_fr_not_blank'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_title_fr_not_blank CHECK (btrim(title_fr) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_slug_fr_not_blank'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_slug_fr_not_blank CHECK (btrim(slug_fr) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_content_fr_not_blank'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_content_fr_not_blank CHECK (btrim(content_fr) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_excerpt_fr_not_blank'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_excerpt_fr_not_blank CHECK (btrim(excerpt_fr) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_title_en_not_blank'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_title_en_not_blank CHECK (btrim(title_en) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_slug_en_not_blank'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_slug_en_not_blank CHECK (btrim(slug_en) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_content_en_not_blank'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_content_en_not_blank CHECK (btrim(content_en) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_excerpt_en_not_blank'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_excerpt_en_not_blank CHECK (btrim(excerpt_en) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_image_url_not_blank'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_image_url_not_blank CHECK (btrim(image_url) <> '');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE public.application_status AS ENUM (
      'consultation_paid',
      'profile_evaluation',
      'university_selection',
      'application_submitted',
      'admission_received',
      'visa_processing',
      'visa_granted',
      'completed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  current_degree TEXT,
  target_country TEXT,
  target_program TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  profile_locked_at TIMESTAMP WITH TIME ZONE,
  profile_validation_comment TEXT,
  profile_invalidated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_phone_number_unique_idx
ON public.student_profiles ((regexp_replace(phone_number, '[^0-9]+', '', 'g')))
WHERE phone_number IS NOT NULL AND btrim(phone_number) <> '';

CREATE INDEX IF NOT EXISTS student_profiles_email_idx
  ON public.student_profiles (lower(email))
  WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE TABLE IF NOT EXISTS public.student_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.application_status DEFAULT 'consultation_paid' NOT NULL,
  notes TEXT,
  assigned_advisor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT student_applications_student_id_key UNIQUE (student_id)
);

CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.student_applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.student_documents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE INDEX IF NOT EXISTS student_documents_student_id_status_updated_at_idx
  ON public.student_documents (student_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.student_document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.student_applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  requested_by TEXT,
  fulfilled_document_id UUID REFERENCES public.student_documents(id) ON DELETE SET NULL,
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS student_document_requests_student_id_idx
  ON public.student_document_requests (student_id, status, created_at DESC);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_document_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can insert their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update their own unlocked profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Admins can insert all profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view their own applications" ON public.student_applications;
DROP POLICY IF EXISTS "Admins can view and update all applications" ON public.student_applications;
DROP POLICY IF EXISTS "Students can view their own documents" ON public.student_documents;
DROP POLICY IF EXISTS "Students can upload their own documents" ON public.student_documents;
DROP POLICY IF EXISTS "Students can replace their own rejected documents" ON public.student_documents;
DROP POLICY IF EXISTS "Admins can view and update all documents" ON public.student_documents;
DROP POLICY IF EXISTS "Students can view their own document requests" ON public.student_document_requests;
DROP POLICY IF EXISTS "Students can update their own document requests" ON public.student_document_requests;
DROP POLICY IF EXISTS "Students can fulfill their own pending document requests" ON public.student_document_requests;
DROP POLICY IF EXISTS "Admins can manage all document requests" ON public.student_document_requests;

CREATE POLICY "Students can view their own profile" ON public.student_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Students can insert their own profile" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Students can update their own unlocked profile" ON public.student_profiles
  FOR UPDATE
  USING (auth.uid() = id AND profile_locked_at IS NULL)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.student_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Admins can update all profiles" ON public.student_profiles
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Admins can insert all profiles" ON public.student_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Students can view their own applications" ON public.student_applications
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Admins can view and update all applications" ON public.student_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Students can view their own documents" ON public.student_documents
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can upload their own documents" ON public.student_documents
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can replace their own rejected documents" ON public.student_documents
  FOR UPDATE
  USING (auth.uid() = student_id AND status = 'rejected')
  WITH CHECK (auth.uid() = student_id AND status = 'pending');

CREATE POLICY "Admins can view and update all documents" ON public.student_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Students can view their own document requests" ON public.student_document_requests
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can fulfill their own pending document requests" ON public.student_document_requests
  FOR UPDATE
  USING (auth.uid() = student_id AND status = 'pending')
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'fulfilled'
    AND fulfilled_document_id IS NOT NULL
    AND fulfilled_at IS NOT NULL
  );

CREATE POLICY "Admins can manage all document requests" ON public.student_document_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

CREATE OR REPLACE FUNCTION public.prevent_unsafe_student_document_update()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() <> OLD.student_id THEN
    RAISE EXCEPTION 'Student document update is not allowed for this user.';
  END IF;

  IF OLD.status <> 'rejected' OR NEW.status <> 'pending' THEN
    RAISE EXCEPTION 'Students can only replace rejected documents.';
  END IF;

  IF NEW.id <> OLD.id
    OR NEW.student_id <> OLD.student_id
    OR NEW.application_id IS DISTINCT FROM OLD.application_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Document ownership fields are immutable for students.';
  END IF;

  IF NEW.admin_feedback IS NOT NULL THEN
    RAISE EXCEPTION 'Admin feedback must be cleared when replacing a rejected document.';
  END IF;

  IF btrim(NEW.title) = '' OR btrim(NEW.file_path) = '' THEN
    RAISE EXCEPTION 'Document title and file path are required.';
  END IF;

  IF NEW.file_path NOT LIKE OLD.student_id::text || '/%' THEN
    RAISE EXCEPTION 'Document file path must belong to the student.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_unsafe_student_document_request_update()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() <> OLD.student_id THEN
    RAISE EXCEPTION 'Student document request update is not allowed for this user.';
  END IF;

  IF OLD.status <> 'pending' OR NEW.status <> 'fulfilled' THEN
    RAISE EXCEPTION 'Students can only fulfill pending document requests.';
  END IF;

  IF NEW.id <> OLD.id
    OR NEW.student_id <> OLD.student_id
    OR NEW.application_id IS DISTINCT FROM OLD.application_id
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Document request fields are immutable for students.';
  END IF;

  IF NEW.fulfilled_document_id IS NULL OR NEW.fulfilled_at IS NULL THEN
    RAISE EXCEPTION 'Fulfilled document details are required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.student_documents
    WHERE student_documents.id = NEW.fulfilled_document_id
      AND student_documents.student_id = OLD.student_id
  ) THEN
    RAISE EXCEPTION 'Fulfilled document must belong to the student.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON public.student_profiles;
DROP TRIGGER IF EXISTS update_student_applications_updated_at ON public.student_applications;
DROP TRIGGER IF EXISTS update_student_documents_updated_at ON public.student_documents;
DROP TRIGGER IF EXISTS prevent_unsafe_student_document_update ON public.student_documents;
DROP TRIGGER IF EXISTS update_student_document_requests_updated_at ON public.student_document_requests;
DROP TRIGGER IF EXISTS prevent_unsafe_student_document_request_update ON public.student_document_requests;

CREATE TRIGGER update_student_profiles_updated_at
BEFORE UPDATE ON public.student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_applications_updated_at
BEFORE UPDATE ON public.student_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_documents_updated_at
BEFORE UPDATE ON public.student_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER prevent_unsafe_student_document_update
BEFORE UPDATE ON public.student_documents
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unsafe_student_document_update();

CREATE TRIGGER update_student_document_requests_updated_at
BEFORE UPDATE ON public.student_document_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER prevent_unsafe_student_document_request_update
BEFORE UPDATE ON public.student_document_requests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unsafe_student_document_request_update();

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Students can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents in storage" ON storage.objects;

CREATE POLICY "Students can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all documents in storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-documents' AND
  EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
);

CREATE TABLE IF NOT EXISTS public.student_contact_verifications (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  email_verification_required BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  sms_verification_required BOOLEAN NOT NULL DEFAULT false,
  sms_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.student_contact_verification_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  code_hash TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS student_contact_verification_challenges_user_channel_idx
  ON public.student_contact_verification_challenges (user_id, channel, created_at DESC);

ALTER TABLE public.student_contact_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_contact_verification_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all contact verifications" ON public.student_contact_verifications;
DROP POLICY IF EXISTS "Admins can view all verification challenges" ON public.student_contact_verification_challenges;

CREATE POLICY "Admins can view all contact verifications"
  ON public.student_contact_verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can view all verification challenges"
  ON public.student_contact_verification_challenges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

DROP TRIGGER IF EXISTS update_student_contact_verifications_updated_at ON public.student_contact_verifications;
DROP TRIGGER IF EXISTS update_student_contact_verification_challenges_updated_at ON public.student_contact_verification_challenges;

CREATE TRIGGER update_student_contact_verifications_updated_at
BEFORE UPDATE ON public.student_contact_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_contact_verification_challenges_updated_at
BEFORE UPDATE ON public.student_contact_verification_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.edge_request_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope TEXT NOT NULL CHECK (btrim(scope) <> ''),
  bucket_key TEXT NOT NULL CHECK (btrim(bucket_key) <> ''),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS edge_request_events_scope_bucket_created_at_idx
  ON public.edge_request_events (scope, bucket_key, created_at DESC);

ALTER TABLE public.edge_request_events ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Students can view their own payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins can view all payment transactions" ON public.payment_transactions;

CREATE POLICY "Students can view their own payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = student_id);

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

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.student_admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  note TEXT NOT NULL CHECK (btrim(note) <> ''),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS student_admin_notes_student_id_idx
  ON public.student_admin_notes (student_id, created_at DESC);

ALTER TABLE public.student_admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage student admin notes" ON public.student_admin_notes;

CREATE POLICY "Admins can manage student admin notes"
  ON public.student_admin_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

DROP TRIGGER IF EXISTS update_student_admin_notes_updated_at ON public.student_admin_notes;

CREATE TRIGGER update_student_admin_notes_updated_at
BEFORE UPDATE ON public.student_admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.student_admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.student_applications(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.student_documents(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'profile_updated',
      'profile_correction_requested',
      'application_status_updated',
      'document_updated',
      'internal_note_added'
    )
  ),
  action_label TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS student_admin_activity_logs_student_id_idx
  ON public.student_admin_activity_logs (student_id, created_at DESC);

ALTER TABLE public.student_admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage student admin activity logs" ON public.student_admin_activity_logs;

CREATE POLICY "Admins can manage student admin activity logs"
  ON public.student_admin_activity_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );
