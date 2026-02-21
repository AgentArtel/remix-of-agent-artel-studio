const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

async function sbGet(table: string, query: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { ...sbHeaders, Prefer: "return=representation" },
  });
  if (!r.ok) return null;
  return r.json();
}

async function sbPatch(table: string, query: string, body: unknown) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  return r.ok;
}

function computeCertainty(revealed: number, total: number): string {
  if (total === 0 || revealed === 0) return "sealed";
  const pct = revealed / total;
  if (pct < 0.34) return "speculative";
  if (pct < 0.67) return "partial";
  return "confirmed";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { fragmentId, chunksToReveal = 3 } = await req.json();
    if (!fragmentId) {
      return new Response(
        JSON.stringify({ error: "fragmentId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get fragment
    const fragments = await sbGet(
      "fragment_archive",
      `id=eq.${fragmentId}&select=*`
    );
    if (!fragments?.length) {
      return new Response(
        JSON.stringify({ error: "Fragment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const fragment = fragments[0];

    if (!fragment.lore_entry_id) {
      return new Response(
        JSON.stringify({ error: "Fragment has no linked lore entry" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Find next N unrevealed chunks (ordered by chunk_index)
    const unrevealed = await sbGet(
      "lore_embeddings",
      `entry_id=eq.${fragment.lore_entry_id}&is_revealed=eq.false&order=chunk_index.asc&limit=${chunksToReveal}&select=id,chunk_text,chunk_index`
    );

    if (!unrevealed?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All chunks already revealed",
          revealedTexts: [],
          progress: {
            revealed: fragment.revealed_chunks,
            total: fragment.total_chunks,
            certainty: computeCertainty(fragment.revealed_chunks, fragment.total_chunks),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[decipher-fragment] Revealing ${unrevealed.length} chunks for fragment ${fragmentId}`
    );

    // 3. Generate embeddings and reveal each chunk
    const revealedTexts: string[] = [];
    let newlyRevealed = 0;

    for (const chunk of unrevealed) {
      // Generate embedding
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: chunk.chunk_text }] },
            outputDimensionality: 768,
          }),
        }
      );

      if (!resp.ok) {
        const t = await resp.text();
        console.error(`[decipher] Gemini error ${resp.status}: ${t}`);
        continue;
      }

      const data = await resp.json();
      const values = data?.embedding?.values;
      if (!values?.length) continue;

      // Update chunk: set embedding + is_revealed = true
      const ok = await sbPatch(`lore_embeddings`, `id=eq.${chunk.id}`, {
        embedding: JSON.stringify(values),
        is_revealed: true,
      });

      if (ok) {
        newlyRevealed++;
        revealedTexts.push(chunk.chunk_text);
      }
    }

    // 4. Update fragment progress
    const newRevealed = fragment.revealed_chunks + newlyRevealed;
    const newCertainty = computeCertainty(newRevealed, fragment.total_chunks);

    await sbPatch(`fragment_archive`, `id=eq.${fragmentId}`, {
      revealed_chunks: newRevealed,
      certainty_level: newCertainty,
      updated_at: new Date().toISOString(),
    });

    console.log(
      `[decipher-fragment] Revealed ${newlyRevealed} chunks. Progress: ${newRevealed}/${fragment.total_chunks} (${newCertainty})`
    );

    return new Response(
      JSON.stringify({
        success: true,
        revealedTexts,
        progress: {
          revealed: newRevealed,
          total: fragment.total_chunks,
          certainty: newCertainty,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[decipher-fragment] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
