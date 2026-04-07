-- 1. Drop existing table to rebuild it cleanly for bilingual support
DROP TABLE IF EXISTS blog_posts;

-- 2. Recreate blog_posts with bilingual columns
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- French Content
  title_fr TEXT NOT NULL,
  slug_fr TEXT UNIQUE NOT NULL,
  content_fr TEXT NOT NULL,
  excerpt_fr TEXT,
  meta_title_fr TEXT,
  meta_description_fr TEXT,
  
  -- English Content
  title_en TEXT NOT NULL,
  slug_en TEXT UNIQUE NOT NULL,
  content_en TEXT NOT NULL,
  excerpt_en TEXT,
  meta_title_en TEXT,
  meta_description_en TEXT,
  
  -- Shared Metadata
  image_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  category_id UUID REFERENCES blog_categories(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Allow public read access on published posts" ON blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Allow admin all access on posts" ON blog_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.email = auth.jwt() ->> 'email')
  );
