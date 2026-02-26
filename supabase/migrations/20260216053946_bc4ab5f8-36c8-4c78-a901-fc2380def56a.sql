
CREATE TABLE public.studio_ideas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  content text NOT NULL,
  tag text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to studio_ideas"
  ON public.studio_ideas
  FOR ALL
  USING (true)
  WITH CHECK (true);
