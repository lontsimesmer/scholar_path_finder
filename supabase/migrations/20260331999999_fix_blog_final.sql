-- Migration: Fix Blog Structure for Bilingual Support
-- This script reconstructs the blog_posts table to ensure FR and EN columns coexist in the same row.

-- 1. Drop existing table to avoid conflicts
DROP TABLE IF EXISTS blog_posts CASCADE;

-- 2. Create the unified bilingual table
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- French Content
  title_fr TEXT NOT NULL,
  slug_fr TEXT NOT NULL,
  content_fr TEXT NOT NULL,
  excerpt_fr TEXT,
  -- English Content
  title_en TEXT NOT NULL,
  slug_en TEXT NOT NULL,
  content_en TEXT NOT NULL,
  excerpt_en TEXT,
  -- Metadata
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Security (RLS)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Public can read published posts" ON blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage all posts" ON blog_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.email = auth.jwt() ->> 'email')
  );

-- 5. Seed Data (Initial bilingual posts)
INSERT INTO blog_posts (
  title_fr, slug_fr, content_fr, excerpt_fr,
  title_en, slug_en, content_en, excerpt_en,
  image_url, status
) VALUES 
(
  'Guide Campus France 2026', 'guide-campus-france-2026', '<h2>Réussir son admission</h2><p>Le guide complet pour les étudiants camerounais...</p>', 'Tout sur la procédure Campus France.',
  'Campus France 2026 Guide', 'campus-france-guide-2026', '<h2>Succeeding your admission</h2><p>The complete guide for students from Cameroon...</p>', 'Everything about the Campus France procedure.',
  'https://images.unsplash.com/photo-1551033406-611cf9a28f67', 'published'
),
(
  'Bourses d''études au Canada', 'bourses-etudes-canada', '<h2>Bourses 2026</h2><p>Comment financer vos études au Canada...</p>', 'Les meilleures opportunités de bourses.',
  'Scholarships in Canada', 'scholarships-canada', '<h2>2026 Scholarships</h2><p>How to finance your studies in Canada...</p>', 'Top scholarship opportunities.',
  'https://images.unsplash.com/photo-1564934304048-eb9410d647d3', 'published'
);
