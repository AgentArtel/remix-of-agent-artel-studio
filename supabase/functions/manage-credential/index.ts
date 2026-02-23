import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const method = req.method;

    if (method === "POST") {
      const { name, service, api_key } = await req.json();
      if (!name || !service || !api_key) {
        return new Response(JSON.stringify({ error: "name, service, and api_key are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const keyHint = api_key.length >= 4 ? `...${api_key.slice(-4)}` : "...";

      // Use pgp_sym_encrypt via raw SQL through rpc isn't available,
      // so we insert with the encrypted value using a database function call
      const { data, error } = await supabase.rpc("insert_encrypted_credential", {
        p_name: name,
        p_service: service,
        p_api_key: api_key,
        p_key_hint: keyHint,
        p_passphrase: serviceRoleKey,
      });

      if (error) {
        console.error("Insert error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ credential: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "PUT") {
      const { id, name, service, api_key } = await req.json();
      if (!id) {
        return new Response(JSON.stringify({ error: "id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (api_key) {
        const keyHint = api_key.length >= 4 ? `...${api_key.slice(-4)}` : "...";
        const { data, error } = await supabase.rpc("update_encrypted_credential", {
          p_id: id,
          p_name: name,
          p_service: service,
          p_api_key: api_key,
          p_key_hint: keyHint,
          p_passphrase: serviceRoleKey,
        });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ credential: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Update name/service only, no key change
        const { data, error } = await supabase
          .from("studio_credentials")
          .update({ name, service, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("id, name, service, key_hint, is_active, last_used_at, created_at, updated_at")
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ credential: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (method === "DELETE") {
      let id: string | null = null;
      // Try URL param first, then body
      const url = new URL(req.url);
      id = url.searchParams.get("id");
      if (!id) {
        try {
          const body = await req.json();
          id = body.id;
        } catch {
          // no body
        }
      }
      if (!id) {
        return new Response(JSON.stringify({ error: "id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("studio_credentials").delete().eq("id", id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
