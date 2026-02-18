# Task Brief: Deploy NPC AI Chat Edge Function

## Objective
Deploy the `npc-ai-chat` Edge Function to the Supabase project and configure required secrets.

## Supabase Project Details
- **Project ID**: `ktxdbeamrxhjtdattwts`
- **Project URL**: https://supabase.com/dashboard/project/ktxdbeamrxhjtdattwts
- **Region**: (Check dashboard)

## Files to Deploy

### 1. Edge Function: `npc-ai-chat`
**Source File**: `studio/supabase/functions/npc-ai-chat/index.ts` (copy provided in this folder)

**What this function does**:
- Handles AI conversations for NPCs in the RPG game
- Supports OpenAI (GPT-4, GPT-3.5), Kimi (Moonshot AI), and Gemini (Google)
- Implements tool calling for NPC skills (move, say, generate_image)
- Stores conversation history in `agent_memory` table
- Keeps API keys secure (server-side only)

### 2. Required Secrets
Set these in Supabase Dashboard → Settings → Edge Functions → Secrets:

| Secret Name | Value | Status |
|-------------|-------|--------|
| `SUPABASE_URL` | `https://ktxdbeamrxhjtdattwts.supabase.co` | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | (get from project settings) | Required |
| `OPENAI_API_KEY` | (optional - for GPT support) | Optional |
| `KIMI_API_KEY` | (optional - for Kimi support) | Optional |
| `GEMINI_API_KEY` | (optional - for Gemini support) | Optional |

## Deployment Steps

1. **Login to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/ktxdbeamrxhjtdattwts/functions

2. **Create New Function**
   - Click "Create a new function"
   - Name: `npc-ai-chat`
   - Method: POST
   - Copy content from provided `index.ts` file
   - Deploy

3. **Set Secrets**
   - Go to Settings → Edge Functions → Secrets
   - Add each secret from the table above

4. **Verify Deployment**
   - Test function with curl or Supabase dashboard
   - Check logs for any errors

## Success Criteria
- [ ] Function `npc-ai-chat` appears in deployed functions list
- [ ] Required secrets are set
- [ ] Game server can successfully call the function
- [ ] NPCs respond with AI-generated text (not fallback message)

## Current State
The game server is working and spawning NPCs, but AI chat fails with:
```
[AIService] Edge Function error: {"code":"NOT_FOUND","message":"Requested function was not found"}
```

## Additional Context
- Database tables are already created in `public` schema
- NPCs are spawning from `agent_configs` table
- Memory table `agent_memory` exists
- Game server calls: `POST /functions/v1/npc-ai-chat`
