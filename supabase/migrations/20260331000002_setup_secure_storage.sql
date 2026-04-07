-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow students to upload files to their own folder
CREATE POLICY "Students can upload their own documents"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'student-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow students to view their own files
CREATE POLICY "Students can view their own documents"
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'student-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow students to delete their own files (if pending)
CREATE POLICY "Students can delete their own documents"
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'student-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
