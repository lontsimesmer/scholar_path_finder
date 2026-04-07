WITH ranked_applications AS (
  SELECT
    id,
    student_id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_number
  FROM public.student_applications
),
application_mapping AS (
  SELECT
    duplicate.id AS duplicate_id,
    keeper.id AS keeper_id
  FROM ranked_applications duplicate
  JOIN ranked_applications keeper
    ON keeper.student_id = duplicate.student_id
   AND keeper.row_number = 1
  WHERE duplicate.row_number > 1
)
UPDATE public.student_documents documents
SET application_id = mapping.keeper_id
FROM application_mapping mapping
WHERE documents.application_id = mapping.duplicate_id;

WITH ranked_applications AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_number
  FROM public.student_applications
)
DELETE FROM public.student_applications applications
USING ranked_applications ranked
WHERE applications.id = ranked.id
  AND ranked.row_number > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_applications_student_id_key'
      AND conrelid = 'public.student_applications'::regclass
  ) THEN
    ALTER TABLE public.student_applications
      ADD CONSTRAINT student_applications_student_id_key UNIQUE (student_id);
  END IF;
END $$;
