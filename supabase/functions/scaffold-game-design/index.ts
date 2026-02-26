import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_ID = "the-architect";
const SESSION_ID = "architect-diagrams";

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
      mode = "game", // "game" or "system"
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the running the-architect agent
    const { data: architectAgent } = await supabase
      .from("picoclaw_agents")
      .select("id, picoclaw_agent_id")
      .eq("picoclaw_agent_id", "the-architect")
      .eq("deployment_status", "running")
      .limit(1)
      .single();

    if (!architectAgent) {
      throw new Error("the-architect agent is not deployed. Deploy it first from the Agent Builder.");
    }

    const userPrompt = mode === "system"
      ? `Analyze the following system and produce an UPDATED, accurate system architecture diagram based on the current implementation.

## System: ${systemTitle}
**ID:** ${systemId}
**Description:** ${systemDescription}

### Current System Nodes (may be outdated)
${(nodesSummary || [])
  .map((n: any) => `- ${n.id} (${n.type}): ${n.title} — ${n.subtitle}`)
  .join("\n")}

### Edge Functions Used
${(edgeFunctions || []).map((f: string) => `- ${f}`).join("\n")}

### Database Tables Used
${(tables || []).map((t: string) => `- ${t}`).join("\n")}

Produce an updated system architecture diagram as a JSON object with two arrays: "nodes" and "connections".

Each node must have: id (string), type (one of: trigger, webhook, code-tool, http-tool, memory, ai-agent, picoclaw-agent, game-show-text, game-give-item, game-give-gold, game-teleport, game-open-gui, game-set-variable), position ({x, y} using col*280 and row*180), title (string), subtitle (string), isConfigured (boolean).

Each connection must have: id (string), from (string), to (string), fromPort ("output"), toPort ("input"), label (string, optional).

Include 6-12 nodes showing the actual data flow of this system: entry points, edge functions, database interactions, AI routing, and outputs. Reflect the REAL architecture accurately.

IMPORTANT: Return ONLY a valid JSON object with "nodes" and "connections" arrays. No commentary, no markdown fences.`
      : `Analyze the following system and produce a game integration diagram showing how it connects to RPG game runtime.

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

    console.log(`[scaffold-game-design] Routing through picoclaw-bridge for system: ${systemTitle}`);

    let nodes: any[] = [];
    let connections: any[] = [];

    // Route through picoclaw-bridge edge function (handles model aliasing, temperature clamping, direct LLM calls)
    const bridgeRes = await supabase.functions.invoke("picoclaw-bridge", {
      body: {
        action: "chat",
        agentId: architectAgent.id,
        message: userPrompt,
        sessionId: `architect-${systemId}`,
      },
    });

    if (bridgeRes.error) {
      console.error("[scaffold-game-design] picoclaw-bridge error:", bridgeRes.error);
      throw new Error(`picoclaw-bridge failed: ${bridgeRes.error.message || JSON.stringify(bridgeRes.error)}`);
    }

    const responseText = bridgeRes.data?.response || "";
    console.log(`[scaffold-game-design] Bridge response length: ${responseText.length}`);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const diagram = JSON.parse(jsonMatch[0]);
        if (Array.isArray(diagram.nodes) && diagram.nodes.length > 0) {
          nodes = diagram.nodes;
          connections = Array.isArray(diagram.connections) ? diagram.connections : [];
          console.log(`[scaffold-game-design] Generated ${nodes.length} nodes`);
        }
      } catch (parseErr) {
        console.error("[scaffold-game-design] JSON parse error:", parseErr);
      }
    }

    if (nodes.length === 0) {
      console.error("[scaffold-game-design] Raw response:", responseText.substring(0, 500));
      throw new Error("the-architect did not return valid diagram nodes. Check the agent's model and prompt.");
    }

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
