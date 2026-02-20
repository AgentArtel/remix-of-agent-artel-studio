
-- Function to insert a credential with encrypted key
CREATE OR REPLACE FUNCTION public.insert_encrypted_credential(
  p_name text,
  p_service text,
  p_api_key text,
  p_key_hint text,
  p_passphrase text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row studio_credentials;
BEGIN
  INSERT INTO studio_credentials (name, service, encrypted_key, key_hint)
  VALUES (p_name, p_service, pgp_sym_encrypt(p_api_key, p_passphrase), p_key_hint)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'service', v_row.service,
    'key_hint', v_row.key_hint,
    'is_active', v_row.is_active,
    'last_used_at', v_row.last_used_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

-- Function to update a credential with encrypted key
CREATE OR REPLACE FUNCTION public.update_encrypted_credential(
  p_id uuid,
  p_name text,
  p_service text,
  p_api_key text,
  p_key_hint text,
  p_passphrase text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row studio_credentials;
BEGIN
  UPDATE studio_credentials
  SET name = p_name,
      service = p_service,
      encrypted_key = pgp_sym_encrypt(p_api_key, p_passphrase),
      key_hint = p_key_hint,
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'service', v_row.service,
    'key_hint', v_row.key_hint,
    'is_active', v_row.is_active,
    'last_used_at', v_row.last_used_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;
