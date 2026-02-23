import { ScrollText, Users, MessageSquare, Zap, GitBranch, Sparkles } from 'lucide-react';

interface GameScriptsProps {
  onNavigate: (page: string) => void;
}

const planned = [
  { icon: Users, title: 'Scripted NPC Events', desc: 'Use workflow nodes to define triggered NPC behaviors — boss spawns, quest sequences, patrol changes, and reactive world encounters.' },
  { icon: MessageSquare, title: 'Scripted Dialogue', desc: 'Build branching dialogue trees as workflows with condition nodes for player choices, NPC mood, and world state.' },
  { icon: Zap, title: 'Cannon Events', desc: 'Orchestrate timed or triggered world events — weather changes, sieges, spawns — as reusable workflow templates.' },
  { icon: GitBranch, title: 'Dialogue Options & Branching', desc: 'Model player choice trees with conditional paths, variable tracking, and outcome nodes for rich narrative flow.' },
];

export const GameScripts = ({ onNavigate: _onNavigate }: GameScriptsProps) => {
  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Game Scripts</h1>
          <p className="text-sm text-white/50">Workflow-driven game scripting &amp; dialogue</p>
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
              <item.icon className="w-4 h-4 text-purple-400" />
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
          <li>The existing Workflow Editor canvas is the intended runtime — no new editor needed.</li>
          <li>Create specialised node types: Dialogue Node, Branch Node, Event Trigger Node, Outcome Node.</li>
          <li>Templates for common patterns: fetch quests, escort missions, boss encounters, branching dialogue.</li>
          <li>Variable system for tracking player choices, quest flags, and world-state conditions.</li>
          <li>Preview / dry-run mode to test scripts before deploying to the live game world.</li>
        </ul>
      </div>
    </div>
  );
};
