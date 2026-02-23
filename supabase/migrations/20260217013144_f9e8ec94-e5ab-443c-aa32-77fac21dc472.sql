-- TEMPORARY: Grant anon write access to game.agent_configs for testing
-- REVOKE after testing with:
--   REVOKE INSERT, UPDATE, DELETE ON game.agent_configs FROM anon;

GRANT INSERT, UPDATE, DELETE ON game.agent_configs TO anon;