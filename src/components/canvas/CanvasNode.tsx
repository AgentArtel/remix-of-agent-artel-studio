import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, Bot, MessageSquare, Database, Globe, Code2, Webhook, Sparkles, ImageIcon, Eye, Package, Coins, MapPin, LayoutDashboard, Variable, Cpu } from 'lucide-react';
import type { NodeData } from '@/types';
import type { PortType } from '@/lib/portRegistry';

interface HighlightedPort {
  nodeId: string;
  portId: string;
}

interface CanvasNodeProps {
  data: NodeData;
  isSelected?: boolean;
  isRunning?: boolean;
  executionStatus?: 'waiting' | 'running' | 'success' | 'error' | 'skipped';
  connectedToolCount?: number;
  hasMemory?: boolean;
  isConnectionDrawing?: boolean;
  highlightedPorts?: HighlightedPort[];
  snappedPortId?: string | null;
  onClick?: (e?: React.MouseEvent) => void;
  onDragStart?: (e: React.MouseEvent, nodeId: string) => void;
  onPortMouseDown?: (e: React.MouseEvent, portId: string, portType: PortType) => void;
  onPortMouseUp?: (e: React.MouseEvent, portId: string, portType: PortType) => void;
  className?: string;
}

// ── Per-type visual config ──────────────────────────────────────────────

interface NodeStyle {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;      // icon foreground
  iconBg: string;         // icon container bg
  borderAccent: string;   // left border color
  bgTint: string;         // subtle card bg tint
  width: number;          // card width in px
  label?: string;         // optional type label below subtitle
}

const nodeStyles: Record<string, NodeStyle> = {
  'trigger': {
    icon: MessageSquare,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/15',
    borderAccent: 'border-l-blue-400',
    bgTint: 'bg-blue-500/[0.03]',
    width: 200,
    label: 'Trigger',
  },
  'ai-agent': {
    icon: Bot,
    iconColor: 'text-green',
    iconBg: 'bg-green/15',
    borderAccent: 'border-l-green',
    bgTint: 'bg-green/[0.04]',
    width: 240,
    label: 'AI Agent',
  },
  'memory': {
    icon: Database,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/15',
    borderAccent: 'border-l-purple-400',
    bgTint: 'bg-purple-500/[0.03]',
    width: 200,
    label: 'Database',
  },
  'webhook': {
    icon: Webhook,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/15',
    borderAccent: 'border-l-orange-400',
    bgTint: 'bg-orange-500/[0.03]',
    width: 220,
    label: 'Edge Function',
  },
  'http-tool': {
    icon: Globe,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    borderAccent: 'border-l-cyan-400',
    bgTint: 'bg-cyan-500/[0.03]',
    width: 220,
    label: 'HTTP Request',
  },
  'code-tool': {
    icon: Code2,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/15',
    borderAccent: 'border-l-yellow-400',
    bgTint: 'bg-yellow-500/[0.03]',
    width: 210,
    label: 'Code',
  },
  'openai-chat': {
    icon: Sparkles,
    iconColor: 'text-emerald-300',
    iconBg: 'bg-emerald-500/20',
    borderAccent: 'border-l-emerald-400',
    bgTint: 'bg-gradient-to-br from-emerald-500/[0.06] to-green/[0.03]',
    width: 220,
    label: 'OpenAI',
  },
  'anthropic-chat': {
    icon: Sparkles,
    iconColor: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    borderAccent: 'border-l-amber-400',
    bgTint: 'bg-gradient-to-br from-amber-500/[0.06] to-orange-500/[0.03]',
    width: 220,
    label: 'Anthropic',
  },
  'image-gen': {
    icon: ImageIcon,
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/15',
    borderAccent: 'border-l-pink-400',
    bgTint: 'bg-gradient-to-br from-pink-500/[0.05] to-purple-500/[0.02]',
    width: 220,
    label: 'Image Gen',
  },
  'gemini-chat': {
    icon: MessageSquare,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    borderAccent: 'border-l-emerald-400',
    bgTint: 'bg-emerald-500/[0.03]',
    width: 220,
    label: 'Gemini',
  },
  'gemini-embed': {
    icon: Database,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    borderAccent: 'border-l-indigo-400',
    bgTint: 'bg-indigo-500/[0.03]',
    width: 210,
    label: 'Embed',
  },
  'gemini-vision': {
    icon: Eye,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    borderAccent: 'border-l-amber-400',
    bgTint: 'bg-amber-500/[0.03]',
    width: 220,
    label: 'Vision',
  },
  'picoclaw-agent': {
    icon: Cpu,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/20',
    borderAccent: 'border-l-teal-400',
    bgTint: 'bg-gradient-to-br from-teal-500/[0.06] to-cyan-500/[0.02]',
    width: 230,
    label: 'PicoClaw',
  },
  // ── Game nodes ──
  'game-show-text': {
    icon: MessageSquare,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    borderAccent: 'border-l-amber-400',
    bgTint: 'bg-amber-500/[0.04]',
    width: 200,
    label: 'Game Action',
  },
  'game-give-item': {
    icon: Package,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    borderAccent: 'border-l-amber-400',
    bgTint: 'bg-amber-500/[0.04]',
    width: 200,
    label: 'Game Action',
  },
  'game-give-gold': {
    icon: Coins,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    borderAccent: 'border-l-amber-400',
    bgTint: 'bg-amber-500/[0.04]',
    width: 200,
    label: 'Game Action',
  },
  'game-teleport': {
    icon: MapPin,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    borderAccent: 'border-l-amber-400',
    bgTint: 'bg-amber-500/[0.04]',
    width: 200,
    label: 'Game Action',
  },
  'game-open-gui': {
    icon: LayoutDashboard,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    borderAccent: 'border-l-amber-400',
    bgTint: 'bg-amber-500/[0.04]',
    width: 200,
    label: 'Game Action',
  },
  'game-set-variable': {
    icon: Variable,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    borderAccent: 'border-l-amber-400',
    bgTint: 'bg-amber-500/[0.04]',
    width: 200,
    label: 'Game Action',
  },
};

