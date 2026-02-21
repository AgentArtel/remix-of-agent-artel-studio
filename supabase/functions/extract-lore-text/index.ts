import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Try to inflate (zlib decompress) a Uint8Array.
 * Returns null if decompression fails.
 */
async function tryInflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  // PDF FlateDecode uses raw deflate (RFC 1951), not zlib or gzip.
  // DecompressionStream("raw") is available in some runtimes.
  // We'll try "raw" first, then "deflate" as fallback.
  for (const format of ["raw", "deflate"] as const) {
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();

      // Write in a microtask to avoid blocking
      const writePromise = writer.write(bytes).then(() => writer.close()).catch(() => {
        try { writer.close(); } catch { /* ignore */ }
      });

      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } catch {
        // Read error — decompression failed for this format
        await writePromise;
        continue;
      }

      await writePromise;

      if (chunks.length === 0) continue;
      const totalLen = chunks.reduce((a, c) => a + c.length, 0);
      const result = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    } catch {
      continue;
    }
  }
  return null;
}

function extractTextOperators(content: string, texts: string[]) {
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    // Tj operator
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(block)) !== null) {
      texts.push(tj[1]);
    }
    // TJ array operator
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tja: RegExpExecArray | null;
    while ((tja = tjArrayRegex.exec(block)) !== null) {
      const inner = tja[1];
      const parts = /\(([^)]*)\)/g;
      let p: RegExpExecArray | null;
      while ((p = parts.exec(inner)) !== null) {
        texts.push(p[1]);
      }
    }
  }
}

/**
 * Extract text from PDF by finding streams, decompressing FlateDecode ones,
 * and parsing text operators.
 */
async function extractTextFromPdf(buffer: Uint8Array): Promise<string> {
  const raw = new TextDecoder("latin1").decode(buffer);
  const texts: string[] = [];

  // First try uncompressed text operators in the raw PDF
  extractTextOperators(raw, texts);

  // Find all stream objects
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(raw)) !== null) {
    // Check if FlateDecode
    const before = raw.substring(Math.max(0, match.index - 500), match.index);
    if (!before.includes("/FlateDecode")) continue;

    const streamContent = match[1];
    // Convert latin1 string back to bytes
    const bytes = new Uint8Array(streamContent.length);
    for (let i = 0; i < streamContent.length; i++) {
      bytes[i] = streamContent.charCodeAt(i);
    }

    const decompressed = await tryInflate(bytes);
    if (!decompressed) continue;

    const text = new TextDecoder("latin1").decode(decompressed);
    extractTextOperators(text, texts);
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of texts) {
    const trimmed = t.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      unique.push(trimmed);
    }
  }

  return unique.join(" ").replace(/\\n/g, "\n").replace(/\s{2,}/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entryId } = await req.json();
    if (!entryId) {
      return new Response(JSON.stringify({ error: "entryId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Fetch the lore entry
    const { data: entry, error: fetchErr } = await supabase
      .from("world_lore_entries")
      .select("id, storage_path, file_type, file_name, content")
      .eq("id", entryId)
      .single();

    if (fetchErr || !entry) {
      return new Response(
        JSON.stringify({ error: "Entry not found", details: fetchErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!entry.storage_path) {
      return new Response(
        JSON.stringify({ error: "No file attached to this entry" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Download the file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("world-lore")
      .download(entry.storage_path);

    if (dlErr || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download file", details: dlErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Extract text based on file type
    let extractedText = "";
    const fileType = (entry.file_type || "").toLowerCase();
    const fileName = (entry.file_name || "").toLowerCase();

    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      const buffer = new Uint8Array(await fileData.arrayBuffer());
      extractedText = await extractTextFromPdf(buffer);
      if (!extractedText) {
        extractedText =
          "[PDF text extraction returned empty — this PDF may be scanned/image-based. OCR is not yet supported.]";
      }
    } else if (
      fileType.startsWith("text/") ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".json") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".xml") ||
      fileName.endsWith(".yaml") ||
      fileName.endsWith(".yml")
    ) {
      extractedText = await fileData.text();
    } else {
      extractedText = `[Unsupported file type: ${fileType || fileName}. Text extraction is available for PDF and text-based files.]`;
    }

    // 4. Update the entry with extracted content
    const { error: updateErr } = await supabase
      .from("world_lore_entries")
      .update({ content: extractedText })
      .eq("id", entryId);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to update entry", details: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, contentLength: extractedText.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
