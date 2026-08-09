CREATE POLICY "Candidates can upload own profile picture"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile picture'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
