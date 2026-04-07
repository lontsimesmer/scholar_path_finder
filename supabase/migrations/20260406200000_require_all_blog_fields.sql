ALTER TABLE public.blog_posts
  ALTER COLUMN excerpt_fr SET NOT NULL,
  ALTER COLUMN excerpt_en SET NOT NULL,
  ALTER COLUMN image_url SET NOT NULL;

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
