import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { entryId, fileBase64, fileName, fileType } = body;
    if (!entryId) return new Response(JSON.stringify({ error: "entryId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    // If client sent base64, use it directly (no storage download needed)
    let extractedText = "";

    if (fileBase64 && geminiKey) {
      const name = fileName || "document";
      const type = (fileType || "").toLowerCase();
      const nameLower = name.toLowerCase();

      // Text-based files: decode base64 directly
      if (type.startsWith("text/") || nameLower.endsWith(".txt") || nameLower.endsWith(".md") || nameLower.endsWith(".json") || nameLower.endsWith(".csv")) {
        const bytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
        extractedText = new TextDecoder().decode(bytes);
      } else {
        // Binary docs (PDF, DOCX, etc.) — send to Gemini for extraction via native SDK
        const mimeType = type || "application/octet-stream";
        const ai = new GoogleGenAI({ apiKey: geminiKey });

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
    } else if (!fileBase64) {
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