const defaultStyle: NodeStyle = {
  icon: Bot,
  iconColor: 'text-white/60',
  iconBg: 'bg-white/5',
  borderAccent: 'border-l-white/20',
  bgTint: '',
  width: 220,
};

const portGlowColors: Record<string, string> = {
  input: 'shadow-[0_0_12px_rgba(34,197,94,0.6)]',
  output: 'shadow-[0_0_12px_rgba(34,197,94,0.6)]',
  tool: 'shadow-[0_0_12px_rgba(168,85,247,0.6)]',
  memory: 'shadow-[0_0_12px_rgba(59,130,246,0.6)]',
};

// ── Icon container shape per category ──────────────────────────────────

function getIconContainerShape(type: string): string {
  if (type === 'trigger') return 'rounded-full';          // circle for triggers
  if (type === 'memory' || type === 'gemini-embed') return 'rounded-md rotate-45'; // diamond for DB
  if (type.startsWith('game-')) return 'rounded-lg';       // soft square for game
  if (type === 'picoclaw-agent') return 'rounded-xl';      // pill-ish
  return 'rounded-xl';                                      // default rounded square
}

function getIconInnerClass(type: string): string {
  if (type === 'memory' || type === 'gemini-embed') return '-rotate-45'; // counter-rotate icon inside diamond
  return '';
}

