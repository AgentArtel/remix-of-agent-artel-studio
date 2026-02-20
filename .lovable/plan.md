

## Wire Credentials Page to Supabase

### Overview
Replace the hardcoded mock credentials with a real `studio_credentials` table in Supabase, with full Create/Read/Update/Delete operations. API keys will be stored with server-side encryption via a Postgres `pgcrypto` extension, so raw keys are never exposed to the client after saving.

### Database Changes

**New table: `studio_credentials`**

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | Primary key |
| name | text | NOT NULL | Display name (e.g. "OpenAI Production") |
| service | text | NOT NULL | Service type (openai, anthropic, etc.) |
| encrypted_key | text | NOT NULL | API key encrypted with pgcrypto |
| key_hint | text | NULL | Last 4 chars of the key for display |
| is_active | boolean | true | Whether credential is connected |
| last_used_at | timestamptz | NULL | Tracks last usage |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**Encryption approach:**
- Use `pgcrypto` extension (already available in Supabase) with `pgp_sym_encrypt` / `pgp_sym_decrypt`
- The encryption passphrase will be the `SUPABASE_SERVICE_ROLE_KEY` secret (already configured)
- A database function `decrypt_credential_key(credential_id uuid)` will be created for edge functions to use when they need the raw key -- the client app never sees the decrypted value
- The client only ever sees `key_hint` (e.g. "...x789")

**RLS Policy:** Permissive "Allow all" (matching the existing dev-mode pattern used across all other tables).

**Migration SQL (single migration):**
```sql
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
```

### Frontend Changes

**1. New hook: `src/hooks/useCredentials.ts`**
- Fetches all credentials from `studio_credentials` (id, name, service, key_hint, is_active, last_used_at, created_at)
- Provides `addCredential(name, service, apiKey)` -- inserts with `encrypted_key` set to `pgp_sym_encrypt(apiKey, passphrase)` via an edge function
- Provides `updateCredential(id, name, service, apiKey?)` -- updates name/service, optionally re-encrypts if new key provided
- Provides `deleteCredential(id)` -- deletes from table
- Uses `@tanstack/react-query` for caching and refetch

**2. New edge function: `supabase/functions/manage-credential/index.ts`**
- Handles POST (create), PUT (update), DELETE operations
- On create/update with a key: encrypts using `pgp_sym_encrypt(key, service_role_key)` server-side, stores `key_hint` as last 4 chars
- On delete: removes the row
- Uses the Supabase service role client so it can write encrypted data
- Returns the credential metadata (never returns the decrypted key)

**3. Update `src/pages/Credentials.tsx`**
- Remove all hardcoded `initialCredentials` data
- Import and use the new `useCredentials` hook
- Wire `handleSaveCredential` to call the edge function (create or update)
- Wire `handleDeleteCredential` to call the edge function (delete)
- Show `key_hint` (e.g. "...x789") on cards instead of full masked values
- Show loading skeleton while fetching
- Show `formatRelativeTime(last_used_at)` for "Last used" (already have this util)

**4. Minor update to `src/components/credentials/CredentialCard.tsx`**
- Add optional `keyHint` prop to display the masked key suffix

### Data Flow

```text
User enters API key in modal
        |
        v
Frontend calls manage-credential edge function
        |
        v
Edge function encrypts key with pgp_sym_encrypt()
Stores encrypted_key + key_hint in studio_credentials
        |
        v
Frontend refetches credential list (metadata only)
Cards display name, service, key_hint, last_used_at
```

### Technical Details

- The edge function uses the `SUPABASE_SERVICE_ROLE_KEY` (already configured as a secret) as the symmetric encryption passphrase
- No new secrets are needed
- The `key_hint` is generated server-side as the last 4 characters of the raw API key, prefixed with "..."
- The encrypted key can only be decrypted server-side by other edge functions that need it (e.g., when executing workflows that require API keys)
- Service options in the dropdown: openai, anthropic, groq, gemini, deepseek, cerebras, moonshot/kimi, slack, github, stripe (matching the backends already in `picoclaw-bridge`)

