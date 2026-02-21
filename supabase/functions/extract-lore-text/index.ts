import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Chunking ────────────────────────────────────────────────────────────────

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

// ── Embedding via Gemini REST API ───────────────────────────────────────────

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: { parts: [{ text }] } }) },
  );
  if (!resp.ok) { await resp.text(); return []; }
  const data = await resp.json();
  return data?.embedding?.values ?? [];
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { entryId, mode } = body; // mode: "extract" | "embed" | undefined (both)
    if (!entryId) return new Response(JSON.stringify({ error: "entryId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    const { data: entry, error: fetchErr } = await supabase.from("world_lore_entries").select("id, storage_path, file_type, file_name, content").eq("id", entryId).single();
    if (fetchErr || !entry) return new Response(JSON.stringify({ error: "Entry not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let extractedText = entry.content || "";
    const doExtract = mode !== "embed";
    const doEmbed = mode !== "extract";

    // ── EXTRACT phase ──
    if (doExtract && entry.storage_path && !entry.content) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: fileData, error: dlErr } = await supabase.storage.from("world-lore").download(entry.storage_path);
      if (dlErr || !fileData) return new Response(JSON.stringify({ error: "Download failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const fileType = (entry.file_type || "").toLowerCase();
      const fileName = (entry.file_name || "").toLowerCase();

      if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
        const buffer = new Uint8Array(await fileData.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buffer.length; i += 8192) binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
        const base64 = btoa(binary);

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: [
              { type: "text", text: `Extract ALL text from this PDF verbatim. Preserve paragraphs. Return ONLY the text. OCR any images. File: ${entry.file_name}` },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
            ]}],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          extractedText = data.choices?.[0]?.message?.content?.trim() || "";
        } else { await resp.text(); }
      } else if (fileType.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".json") || fileName.endsWith(".csv")) {
        extractedText = await fileData.text();
      }

      if (extractedText) {
        await supabase.from("world_lore_entries").update({ content: extractedText }).eq("id", entryId);
      }

      // Return early after extraction — embedding will be called separately to stay under memory limits
      if (!doEmbed || !geminiKey) {
        return new Response(JSON.stringify({ success: true, contentLength: extractedText.length, chunksIndexed: 0, needsEmbed: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── EMBED phase ──
    let chunksIndexed = 0;
    if (doEmbed && extractedText && !extractedText.startsWith("[") && geminiKey) {
      const chunks = chunkText(extractedText);
      console.log(`[extract-lore-text] Chunking: ${chunks.length} segments`);

      await supabase.from("lore_embeddings").delete().eq("entry_id", entryId);

      for (const chunk of chunks) {
        const embedding = await embedText(chunk.text, geminiKey);
        if (embedding.length > 0) {
          const { error: insertErr } = await supabase.from("lore_embeddings").insert({
            entry_id: entryId,
            chunk_index: chunk.index,
            chunk_text: chunk.text,
            embedding: JSON.stringify(embedding),
            token_count: Math.ceil(chunk.text.length / 4),
          });
          if (!insertErr) chunksIndexed++;
          else console.error("[extract-lore-text] Insert error:", insertErr.message);
        }
      }
      console.log(`[extract-lore-text] Indexed ${chunksIndexed} chunks`);
    }

    return new Response(JSON.stringify({ success: true, contentLength: extractedText.length, chunksIndexed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
