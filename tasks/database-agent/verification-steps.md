# Verification Steps After Deployment

## 1. Check Function is Deployed
Go to: https://supabase.com/dashboard/project/ktxdbeamrxhjtdattwts/functions

Expected: `npc-ai-chat` appears in the list

## 2. Test Function via Dashboard
In Supabase Dashboard SQL Editor, run:
```sql
-- Check if agent_configs has data
SELECT id, name, is_enabled FROM agent_configs WHERE is_enabled = true;
```

## 3. Test via curl (optional)
```bash
curl -X POST \
  https://ktxdbeamrxhjtdattwts.supabase.co/functions/v1/npc-ai-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "npc-elara",
    "playerId": "test-player",
    "playerName": "Tester",
    "message": "Hello!",
    "config": {
      "name": "Elara",
      "personality": "You are a wise sorceress.",
      "model": {"conversation": "gpt-4o-mini"},
      "skills": ["say"]
    },
    "history": []
  }'
```

## 4. Check Logs
In Supabase Dashboard → Edge Functions → npc-ai-chat → Logs

Look for:
- Successful requests
- No "function not found" errors
- AI API responses (if API keys set)

## 5. Test in Game
1. Start game server: `npm run dev` in my-rpg-game folder
2. Open http://localhost:3000
3. Talk to an NPC
4. Expected: AI-generated response (not "having trouble thinking")
