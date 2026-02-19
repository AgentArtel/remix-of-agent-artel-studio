-- B-0: n8n_webhook_registry
-- Maps game object action keys to n8n webhook URLs.
-- The object-action Edge Function looks up this table to forward requests.

CREATE TABLE IF NOT EXISTS public.n8n_webhook_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_key TEXT NOT NULL UNIQUE,      -- e.g. 'mailbox.fetch_emails', 'desk.process_mail'
  webhook_url TEXT NOT NULL,
  method TEXT DEFAULT 'POST',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  timeout_ms INTEGER DEFAULT 30000,
  response_mode TEXT DEFAULT 'sync',    -- 'sync' (wait for response) | 'async' (fire-and-forget)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.n8n_webhook_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to n8n_webhook_registry"
  ON public.n8n_webhook_registry
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed placeholder rows (is_active=false until n8n is configured with real URLs)
INSERT INTO public.n8n_webhook_registry (action_key, webhook_url, description, is_active) VALUES
  ('mailbox.fetch_emails', 'https://placeholder.invalid/webhook/mailbox-fetch', 'Fetch Gmail inbox for player', false),
  ('mailbox.send_email',   'https://placeholder.invalid/webhook/mailbox-send',  'Send email via Gmail',         false),
  ('desk.process_mail',    'https://placeholder.invalid/webhook/desk-process',  'Process/tag unread emails',    false),
  ('desk.check_desk',      'https://placeholder.invalid/webhook/desk-check',    'Check desk status',            false),
  ('studio.run_workflow',  'https://placeholder.invalid/webhook/studio-run',    'Run a studio workflow via n8n', false)
ON CONFLICT (action_key) DO NOTHING;
