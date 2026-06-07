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
  provider TEXT NOT NULL CHECK (provider IN ('cinetpay', 'manual_orange_money')),
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

-- =============================================================================
-- Manual Orange Money payment workflow
-- =============================================================================

-- Extend payment_transactions.provider CHECK to allow manual_orange_money entries
-- when the table already exists from a prior baseline run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_transactions_provider_check'
      AND conrelid = 'public.payment_transactions'::regclass
  ) THEN
    ALTER TABLE public.payment_transactions
      DROP CONSTRAINT payment_transactions_provider_check;
  END IF;

  ALTER TABLE public.payment_transactions
    ADD CONSTRAINT payment_transactions_provider_check
    CHECK (provider IN ('cinetpay', 'manual_orange_money'));
END $$;

-- Lead-level block flag preventing further manual payment submissions.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS manual_payment_blocked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS manual_payment_blocked_by TEXT,
  ADD COLUMN IF NOT EXISTS manual_payment_blocked_reason TEXT;

CREATE INDEX IF NOT EXISTS leads_manual_payment_blocked_idx
  ON public.leads (manual_payment_blocked_at)
  WHERE manual_payment_blocked_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.manual_payment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount % 5 = 0),
  currency TEXT NOT NULL CHECK (char_length(currency) = 3),
  receipt_path TEXT NOT NULL CHECK (btrim(receipt_path) <> ''),
  receipt_mime_type TEXT,
  sender_name TEXT,
  sender_phone TEXT,
  provider_reference TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
    status IN ('pending_review', 'approved', 'rejected', 'cancelled')
  ),
  reviewer_email TEXT,
  reviewer_comment TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS manual_payment_submissions_lead_id_idx
  ON public.manual_payment_submissions (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS manual_payment_submissions_student_id_idx
  ON public.manual_payment_submissions (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS manual_payment_submissions_status_idx
  ON public.manual_payment_submissions (status, created_at DESC);

-- Only one pending submission per lead at a time (prevents concurrent uploads).
CREATE UNIQUE INDEX IF NOT EXISTS manual_payment_submissions_one_pending_per_lead_idx
  ON public.manual_payment_submissions (lead_id)
  WHERE status = 'pending_review';

ALTER TABLE public.manual_payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own manual payment submissions" ON public.manual_payment_submissions;
DROP POLICY IF EXISTS "Admins can view all manual payment submissions" ON public.manual_payment_submissions;

CREATE POLICY "Students can view their own manual payment submissions"
  ON public.manual_payment_submissions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all manual payment submissions"
  ON public.manual_payment_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_unsafe_manual_payment_submission_update()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Manual payment submissions can only be modified by admins.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_manual_payment_submissions_updated_at ON public.manual_payment_submissions;
DROP TRIGGER IF EXISTS prevent_unsafe_manual_payment_submission_update ON public.manual_payment_submissions;

CREATE TRIGGER update_manual_payment_submissions_updated_at
BEFORE UPDATE ON public.manual_payment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER prevent_unsafe_manual_payment_submission_update
BEFORE UPDATE ON public.manual_payment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unsafe_manual_payment_submission_update();

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_admin_email TEXT,
  type TEXT NOT NULL CHECK (
    type IN (
      'manual_payment.submitted',
      'manual_payment.approved',
      'manual_payment.rejected',
      'manual_payment.lead_blocked'
    )
  ),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  body TEXT,
  link_path TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT notifications_recipient_xor_check CHECK (
    (recipient_user_id IS NOT NULL AND recipient_admin_email IS NULL)
    OR (recipient_user_id IS NULL AND recipient_admin_email IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS notifications_recipient_user_id_idx
  ON public.notifications (recipient_user_id, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_recipient_admin_email_idx
  ON public.notifications (recipient_admin_email, created_at DESC)
  WHERE recipient_admin_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_unread_user_idx
  ON public.notifications (recipient_user_id)
  WHERE read_at IS NULL AND recipient_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_unread_admin_idx
  ON public.notifications (recipient_admin_email)
  WHERE read_at IS NULL AND recipient_admin_email IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Students can mark their notifications as read" ON public.notifications;
DROP POLICY IF EXISTS "Students can delete their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view their admin notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can mark their admin notifications as read" ON public.notifications;
DROP POLICY IF EXISTS "Admins can delete their admin notifications" ON public.notifications;

CREATE POLICY "Students can view their notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND recipient_user_id = auth.uid());

CREATE POLICY "Students can mark their notifications as read"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND recipient_user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND recipient_user_id = auth.uid());

CREATE POLICY "Admins can view their admin notifications"
  ON public.notifications
  FOR SELECT
  USING (
    recipient_admin_email IS NOT NULL
    AND recipient_admin_email = auth.jwt() ->> 'email'
    AND EXISTS (
      SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can mark their admin notifications as read"
  ON public.notifications
  FOR UPDATE
  USING (
    recipient_admin_email IS NOT NULL
    AND recipient_admin_email = auth.jwt() ->> 'email'
    AND EXISTS (
      SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    recipient_admin_email IS NOT NULL
    AND recipient_admin_email = auth.jwt() ->> 'email'
  );

CREATE POLICY "Students can delete their notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND recipient_user_id = auth.uid());

CREATE POLICY "Admins can delete their admin notifications"
  ON public.notifications
  FOR DELETE
  USING (
    recipient_admin_email IS NOT NULL
    AND recipient_admin_email = auth.jwt() ->> 'email'
    AND EXISTS (
      SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_unsafe_notification_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id <> OLD.id
    OR NEW.recipient_user_id IS DISTINCT FROM OLD.recipient_user_id
    OR NEW.recipient_admin_email IS DISTINCT FROM OLD.recipient_admin_email
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.body IS DISTINCT FROM OLD.body
    OR NEW.link_path IS DISTINCT FROM OLD.link_path
    OR NEW.payload IS DISTINCT FROM OLD.payload
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Notification fields are immutable; only read_at can be updated.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_unsafe_notification_update ON public.notifications;

CREATE TRIGGER prevent_unsafe_notification_update
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unsafe_notification_update();

-- Storage bucket for manual payment receipts (private).
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Students can upload their own payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all payment receipts" ON storage.objects;

CREATE POLICY "Students can upload their own payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can view their own payment receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all payment receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts' AND
  EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
);

-- Seeds for the manual Orange Money payment mode.
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'checkout.payment_mode',
  '{"mode": "manual_orange_money"}'::jsonb,
  'Active payment mode used by the checkout page (cinetpay | manual_orange_money).'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'checkout.manual_orange_money',
  '{
    "account_name": "PETNJI",
    "account_number": "+237 698 090 6123",
    "currency": "XAF",
    "amount": 15625,
    "instructions_fr": "Composez #150# ou ouvrez l'application Orange Money, envoyez 15 625 XAF au +237 698 090 6123 (PETNJI), puis téléversez la capture du SMS de confirmation.",
    "instructions_en": "Dial #150# or open the Orange Money app, send 15,625 XAF to +237 698 090 6123 (PETNJI), then upload the confirmation SMS screenshot."
  }'::jsonb,
  'Manual Orange Money payment instructions displayed on checkout when payment_mode = manual_orange_money.'
)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- FAQ entries (public, managed via admin CRM)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.faq_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_fr TEXT NOT NULL CHECK (btrim(question_fr) <> ''),
  answer_fr TEXT NOT NULL CHECK (btrim(answer_fr) <> ''),
  question_en TEXT NOT NULL CHECK (btrim(question_en) <> ''),
  answer_en TEXT NOT NULL CHECK (btrim(answer_en) <> ''),
  category TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS faq_entries_position_idx
  ON public.faq_entries (position ASC, created_at ASC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS faq_entries_category_idx
  ON public.faq_entries (category)
  WHERE category IS NOT NULL;

ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published faq entries" ON public.faq_entries;
DROP POLICY IF EXISTS "Admins can manage faq entries" ON public.faq_entries;

CREATE POLICY "Public can read published faq entries"
  ON public.faq_entries
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage faq entries"
  ON public.faq_entries
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.email = auth.jwt() ->> 'email')
  );

DROP TRIGGER IF EXISTS update_faq_entries_updated_at ON public.faq_entries;

CREATE TRIGGER update_faq_entries_updated_at
BEFORE UPDATE ON public.faq_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial FAQ entries (idempotent via question_fr uniqueness check).
DO $$
DECLARE
  seed_entries JSONB := $seed$[
    {
      "question_fr": "Combien coûtent vos services ?",
      "answer_fr": "Nous proposons différents forfaits adaptés à différents besoins et budgets. La consultation initiale coûte 15 625 XAF (environ 25 USD), et nous fournirons une tarification transparente basée sur les services dont vous avez besoin. Contactez-nous pour un devis personnalisé.",
      "question_en": "How much do your services cost?",
      "answer_en": "We offer various packages tailored to different needs and budgets. The initial consultation costs 15,625 XAF (around 25 USD), and we'll provide transparent pricing based on the services you require. Contact us for a personalized quote.",
      "position": 10
    },
    {
      "question_fr": "Dans quels pays aidez-vous les étudiants à postuler ?",
      "answer_fr": "Nous aidons les étudiants à postuler dans plusieurs pays du monde, y compris des destinations populaires comme la France, l'Allemagne, le Canada, les États-Unis, le Royaume-Uni, l'Australie et bien d'autres. Notre expertise s'étend à travers l'Europe, l'Amérique du Nord et au-delà.",
      "question_en": "Which countries do you help students apply to?",
      "answer_en": "We assist students in applying to universities in multiple countries worldwide, including popular destinations like France, Germany, Canada, USA, UK, Australia, and many more. Our expertise spans across Europe, North America, and beyond.",
      "position": 20
    },
    {
      "question_fr": "Combien de temps prend le processus de candidature ?",
      "answer_fr": "Le processus de candidature prend généralement 6 à 12 mois en fonction de votre pays cible et de votre programme. Nous recommandons de commencer tôt pour assurer la meilleure préparation et maximiser vos chances de succès.",
      "question_en": "How long does the application process take?",
      "answer_en": "The application process typically takes 6-12 months depending on your target country and program. We recommend starting early to ensure the best preparation and maximize your chances of success.",
      "position": 30
    },
    {
      "question_fr": "Garantissez-vous l'admission ?",
      "answer_fr": "Bien que nous ne puissions pas garantir l'admission car les décisions finales appartiennent aux universités, notre taux de réussite témoigne de notre expertise. Nous travaillons avec diligence pour présenter votre candidature la plus forte et vous associer à des programmes où vous avez les meilleures chances.",
      "question_en": "Do you guarantee admission?",
      "answer_en": "While we cannot guarantee admission as final decisions rest with universities, our success rate speaks to our expertise. We work diligently to present your strongest application and match you with programs where you have the best chances.",
      "position": 40
    },
    {
      "question_fr": "Pouvez-vous aider avec les demandes de bourses ?",
      "answer_fr": "Absolument ! L'assistance aux bourses est l'un de nos services principaux. Nous aidons à identifier les bourses qui correspondent à votre profil, vous guidons à travers les exigences de candidature et examinons vos essais et documents de bourse.",
      "question_en": "Can you help with scholarship applications?",
      "answer_en": "Absolutely! Scholarship assistance is one of our core services. We help identify scholarships that match your profile, guide you through application requirements, and review your scholarship essays and documents.",
      "position": 50
    },
    {
      "question_fr": "Et si je ne sais pas quel programme ou pays choisir ?",
      "answer_fr": "C'est exactement là où nous intervenons ! Notre évaluation complète du profil vous aidera à identifier les programmes et destinations qui correspondent à votre parcours académique, vos objectifs de carrière, vos préférences personnelles et votre budget.",
      "question_en": "What if I don't know which program or country to choose?",
      "answer_en": "That's exactly where we come in! Our comprehensive profile assessment will help identify programs and destinations that align with your academic background, career goals, personal preferences, and budget.",
      "position": 60
    }
  ]$seed$::jsonb;
  entry JSONB;
BEGIN
  FOR entry IN SELECT * FROM jsonb_array_elements(seed_entries) LOOP
    INSERT INTO public.faq_entries (question_fr, answer_fr, question_en, answer_en, position, is_published)
    SELECT
      entry->>'question_fr',
      entry->>'answer_fr',
      entry->>'question_en',
      entry->>'answer_en',
      (entry->>'position')::integer,
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.faq_entries WHERE question_fr = entry->>'question_fr'
    );
  END LOOP;
END $$;
