
-- Storage policies for padel-photos bucket (users folder-scoped by auth.uid())
CREATE POLICY "Authenticated read padel-photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'padel-photos');
CREATE POLICY "Users upload own padel-photo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'padel-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own padel-photo" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'padel-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own padel-photo" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'padel-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
