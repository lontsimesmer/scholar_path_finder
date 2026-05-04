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
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Official","last_name":"Admin","email":"admin@powerprestation.com","email_verified":true,"phone_verified":false,"sub":"00000000-0000-0000-0000-000000000000"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'authenticated',
    'authenticated',
    'jean.dupont@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Jean","last_name":"Dupont","email":"jean.dupont@example.com","email_verified":true,"phone_verified":false,"sub":"a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    'authenticated',
    'authenticated',
    'amina.njoya@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Amina","last_name":"Njoya","email":"amina.njoya@example.com","email_verified":true,"phone_verified":false,"sub":"c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    'authenticated',
    'authenticated',
    'kevin.kamga@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Kevin","last_name":"Kamga","email":"kevin.kamga@example.com","email_verified":true,"phone_verified":false,"sub":"e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b"}',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  aud = EXCLUDED.aud,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
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
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    '{"sub":"a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d","email":"jean.dupont@example.com","email_verified":true,"phone_verified":false}',
    'email',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    now(),
    now(),
    now()
  ),
  (
    'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    '{"sub":"c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f","email":"amina.njoya@example.com","email_verified":true,"phone_verified":false}',
    'email',
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    now(),
    now(),
    now()
  ),
  (
    'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    '{"sub":"e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b","email":"kevin.kamga@example.com","email_verified":true,"phone_verified":false}',
    'email',
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
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
INSERT INTO public.student_profiles (
  id,
  first_name,
  last_name,
  email,
  current_degree,
  target_country,
  target_program
)
VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Jean', 'Dupont', 'jean.dupont@example.com', 'Licence en Droit', 'France', 'Master Droit International'),
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'Amina', 'Njoya', 'amina.njoya@example.com', 'Baccalauréat C', 'Canada', 'Bachelor Génie Logiciel'),
  ('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', 'Kevin', 'Kamga', 'kevin.kamga@example.com', 'Master en Physique', 'Allemagne', 'PhD Quantum Computing')
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  target_country = EXCLUDED.target_country;

-- 3. Student Applications (Timeline)
INSERT INTO public.student_applications (student_id, status, notes)
VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'university_selection', 'Étudiant très motivé, dossier en cours de constitution.'),
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'consultation_paid', 'Consultation initiale effectuée. En attente de l''évaluation du profil.'),
  ('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', 'visa_processing', 'Admission reçue de TU Berlin. Procédure visa en cours.')
ON CONFLICT DO NOTHING;

-- 4. Blog Posts Seeds (Bilingual Unified Structure)
INSERT INTO public.blog_posts (
  id, title_fr, slug_fr, content_fr, excerpt_fr,
  title_en, slug_en, content_en, excerpt_en,
  image_url, status
)
VALUES
  (
    '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d',
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
    '8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e',
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
