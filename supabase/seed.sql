-- Seeds for Power Prestation

-- 1. Create Auth Users (Local Dev Only)
-- We use static UUIDs to keep consistency
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES 
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@powerprestation.com',
    crypt('AdminPower123!', gen_salt('bf')),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Official Admin","email":"admin@powerprestation.com","email_verified":true,"phone_verified":false,"sub":"00000000-0000-0000-0000-000000000000"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd1111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'jean.dupont@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jean Dupont","email":"jean.dupont@example.com","email_verified":true,"phone_verified":false,"sub":"d1111111-1111-1111-1111-111111111111"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'amina.njoya@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Amina Njoya","email":"amina.njoya@example.com","email_verified":true,"phone_verified":false,"sub":"d2222222-2222-2222-2222-222222222222"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'kevin.kamga@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Kevin Kamga","email":"kevin.kamga@example.com","email_verified":true,"phone_verified":false,"sub":"d3333333-3333-3333-3333-333333333333"}',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  aud = EXCLUDED.aud,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  confirmed_at = EXCLUDED.confirmed_at,
  confirmation_token = EXCLUDED.confirmation_token,
  recovery_token = EXCLUDED.recovery_token,
  email_change = EXCLUDED.email_change,
  email_change_token_new = EXCLUDED.email_change_token_new,
  email_change_token_current = EXCLUDED.email_change_token_current,
  reauthentication_token = EXCLUDED.reauthentication_token,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = EXCLUDED.updated_at;

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    '10000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '{"sub":"00000000-0000-0000-0000-000000000000","email":"admin@powerprestation.com","email_verified":true,"phone_verified":false}',
    'email',
    '00000000-0000-0000-0000-000000000000',
    now(),
    now(),
    now()
  ),
  (
    '1d111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    '{"sub":"d1111111-1111-1111-1111-111111111111","email":"jean.dupont@example.com","email_verified":true,"phone_verified":false}',
    'email',
    'd1111111-1111-1111-1111-111111111111',
    now(),
    now(),
    now()
  ),
  (
    '1d222222-2222-2222-2222-222222222222',
    'd2222222-2222-2222-2222-222222222222',
    '{"sub":"d2222222-2222-2222-2222-222222222222","email":"amina.njoya@example.com","email_verified":true,"phone_verified":false}',
    'email',
    'd2222222-2222-2222-2222-222222222222',
    now(),
    now(),
    now()
  ),
  (
    '1d333333-3333-3333-3333-333333333333',
    'd3333333-3333-3333-3333-333333333333',
    '{"sub":"d3333333-3333-3333-3333-333333333333","email":"kevin.kamga@example.com","email_verified":true,"phone_verified":false}',
    'email',
    'd3333333-3333-3333-3333-333333333333',
    now(),
    now(),
    now()
  )
ON CONFLICT (provider_id, provider) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  identity_data = EXCLUDED.identity_data,
  last_sign_in_at = EXCLUDED.last_sign_in_at,
  updated_at = EXCLUDED.updated_at;

-- 2. Student Profiles
INSERT INTO public.student_profiles (id, full_name, email, current_degree, target_country, target_program)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Jean Dupont', 'jean.dupont@example.com', 'Licence en Droit', 'France', 'Master Droit International'),
  ('d2222222-2222-2222-2222-222222222222', 'Amina Njoya', 'amina.njoya@example.com', 'Baccalauréat C', 'Canada', 'Bachelor Génie Logiciel'),
  ('d3333333-3333-3333-3333-333333333333', 'Kevin Kamga', 'kevin.kamga@example.com', 'Master en Physique', 'Allemagne', 'PhD Quantum Computing')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  target_country = EXCLUDED.target_country;

-- 3. Student Applications (Timeline)
INSERT INTO public.student_applications (student_id, status, notes)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'university_selection', 'Étudiant très motivé, dossier en cours de constitution.'),
  ('d2222222-2222-2222-2222-222222222222', 'consultation_paid', 'Consultation initiale effectuée. En attente de l''évaluation du profil.'),
  ('d3333333-3333-3333-3333-333333333333', 'visa_processing', 'Admission reçue de TU Berlin. Procédure visa en cours.')
ON CONFLICT DO NOTHING;

-- 4. Blog Posts Seeds (Bilingual Unified Structure)
INSERT INTO public.blog_posts (
  id, title_fr, slug_fr, content_fr, excerpt_fr,
  title_en, slug_en, content_en, excerpt_en,
  image_url, status
)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'Comment obtenir une bourse pour étudier au Canada depuis le Cameroun',
    'comment-obtenir-bourse-canada-cameroun',
    '<h2>Projet d''études au Canada</h2><p>Le guide complet pour réussir son admission...</p>',
    'Les étapes concrètes pour préparer un dossier de bourse solide.',
    'How to get a scholarship to study in Canada from Cameroon',
    'how-to-get-scholarship-canada-cameroon',
    '<h2>Study Project in Canada</h2><p>The complete guide to succeed in your admission...</p>',
    'Concrete steps to prepare a solid scholarship application.',
    'https://images.unsplash.com/photo-1551033406-611cf9a28f67',
    'published'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'Visa étudiant France: les points à vérifier avant le dépôt',
    'visa-etudiant-france-points-a-verifier',
    '<h2>Réussir son Visa France</h2><p>Checklist complète pour Campus France...</p>',
    'Les contrôles essentiels pour éviter les incoherences.',
    'Student visa France: key points to check before applying',
    'student-visa-france-key-points-check',
    '<h2>Succeeding your France Visa</h2><p>Complete checklist for Campus France...</p>',
    'Essential checks to avoid inconsistencies.',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f',
    'published'
  )
ON CONFLICT (id) DO UPDATE SET
  title_fr = EXCLUDED.title_fr,
  status = EXCLUDED.status;
