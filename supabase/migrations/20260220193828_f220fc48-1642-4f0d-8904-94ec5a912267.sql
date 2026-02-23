
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.studio_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service text NOT NULL,
  encrypted_key text NOT NULL,
  key_hint text,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on studio_credentials"
  ON public.studio_credentials FOR ALL
  USING (true) WITH CHECK (true);
