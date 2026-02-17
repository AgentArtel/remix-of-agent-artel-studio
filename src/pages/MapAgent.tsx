import { Map, Layers, MousePointerClick, Users, Compass, Sparkles } from 'lucide-react';

interface MapAgentProps {
  onNavigate: (page: string) => void;
}

const planned = [
  { icon: MousePointerClick, title: 'AI-Driven Map Editing', desc: 'Use natural-language commands to place, move, and configure map objects — terrain tiles, buildings, props, and more.' },
  { icon: Layers, title: 'Visual Map Builder', desc: 'A drag-and-drop canvas for composing maps layer by layer with real-time preview of the game world.' },
  { icon: Users, title: 'NPC Spawn Management', desc: 'Define and visualise NPC spawn points, patrol routes, and territory zones directly on the map.' },
  { icon: Compass, title: 'Game-World Integration', desc: 'Read and write map data from the game database so edits are immediately reflected in the live world.' },
];

export const MapAgent = ({ onNavigate: _onNavigate }: MapAgentProps) => {
  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
          <Map className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">AI Map Agent</h1>
          <p className="text-sm text-white/50">Programmatic map editor &amp; builder</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-yellow-500/15 border-yellow-500/30 text-yellow-400">
          <Sparkles className="w-3 h-3" />
          Coming Soon
        </span>
      </div>

      {/* Vision cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {planned.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-2"
          >
            <div className="flex items-center gap-2 text-white/80">
              <item.icon className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm">{item.title}</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-2">
        <h2 className="text-sm font-semibold text-white/80">Implementation Notes</h2>
        <ul className="list-disc list-inside text-sm text-white/50 space-y-1 leading-relaxed">
          <li>Canvas renderer — consider PixiJS or raw Canvas 2D for tile rendering.</li>
          <li>Tiled JSON import/export support for interop with existing map editors.</li>
          <li>AI command bar powered by Gemini for natural-language map manipulation.</li>
          <li>Layer system: ground, objects, collision, events, spawn zones.</li>
          <li>Undo/redo history with the existing useUndoRedo hook pattern.</li>
        </ul>
      </div>
    </div>
  );
};
