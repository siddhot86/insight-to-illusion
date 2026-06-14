
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled scene',
  image_path TEXT,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own analyses" ON public.analyses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX analyses_user_id_created_at_idx ON public.analyses (user_id, created_at DESC);

-- Storage policies for scene-images bucket: each user can only access their own folder
CREATE POLICY "Users read own scene images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'scene-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own scene images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'scene-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own scene images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'scene-images' AND auth.uid()::text = (storage.foldername(name))[1]);
