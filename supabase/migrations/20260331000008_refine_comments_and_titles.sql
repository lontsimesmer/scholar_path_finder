-- 1. Rename 'name' to 'title' in student_documents for better semantics
ALTER TABLE student_documents RENAME COLUMN name TO title;

-- 2. Ensure admin_feedback exists (it should, but just in case)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_documents' AND column_name='admin_feedback') THEN
        ALTER TABLE student_documents ADD COLUMN admin_feedback TEXT;
    END IF;
END $$;

-- 3. Ensure 'notes' in student_applications is used for General Comment
-- No change needed here, we'll just rename the label in the UI.
