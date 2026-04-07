-- 1. Create Application Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM (
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

-- 2. Student Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone_number TEXT,
  current_degree TEXT,
  target_country TEXT,
  target_program TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Applications Tracking
CREATE TABLE IF NOT EXISTS student_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status application_status DEFAULT 'consultation_paid' NOT NULL,
  notes TEXT,
  assigned_advisor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Secure Documents Table
CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  application_id UUID REFERENCES student_applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Profiles
CREATE POLICY "Students can view their own profile" ON student_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Students can update their own profile" ON student_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 7. RLS Policies for Applications
CREATE POLICY "Students can view their own applications" ON student_applications
  FOR SELECT USING (auth.uid() = student_id);

-- 8. RLS Policies for Documents
CREATE POLICY "Students can view their own documents" ON student_documents
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can upload their own documents" ON student_documents
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 9. Admin Access (Service Role or specific email logic in Edge Functions)
-- We'll add specific admin policies if needed, but service_role always bypasses RLS.
