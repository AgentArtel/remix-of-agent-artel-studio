import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_ID = "the-architect";
const SESSION_ID = "architect-diagrams";
const MEMORY_WINDOW = 20;
const PICOCLAW_GATEWAY_URL = Deno.env.get("PICOCLAW_GATEWAY_URL") || "http://localhost:18790";
const PICOCLAW_TIMEOUT_MS = 90_000;

// Tool schema for structured diagram output (Gemini native format)
const diagramFunctionDeclaration = {
  name: "generate_diagram",
  description: "Generate an architecture diagram with nodes and connections",
  parameters: {
    type: "object",
    properties: {
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: {
              type: "string",
              enum: [
                "trigger", "webhook", "code-tool", "http-tool", "memory",
                "ai-agent", "picoclaw-agent", "game-show-text", "game-give-item",
                "game-give-gold", "game-teleport", "game-open-gui", "game-set-variable",
              ],
            },
            position: {
              type: "object",
              properties: { x: { type: "number" }, y: { type: "number" } },
              required: ["x", "y"],
            },
            title: { type: "string" },
            subtitle: { type: "string" },
            isConfigured: { type: "boolean" },
          },
          required: ["id", "type", "position", "title", "subtitle", "isConfigured"],
        },
      },
      connections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
            fromPort: { type: "string", enum: ["output"] },
            toPort: { type: "string", enum: ["input"] },
            label: { type: "string" },
          },
          required: ["id", "from", "to", "fromPort", "toPort"],
        },
      },
    },
    required: ["nodes", "connections"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const {
      systemId,
      systemTitle,
      systemDescription,
      nodesSummary,
      edgeFunctions,
      tables,
    } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load agent record for soul/identity context
    const { data: agent } = await supabase
      .from("picoclaw_agents")
      .select("soul_md, identity_md")
      .eq("picoclaw_agent_id", AGENT_ID)
      .single();

    const soulMd = agent?.soul_md || "";
    const identityMd = agent?.identity_md || "";

    // Load memory (last N messages)
    const { data: memoryRows } = await supabase
      .from("studio_agent_memory")
      .select("role, content")
      .eq("agent_id", AGENT_ID)
      .eq("session_id", SESSION_ID)
      .order("created_at", { ascending: false })
      .limit(MEMORY_WINDOW);

    const memoryMessages = (memoryRows || [])
      .reverse()
      .map((r: any) => ({ role: r.role, content: r.content }));

    // Build the user prompt with system metadata
    const userPrompt = `Analyze the following system and produce a game integration diagram showing how it connects to RPG game runtime.

## System: ${systemTitle}
**ID:** ${systemId}
**Description:** ${systemDescription}

### Existing System Nodes
${(nodesSummary || [])
  .map((n: any) => `- ${n.id} (${n.type}): ${n.title} — ${n.subtitle}`)
  .join("\n")}

### Edge Functions Used
${(edgeFunctions || []).map((f: string) => `- ${f}`).join("\n")}

### Database Tables Used
${(tables || []).map((t: string) => `- ${t}`).join("\n")}

Produce a game integration diagram with 6-10 nodes showing the realistic game-side flow for this system. Include:
- How the system output reaches the game client
- PicoClaw agent routing if applicable
- Relevant game action nodes (game-show-text, game-give-item, game-teleport, etc.)
- Database interactions on the game side
- Use the row(col, rowIdx) positioning: position = { x: col * 280, y: rowIdx * 180 }
- Prefix all node IDs with "gi-" (game integration)
- Make connections that reflect real data flow, not generic templates`;

    console.log(
      `[scaffold-game-design] Calling AI for system: ${systemTitle}`
    );

    let nodes: any[];
    let connections: any[];

    // Primary path: route through PicoClaw (the-architect agent)
    let usedPicoClaw = false;
    try {
      const picoRes = await fetch(`${PICOCLAW_GATEWAY_URL}/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userPrompt,
          session_key: `agent:the-architect:architect-${systemId}`,
          agent_id: "the-architect",
        }),
        signal: AbortSignal.timeout(PICOCLAW_TIMEOUT_MS),
      });

      if (picoRes.ok) {
        const picoData = await picoRes.json();
        const responseText = picoData.response || "";

        // Extract JSON from response — the-architect is configured to output only JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const diagram = JSON.parse(jsonMatch[0]);
          if (Array.isArray(diagram.nodes) && diagram.nodes.length > 0) {
            nodes = diagram.nodes;
            connections = Array.isArray(diagram.connections) ? diagram.connections : [];
            usedPicoClaw = true;
            console.log(`[scaffold-game-design] PicoClaw generated ${nodes.length} nodes`);
          }
        }
      }
    } catch (picoErr) {
      console.warn("[scaffold-game-design] PicoClaw unavailable, falling back to Gemini direct:", picoErr);
    }

    // Fallback: direct Gemini API via native SDK with tool calling
    if (!usedPicoClaw) {
      console.log("[scaffold-game-design] Using Gemini native SDK with tool calling");

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      // Build contents array for Gemini native format
      const contents = memoryMessages
        .map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      contents.push({ role: "user", parts: [{ text: userPrompt }] });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: `${soulMd}\n\n---\n\n${identityMd}`,
          temperature: 0.3,
          tools: [{ functionDeclarations: [diagramFunctionDeclaration] }],
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY" as any,
              allowedFunctionNames: ["generate_diagram"],
            },
          },
        },
      });

      // Extract function call from response
      const functionCall = response.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.functionCall
      )?.functionCall;

      if (!functionCall || functionCall.name !== "generate_diagram") {
        console.error(
          "[scaffold-game-design] No valid function call in response",
          JSON.stringify(response.candidates?.[0]?.content)
        );
        throw new Error("AI did not return a valid diagram function call");
      }

      const args = functionCall.args as any;
      nodes = args.nodes;
      connections = args.connections;
    }

    // Validate basic structure
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error("AI returned empty nodes array");
    }
    if (!Array.isArray(connections)) {
      throw new Error("AI returned invalid connections");
    }

    // Save memory: user prompt + assistant response
    const assistantContent = JSON.stringify({ nodes_count: nodes.length, connections_count: connections.length, system: systemTitle });
    await supabase.from("studio_agent_memory").insert([
      {
        agent_id: AGENT_ID,
        session_id: SESSION_ID,
        role: "user",
        content: userPrompt,
      },
      {
        agent_id: AGENT_ID,
        session_id: SESSION_ID,
        role: "assistant",
        content: assistantContent,
      },
    ]);

    console.log(
      `[scaffold-game-design] Generated ${nodes.length} nodes, ${connections.length} connections for ${systemTitle}`
    );

    return new Response(
      JSON.stringify({ success: true, nodes, connections }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[scaffold-game-design] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
