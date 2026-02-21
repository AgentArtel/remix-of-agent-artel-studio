const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sbHeaders = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function sbDelete(table: string, query: string) {
  await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { method: "DELETE", headers: sbHeaders });
}

async function sbInsert(table: string, body: unknown) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...sbHeaders, "Prefer": "return=minimal" }, body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errText = await r.text();
    console.error(`[sbInsert] ${r.status}: ${errText}`);
  }
  return r.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Accepts: { entryId, chunks: [{text, index}], clearExisting?: boolean }
    const { entryId, chunks, clearExisting = false } = await req.json();
    if (!entryId || !chunks?.length) {
      return new Response(JSON.stringify({ error: "entryId and chunks[] required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (clearExisting) {
      await sbDelete("lore_embeddings", `entry_id=eq.${entryId}`);
    }

    console.log(`[embed-lore] Processing ${chunks.length} chunks for entry ${entryId}`);

    let indexed = 0;
    for (const chunk of chunks) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: { parts: [{ text: chunk.text }] }, outputDimensionality: 768 }) },
      );
      if (!resp.ok) { const t = await resp.text(); console.error(`[embed] Gemini error ${resp.status}: ${t}`); continue; }
      const data = await resp.json();
      const values = data?.embedding?.values;
      if (!values?.length) continue;

      const ok = await sbInsert("lore_embeddings", {
        entry_id: entryId, chunk_index: chunk.index, chunk_text: chunk.text,
        embedding: JSON.stringify(values), token_count: Math.ceil(chunk.text.length / 4),
      });
      if (ok) indexed++;
    }

    console.log(`[embed-lore] Indexed ${indexed}/${chunks.length}`);
    return new Response(JSON.stringify({ success: true, chunksIndexed: indexed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
