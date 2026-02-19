import React, { useState, useRef, useEffect } from 'react';
import {
  Search, X, Bot, MessageSquare, Database, Globe, Code2, Webhook,
  Sparkles, Clock, GitBranch, Filter, ImageIcon, Eye, Mail, Hash, Pencil,
} from 'lucide-react';
import type { NodeType } from '@/types';

interface NodeCategory {
  id: string;
  label: string;
  nodes: NodeItem[];
}

interface NodeItem {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const nodeCategories: NodeCategory[] = [
  {
    id: 'triggers',
    label: 'Triggers',
    nodes: [
      { id: 'manual-trigger', type: 'trigger', label: 'Manual Trigger', description: 'Start workflow manually', icon: Sparkles },
      { id: 'webhook-trigger', type: 'webhook', label: 'Webhook', description: 'Triggered by HTTP request', icon: Webhook },
      { id: 'schedule-trigger', type: 'schedule', label: 'Schedule', description: 'Run on cron schedule', icon: Clock },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    nodes: [
      { id: 'gmail', type: 'gmail', label: 'Gmail', description: 'Read, send, label emails', icon: Mail },
      { id: 'slack', type: 'slack', label: 'Slack', description: 'Post messages to Slack', icon: MessageSquare },
      { id: 'http-request', type: 'http-tool', label: 'HTTP Request', description: 'Make an HTTP API call', icon: Globe },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    nodes: [
      { id: 'set', type: 'set', label: 'Set', description: 'Set or transform field values', icon: Pencil },
      { id: 'if-condition', type: 'if', label: 'IF', description: 'Branch on a condition', icon: GitBranch },
      { id: 'code-tool', type: 'code-tool', label: 'Code', description: 'Run JavaScript', icon: Code2 },
      { id: 'merge', type: 'merge', label: 'Merge', description: 'Combine data from branches', icon: Filter },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    nodes: [
      { id: 'ai-agent', type: 'ai-agent', label: 'AI Agent', description: 'Autonomous AI with tools', icon: Bot },
      { id: 'openai-chat', type: 'openai-chat', label: 'OpenAI Chat', description: 'GPT chat completion', icon: Sparkles },
      { id: 'anthropic-chat', type: 'anthropic-chat', label: 'Claude', description: 'Anthropic Claude completion', icon: Sparkles },
      { id: 'gemini-chat', type: 'gemini-chat', label: 'Gemini Chat', description: 'Google Gemini chat', icon: Hash },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    nodes: [
      { id: 'image-gen', type: 'image-gen', label: 'Image Gen', description: 'Generate an image', icon: ImageIcon },
      { id: 'memory', type: 'memory', label: 'Memory', description: 'Persist conversation context', icon: Database },
      { id: 'gemini-embed', type: 'gemini-embed', label: 'Gemini Embed', description: 'Text embeddings via Gemini', icon: Database },
      { id: 'gemini-vision', type: 'gemini-vision', label: 'Gemini Vision', description: 'Image understanding via Gemini', icon: Eye },
    ],
  },
];

interface NodeSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeType: NodeType) => void;
  position?: { x: number; y: number };
}

export const NodeSearchPalette: React.FC<NodeSearchPaletteProps> = ({
  isOpen,
  onClose,
  onSelectNode,
  position: _position,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allNodes = nodeCategories.flatMap(cat => cat.nodes);
  const filteredNodes = allNodes.filter(node =>
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredNodes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredNodes.length) % filteredNodes.length);
      } else if (e.key === 'Enter' && filteredNodes[selectedIndex]) {
        onSelectNode(filteredNodes[selectedIndex].type);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNodes, selectedIndex, onClose, onSelectNode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-dark-100 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
          <Search className="w-5 h-5 text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search nodes..."
            className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none"
          />
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {searchQuery ? (
            <div className="p-2">
              {filteredNodes.map((node, index) => (
                <button
                  key={node.id}
                  onClick={() => { onSelectNode(node.type); onClose(); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${index === selectedIndex ? 'bg-green/10 border border-green/30' : 'hover:bg-white/5'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center">
                    <node.icon className="w-5 h-5 text-white/60" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{node.label}</p>
                    <p className="text-xs text-white/50">{node.description}</p>
                  </div>
                </button>
              ))}
              {filteredNodes.length === 0 && (
                <div className="p-8 text-center text-white/40">No nodes found</div>
              )}
            </div>
          ) : (
            nodeCategories.map(category => (
              <div key={category.id} className="p-2">
                <p className="px-3 py-2 text-[11px] uppercase tracking-wider text-white/40 font-medium">{category.label}</p>
                {category.nodes.map((node, index) => {
                  const globalIndex = nodeCategories
                    .slice(0, nodeCategories.findIndex(c => c.id === category.id))
                    .reduce((acc, c) => acc + c.nodes.length, 0) + index;
                  return (
                    <button
                      key={node.id}
                      onClick={() => { onSelectNode(node.type); onClose(); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${globalIndex === selectedIndex ? 'bg-green/10 border border-green/30' : 'hover:bg-white/5'}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center">
                        <node.icon className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{node.label}</p>
                        <p className="text-xs text-white/50">{node.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-dark-200/50 border-t border-white/5 text-xs text-white/40">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
