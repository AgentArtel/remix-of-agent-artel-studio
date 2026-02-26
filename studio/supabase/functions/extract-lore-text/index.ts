import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PICOCLAW_GATEWAY_URL = Deno.env.get("PICOCLAW_GATEWAY_URL") || "http://localhost:18790";
const PICOCLAW_TIMEOUT_MS = 120_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { entryId, fileBase64, fileName, fileType } = body;
    if (!entryId) return new Response(JSON.stringify({ error: "entryId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let extractedText = "";

    if (fileBase64) {
      const name = fileName || "document";
      const type = (fileType || "").toLowerCase();
      const nameLower = name.toLowerCase();

      // Text-based files: decode base64 directly (no AI needed)
      if (type.startsWith("text/") || nameLower.endsWith(".txt") || nameLower.endsWith(".md") || nameLower.endsWith(".json") || nameLower.endsWith(".csv")) {
        const bytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
        extractedText = new TextDecoder().decode(bytes);
      } else {
        // Binary docs (PDF, DOCX, etc.) — route through PicoClaw for extraction
        // The fragment-archivist agent handles document analysis
        const extractionPrompt = `Extract ALL text from this document verbatim. Preserve paragraphs and structure. Return ONLY the extracted text, no commentary. File: ${name}

Note: The document is base64-encoded ${type || 'binary'} data. The first 2000 characters of base64: ${fileBase64.substring(0, 2000)}...

If you cannot decode the binary directly, describe what you know about the file format and return any text you can extract.`;

        try {
          const picoRes = await fetch(`${PICOCLAW_GATEWAY_URL}/v1/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: extractionPrompt,
              session_key: `agent:the-fragment-archivist:extract-${entryId}`,
              agent_id: "the-fragment-archivist",
            }),
            signal: AbortSignal.timeout(PICOCLAW_TIMEOUT_MS),
          });

          if (picoRes.ok) {
            const picoData = await picoRes.json();
            extractedText = picoData.response?.trim() || "";
          } else {
            const errText = await picoRes.text();
            console.error("[extract-lore-text] PicoClaw error:", picoRes.status, errText);
          }
        } catch (picoErr) {
          console.error("[extract-lore-text] PicoClaw unreachable:", picoErr);
        }

        // Fallback: use Gemini API directly if PicoClaw failed and we have a key
        if (!extractedText) {
          const geminiKey = Deno.env.get("GEMINI_API_KEY");
          if (geminiKey) {
            console.log("[extract-lore-text] Falling back to direct Gemini API");
            const { GoogleGenAI } = await import("npm:@google/genai");
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            const mimeType = type || "application/octet-stream";

            const response = await ai.models.generateContent({
              model: "gemini-2.0-flash-lite",
              contents: [{
                role: "user",
                parts: [
                  { text: `Extract ALL text from this document verbatim. Preserve paragraphs and structure. Return ONLY the extracted text, no commentary. File: ${name}` },
                  { inlineData: { mimeType, data: fileBase64 } },
                ],
              }],
            });

            extractedText = response.text?.trim() || "";
          }
        }
      }
    } else {
      // Fallback: try to read content from DB (for entries that already have content)
      const { data: entry } = await supabase.from("world_lore_entries").select("content").eq("id", entryId).single();
      extractedText = entry?.content || "";
    }

    // Save extracted text to DB
    if (extractedText) {
      await supabase.from("world_lore_entries").update({ content: extractedText }).eq("id", entryId);
    }

    return new Response(JSON.stringify({ success: true, contentLength: extractedText.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[extract-lore-text] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
