-- =====================================================
-- RPG Game Database Schema (Already Applied)
-- Project: ktxdbeamrxhjtdattwts
-- =====================================================

-- Tables already exist in public schema:
-- 1. agent_configs - NPC configuration
-- 2. agent_memory - Conversation history
-- 3. player_state - Player tracking
-- 4. npc_instances - Active NPC instances
-- 5. sync_status - Sync tracking

-- If any issues, here's the schema reference:

-- agent_configs
-- id TEXT PRIMARY KEY
-- name TEXT NOT NULL
-- category TEXT DEFAULT 'npc'
-- base_entity_type TEXT DEFAULT 'ai-npc'
-- default_sprite TEXT
-- icon TEXT DEFAULT '🤖'
-- description TEXT
-- prompt TEXT NOT NULL
-- welcome_message TEXT DEFAULT 'Hello!'
-- model JSONB
-- skills JSONB DEFAULT '[]'
-- required_tokens JSONB DEFAULT '[]'
-- personality JSONB
-- memory_config JSONB
-- spawn_config JSONB
-- appearance JSONB
-- behavior JSONB
-- is_enabled BOOLEAN DEFAULT true
-- created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- agent_memory
-- id UUID DEFAULT gen_random_uuid() PRIMARY KEY
-- session_id TEXT NOT NULL
-- npc_id TEXT NOT NULL REFERENCES agent_configs(id)
-- player_id TEXT NOT NULL
-- role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system'))
-- content TEXT NOT NULL
-- metadata JSONB DEFAULT '{}'
-- created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- RLS Policies are enabled with permissive access for development
