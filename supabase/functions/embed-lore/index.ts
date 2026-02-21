import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): { text: string; index: number }[] {
  if (text.length <= CHUNK_SIZE) return [{ text, index: 0 }];
  const chunks: { text: string; index: number }[] = [];
  let start = 0, idx = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const pb = text.lastIndexOf("\n\n", end);
      if (pb > start + CHUNK_SIZE * 0.5) end = pb + 2;
      else { const sb = text.lastIndexOf(". ", end); if (sb > start + CHUNK_SIZE * 0.5) end = sb + 2; }
    }
    const s = text.slice(start, end).trim();
    if (s.length >= 100) chunks.push({ text: s, index: idx++ });
    start = end - CHUNK_OVERLAP;
    if (start >= text.length) break;
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entryId } = await req.json();
    if (!entryId) return new Response(JSON.stringify({ error: "entryId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: entry, error: fetchErr } = await supabase.from("world_lore_entries").select("id, content").eq("id", entryId).single();
    if (fetchErr || !entry?.content) return new Response(JSON.stringify({ error: "Entry not found or no content" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const chunks = chunkText(entry.content);
    console.log(`[embed-lore] ${chunks.length} chunks for entry ${entryId}`);

    // Delete existing embeddings
    await supabase.from("lore_embeddings").delete().eq("entry_id", entryId);

    let indexed = 0;
    for (const chunk of chunks) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: { parts: [{ text: chunk.text }] } }) },
      );
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();
      const values = data?.embedding?.values;
      if (!values?.length) continue;

      const { error: insertErr } = await supabase.from("lore_embeddings").insert({
        entry_id: entryId, chunk_index: chunk.index, chunk_text: chunk.text,
        embedding: JSON.stringify(values), token_count: Math.ceil(chunk.text.length / 4),
      });
      if (!insertErr) indexed++;
    }

    console.log(`[embed-lore] Indexed ${indexed}/${chunks.length} chunks`);
    return new Response(JSON.stringify({ success: true, chunksIndexed: indexed, totalChunks: chunks.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
