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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    // Tool definition for structured output
    const generateDiagramTool = {
      type: "function",
      function: {
        name: "generate_diagram",
        description:
          "Generate an architecture diagram with nodes and connections",
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
                      "trigger",
                      "webhook",
                      "code-tool",
                      "http-tool",
                      "memory",
                      "ai-agent",
                      "picoclaw-agent",
                      "game-show-text",
                      "game-give-item",
                      "game-give-gold",
                      "game-teleport",
                      "game-open-gui",
                      "game-set-variable",
                    ],
                  },
                  position: {
                    type: "object",
                    properties: {
                      x: { type: "number" },
                      y: { type: "number" },
                    },
                    required: ["x", "y"],
                  },
                  title: { type: "string" },
                  subtitle: { type: "string" },
                  isConfigured: { type: "boolean" },
                },
                required: [
                  "id",
                  "type",
                  "position",
                  "title",
                  "subtitle",
                  "isConfigured",
                ],
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
      },
    };

    const messages = [
      {
        role: "system",
        content: `${soulMd}\n\n---\n\n${identityMd}`,
      },
      ...memoryMessages,
      { role: "user", content: userPrompt },
    ];

    console.log(
      `[scaffold-game-design] Calling AI for system: ${systemTitle}`
    );

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          tools: [generateDiagramTool],
          tool_choice: {
            type: "function",
            function: { name: "generate_diagram" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(
        `[scaffold-game-design] AI gateway error: ${aiResponse.status}`,
        errText
      );

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Payment required, please add AI credits.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "generate_diagram") {
      console.error(
        "[scaffold-game-design] No valid tool call in response",
        JSON.stringify(aiData.choices?.[0]?.message)
      );
      throw new Error("AI did not return a valid diagram tool call");
    }

    const diagram = JSON.parse(toolCall.function.arguments);
    const { nodes, connections } = diagram;

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
