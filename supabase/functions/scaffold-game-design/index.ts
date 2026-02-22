import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

Produce a game integration diagram as a JSON object with two arrays: "nodes" and "connections".

Each node must have: id (string, prefixed "gi-"), type (one of: trigger, webhook, code-tool, http-tool, memory, ai-agent, picoclaw-agent, game-show-text, game-give-item, game-give-gold, game-teleport, game-open-gui, game-set-variable), position ({x, y} using col*280 and row*180), title (string), subtitle (string), isConfigured (boolean).

Each connection must have: id (string), from (string), to (string), fromPort ("output"), toPort ("input"), label (string, optional).

Include 6-10 nodes showing: how system output reaches the game client, PicoClaw agent routing if applicable, relevant game action nodes, database interactions on the game side.

IMPORTANT: Return ONLY a valid JSON object with "nodes" and "connections" arrays. No commentary, no markdown fences.`;

    console.log(`[scaffold-game-design] Calling PicoClaw (the-architect) for system: ${systemTitle}`);

    let nodes: any[] | undefined;
    let connections: any[] | undefined;

    // Route through PicoClaw (the-architect agent)
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

        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const diagram = JSON.parse(jsonMatch[0]);
          if (Array.isArray(diagram.nodes) && diagram.nodes.length > 0) {
            nodes = diagram.nodes;
            connections = Array.isArray(diagram.connections) ? diagram.connections : [];
            console.log(`[scaffold-game-design] PicoClaw generated ${nodes.length} nodes`);
          }
        }
      } else {
        const errText = await picoRes.text();
        console.error(`[scaffold-game-design] PicoClaw returned ${picoRes.status}: ${errText}`);
      }
    } catch (picoErr) {
      console.error("[scaffold-game-design] PicoClaw error:", picoErr);
    }

    if (!nodes || nodes.length === 0) {
      throw new Error("PicoClaw did not return valid diagram nodes. Ensure the-architect agent is deployed.");
    }

    if (!connections) {
      connections = [];
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