export const CanvasNode: React.FC<CanvasNodeProps> = ({
  data,
  isSelected = false,
  isRunning = false,
  executionStatus = 'waiting',
  connectedToolCount = 0,
  hasMemory = false,
  isConnectionDrawing = false,
  highlightedPorts = [],
  snappedPortId = null,
  onClick,
  onDragStart,
  onPortMouseDown,
  onPortMouseUp,
  className = '',
}) => {
  const style = nodeStyles[data.type] || defaultStyle;
  const Icon = style.icon;

  const isPortHighlighted = useCallback((portId: string) => {
    return highlightedPorts.some(p => p.nodeId === data.id && p.portId === portId);
  }, [highlightedPorts, data.id]);

  const isPortSnapped = useCallback((portId: string) => {
    return snappedPortId === portId;
  }, [snappedPortId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.port-handle')) return;
    e.stopPropagation();
    onDragStart?.(e, data.id);
  }, [data.id, onDragStart]);

  const handlePortMouseDown = useCallback((e: React.MouseEvent, portId: string, portType: PortType) => {
    e.stopPropagation();
    e.preventDefault();
    onPortMouseDown?.(e, portId, portType);
  }, [onPortMouseDown]);

  const handlePortMouseUp = useCallback((e: React.MouseEvent, portId: string, portType: PortType) => {
    e.stopPropagation();
    e.preventDefault();
    onPortMouseUp?.(e, portId, portType);
  }, [onPortMouseUp]);

  const getBorderStyle = () => {
    if (executionStatus === 'error') return 'border-danger shadow-[0_0_0_1px_rgba(229,77,77,0.4),0_0_12px_rgba(229,77,77,0.15)]';
    if (isSelected) return 'border-green shadow-glow';
    if (isRunning) return 'border-green animate-pulse-glow';
    return 'border-white/10 hover:border-green/30 hover:shadow-glow';
  };

  const renderPort = (portId: string, portType: PortType, positionClasses: string, borderColor: string) => {
    const highlighted = isConnectionDrawing && isPortHighlighted(portId);
    const snapped = isConnectionDrawing && isPortSnapped(portId);
    const dimmed = isConnectionDrawing && !highlighted && !isPortHighlighted(portId);

    return (
      <div className={cn('absolute group', positionClasses)}>
        {/* Invisible larger hit area - 32px */}
        <div
          className="port-handle absolute inset-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 cursor-crosshair z-10"
          onMouseDown={(e) => handlePortMouseDown(e, portId, portType)}
          onMouseUp={(e) => handlePortMouseUp(e, portId, portType)}
        />
        {/* Visual port circle - 20px */}
        <div
          className={cn(
            'port-handle w-5 h-5 rounded-full bg-dark-100 border-2 cursor-crosshair transition-all duration-150',
            borderColor,
            highlighted && !snapped && 'scale-125 animate-pulse',
            highlighted && portGlowColors[portType],
            snapped && 'scale-150 !border-green !bg-green/30',
            snapped && 'shadow-[0_0_16px_rgba(34,197,94,0.8)]',
            dimmed && 'opacity-30',
            !isConnectionDrawing && 'hover:scale-125 hover:shadow-glow',
          )}
        />
        {/* Label */}
        <span className={cn(
          'absolute text-[9px] text-white/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
          portType === 'input' && '-top-5 left-1/2 -translate-x-1/2',
          portType === 'output' && '-bottom-5 left-1/2 -translate-x-1/2',
          portType === 'tool' && 'top-1/2 -right-10 -translate-y-1/2',
          portType === 'memory' && 'top-1/2 -left-14 -translate-y-1/2',
        )}>
          {portType === 'input' ? 'Input' : portType === 'output' ? 'Output' : portType === 'tool' ? 'Tool' : 'Memory'}
        </span>
      </div>
    );
  };

  // ── Type-specific detail badge ──

  const renderTypeBadge = () => {
    const type = data.type;
    if (type === 'ai-agent' && data.config) {
      return (
        <div className="px-4 pb-1 flex flex-wrap gap-1">
          {(data.config as any).model && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green/10 text-green/80">
              {(data.config as any).model === 'gemini-2.5-flash' ? 'Flash' : 'Pro'}
            </span>
          )}
          {(data.config as any).agentType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400/80">
              {(data.config as any).agentType === 'tools-agent' ? 'Tools' : 'Chat'}
            </span>
          )}
          {connectedToolCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400/80">
              {connectedToolCount} tool{connectedToolCount > 1 ? 's' : ''}
            </span>
          )}
          {hasMemory && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400/80">
              Memory
            </span>
          )}
        </div>
      );
    }
    if (type === 'http-tool') {
      const method = (data.config?.method as string) || 'GET';
      return (
        <div className="px-4 pb-1">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-mono font-bold",
            method === 'GET' && 'bg-blue-400/10 text-blue-400',
            method === 'POST' && 'bg-green/10 text-green',
            method === 'PUT' && 'bg-yellow-400/10 text-yellow-400',
            method === 'DELETE' && 'bg-red-400/10 text-red-400',
            (!['GET','POST','PUT','DELETE'].includes(method)) && 'bg-white/5 text-white/60',
          )}>
            {method}
          </span>
        </div>
      );
    }
    if (type === 'code-tool') {
      const lang = (data.config?.language as string) || 'TS';
      return (
        <div className="px-4 pb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400/80 font-mono uppercase">
            {lang.slice(0, 2)}
          </span>
        </div>
      );
    }
    if (type === 'webhook') {
      return (
        <div className="px-4 pb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-400/10 text-orange-400/70 font-mono truncate max-w-[180px] inline-block">
            ƒ()
          </span>
        </div>
      );
    }
    if (type === 'picoclaw-agent') {
      return (
        <div className="px-4 pb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-400/10 text-teal-400/80">
            gateway
          </span>
        </div>
      );
    }
    if (type === 'image-gen') {
      return (
        <div className="px-4 pb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-400/10 text-pink-400/80">
            AI Image
          </span>
        </div>
      );
    }
    if (type.startsWith('game-')) {
      return (
        <div className="px-4 pb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400/80">
            ⚔ Game
          </span>
        </div>
      );
    }
    return null;
  };

  const iconShape = getIconContainerShape(data.type);
  const iconInner = getIconInnerClass(data.type);

  return (
    <div
      className={cn(
        'absolute rounded-xl border border-l-[3px] backdrop-blur-sm cursor-grab active:cursor-grabbing select-none pb-4',
        'transition-all duration-fast ease-out-quart',
        style.borderAccent,
        style.bgTint || 'bg-dark-100/95',
        getBorderStyle(),
        data.isDeactivated && 'opacity-60',
        className
      )}
      style={{
        left: data.position.x,
        top: data.position.y,
        width: style.width,
        animation: 'nodeAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
      onMouseDown={handleMouseDown}
      onClick={onClick}
    >
      {/* Execution status overlay */}
      {executionStatus !== 'waiting' && (
        <div className={cn(
          'absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center z-10',
          executionStatus === 'running' && 'bg-green/20 animate-pulse',
          executionStatus === 'success' && 'bg-green',
          executionStatus === 'error' && 'bg-danger',
          executionStatus === 'skipped' && 'bg-white/20',
        )}>
          {executionStatus === 'success' && <Check className="w-4 h-4 text-dark" />}
          {executionStatus === 'error' && <span className="text-white text-xs">×</span>}
          {executionStatus === 'running' && <div className="w-3 h-3 rounded-full bg-green" />}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className={cn(
          'w-10 h-10 flex items-center justify-center flex-shrink-0',
          iconShape,
          style.iconBg,
        )}>
          <Icon className={cn('w-5 h-5', style.iconColor, iconInner)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{data.title}</h3>
          <p className="text-xs text-white/50 truncate">{data.subtitle || data.type}</p>
        </div>
        {data.isConfigured && executionStatus === 'waiting' && (
          <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-green" />
          </div>
        )}
      </div>

      {/* Type-specific details */}
      {renderTypeBadge()}

      {/* Deactivated label */}
      {data.isDeactivated && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-white/40">(Deactivated)</span>
        </div>
      )}

      {/* Input port (top) */}
      {renderPort('input', 'input', '-top-2.5 left-1/2 -translate-x-1/2', 'border-white/30')}

      {/* Output port (bottom) */}
      {renderPort('output', 'output', '-bottom-2.5 left-1/2 -translate-x-1/2', 'border-green')}

      {/* Side ports for AI agents */}
      {data.type === 'ai-agent' && (
        <>
          {renderPort('tool', 'tool', 'top-1/2 -right-2.5 -translate-y-1/2', 'border-purple-400')}
          {renderPort('memory', 'memory', 'top-1/3 -left-2.5 -translate-y-1/2', 'border-blue-400')}
        </>
      )}
    </div>
  );
};
