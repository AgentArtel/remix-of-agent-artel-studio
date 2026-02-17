

# Google OAuth Integrations Setup

## Overview
This plan adds Google OAuth sign-in (with Gmail and Google Photos scopes), a `user_integrations` database table, and replaces the current Integrations page with an OAuth-connected services UI. It also adds the authentication layer the app currently lacks (required for OAuth and RLS).

## Important Prerequisites (Your Action Required)

Before this code can work, you must configure Google OAuth in two places:

1. **Google Cloud Console** -- Create an OAuth 2.0 Client ID:
   - Go to https://console.cloud.google.com
   - Create a project (or use existing)
   - Enable the Gmail API and Google Photos Library API
   - Configure the OAuth Consent Screen (add scopes: `gmail.readonly`, `gmail.modify`, `photoslibrary.readonly`)
   - Create OAuth Client ID (Web Application type)
   - Add Authorized redirect URL: `https://ktxdbeamrxhjtdattwts.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret

2. **Supabase Dashboard** -- Enable Google provider:
   - Go to https://supabase.com/dashboard/project/ktxdbeamrxhjtdattwts/auth/providers
   - Enable Google provider
   - Paste your Client ID and Client Secret
   - Under Authentication > URL Configuration, set Site URL to your app's preview URL

## What Will Be Built

### Step 1: Add React Router
The app currently uses `useState` for page navigation, which means there are no real URLs. OAuth redirects need a real URL (`/integrations/callback`) to land on after Google sends the user back. We will:
- Install `react-router-dom` (already in dependencies)
- Wrap the app in `BrowserRouter`
- Add a `/auth/callback` route that handles the OAuth redirect
- Keep the existing state-based navigation for all other pages (minimal disruption)

### Step 2: Add Basic Authentication
OAuth requires a logged-in user. We will:
- Create an `AuthProvider` context that listens to `onAuthStateChange`
- Create a simple Login page with "Sign in with Google" button
- Show the Login page when no session exists
- Show the main app when authenticated
- This uses Supabase's built-in Google OAuth -- no password forms needed

### Step 3: Create `user_integrations` Table (Migration)
```sql
CREATE TABLE user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```
With RLS policies so users can only see/manage their own integrations.

### Step 4: Rebuild the Integrations Page
Replace the current `api_integrations`-based page (which queries a table that doesn't exist in your DB) with a new OAuth integrations page that:
- Shows cards for available providers (Gmail, Google Photos)
- "Connect" button triggers `supabase.auth.signInWithOAuth` with the appropriate scopes
- Shows connected/disconnected/expired status from `user_integrations`
- "Disconnect" button sets `is_active = false`
- After OAuth redirect, captures the `provider_token` from the session and stores it

### Step 5: OAuth Callback Handler
A component mounted at the `/auth/callback` route that:
- Reads the session after Supabase processes the OAuth redirect
- Extracts `provider_token`, `provider_refresh_token`, and granted scopes
- Upserts into `user_integrations`
- Redirects back to the Integrations page

---

## Technical Details

### Files to create:
- `src/contexts/AuthContext.tsx` -- Auth provider with session state and `onAuthStateChange` listener
- `src/pages/Login.tsx` -- Simple login page with Google sign-in button
- `src/components/integrations/IntegrationCard.tsx` -- Card for each OAuth provider
- `src/components/integrations/OAuthCallbackHandler.tsx` -- Handles redirect, stores tokens

### Files to modify:
- `src/App.tsx` -- Wrap in `BrowserRouter`, add auth gate, add `/auth/callback` route
- `src/pages/Integrations.tsx` -- Complete rewrite to show OAuth provider cards instead of `api_integrations` CRUD
- `src/main.tsx` -- Wrap with `BrowserRouter` if not already

### New migration:
- `user_integrations` table with RLS policies

### Provider definitions (hardcoded config):
```typescript
const PROVIDERS = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    description: 'Read and manage email',
    scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
    oauthProvider: 'google' as const,
  },
  {
    id: 'google-photos',
    name: 'Google Photos',
    icon: Image,
    description: 'Access photo library',
    scopes: 'https://www.googleapis.com/auth/photoslibrary.readonly',
    oauthProvider: 'google' as const,
  },
];
```

### Key limitation:
Supabase OAuth only returns the `provider_token` during the initial sign-in session. If the user is already signed in with Google and wants to add Gmail scopes, we re-trigger `signInWithOAuth` with additional scopes. The token is available in `session.provider_token` right after the redirect.

