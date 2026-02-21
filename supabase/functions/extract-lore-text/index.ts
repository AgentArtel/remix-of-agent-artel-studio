import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Use Gemini (via Lovable AI Gateway) to extract text from a PDF.
 * Gemini natively handles PDFs as multimodal input.
 */
async function extractTextWithAI(
  fileBytes: Uint8Array,
  fileName: string,
  apiKey: string,
): Promise<string> {
  // Chunk the conversion to avoid stack overflow on large files
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < fileBytes.length; i += chunkSize) {
    const chunk = fileBytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ALL text content from this PDF document verbatim. Preserve paragraph structure and formatting. Return ONLY the extracted text, no commentary or explanation. If the document contains images with text, OCR them. File: ${fileName}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[extract-lore-text] AI gateway error:", response.status, errText);
    throw new Error(`AI gateway returned ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
      // Use AI to extract text from PDF (handles compressed, scanned, etc.)
      const buffer = new Uint8Array(await fileData.arrayBuffer());
      extractedText = await extractTextWithAI(buffer, entry.file_name || "document.pdf", apiKey);
      if (!extractedText) {
        extractedText = "[PDF text extraction returned empty.]";
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
