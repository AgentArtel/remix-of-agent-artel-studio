-- Grant USAGE on the game schema to anon and authenticated roles
GRANT USAGE ON SCHEMA game TO anon, authenticated;

-- Grant full CRUD access on all game tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA game TO anon, authenticated;

-- Ensure future tables in the game schema also get these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA game GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;