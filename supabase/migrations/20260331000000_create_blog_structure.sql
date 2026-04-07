-- Create categories for the blog
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  image_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  category_id UUID REFERENCES blog_categories(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access on categories" ON blog_categories
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on published posts" ON blog_posts
  FOR SELECT USING (status = 'published');

-- Admin write access (to be refined with admin roles later)
CREATE POLICY "Allow admin all access on categories" ON blog_categories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow admin all access on posts" ON blog_posts
  FOR ALL USING (auth.role() = 'service_role');
