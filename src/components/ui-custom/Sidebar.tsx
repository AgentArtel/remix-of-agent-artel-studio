import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { SidebarItem } from './SidebarItem';
import {
  LayoutDashboard,
  Workflow,
  PlayCircle,
  Key,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  LayoutGrid,
  Users,
  Puzzle,
  Map,
  Layers,
  ScrollText,
  ClipboardList,
  Gamepad2,
  Lightbulb,
  Package,
  Bot,
  BookOpen,
  Palette,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeItem?: string;
  onItemClick?: (id: string) => void;
  className?: string;
}

type GroupStatus = 'live' | 'mock' | 'coming-soon';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  status: GroupStatus;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Live',
    status: 'live',
    items: [
      { id: 'play-game', label: 'Play Game', icon: Gamepad2 },
      { id: 'agents', label: 'Agents', icon: Bot },
      { id: 'npcs', label: 'NPCs', icon: Users },
      { id: 'object-templates', label: 'Objects', icon: Package },
      { id: 'world-lore', label: 'World Lore', icon: BookOpen },
      { id: 'sprite-generator', label: 'Sprites', icon: Palette },
      { id: 'integrations', label: 'Integrations', icon: Puzzle },
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Mock Data',
    status: 'mock',
    items: [
      { id: 'ideas', label: 'Ideas', icon: Lightbulb },
      { id: 'workflows', label: 'Workflows', icon: Workflow },
      { id: 'editor', label: 'Workflow Editor', icon: Edit3 },
      { id: 'executions', label: 'Executions', icon: PlayCircle },
      { id: 'credentials', label: 'Credentials', icon: Key },
      { id: 'templates', label: 'Templates', icon: Sparkles },
      { id: 'map-browser', label: 'Map Browser', icon: Layers },
      { id: 'showcase', label: 'Components', icon: LayoutGrid },
    ],
  },
  {
    label: 'Coming Soon',
    status: 'coming-soon',
    items: [
      { id: 'map-agent', label: 'AI Map Agent', icon: Map },
      { id: 'game-scripts', label: 'Game Scripts', icon: ScrollText },
      { id: 'player-sessions', label: 'Player Sessions', icon: ClipboardList },
    ],
  },
];

const settingsItem: NavItem = { id: 'settings', label: 'Settings', icon: Settings };

const statusDotColor: Record<GroupStatus, string> = {
  live: 'bg-green',
  mock: 'bg-amber-400',
  'coming-soon': 'bg-white/30',
};

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  activeItem = 'dashboard',
  onItemClick,
  className,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Live: true,
    'Mock Data': true,
    'Coming Soon': true,
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-dark-100 border-r border-white/5 z-40 flex flex-col",
        "transition-all duration-moderate ease-out-expo",
        "max-md:w-16",
        isCollapsed ? 'w-16' : 'w-60 md:w-60',
        className
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green to-green-dark flex items-center justify-center shadow-glow flex-shrink-0">
          <Sparkles className="w-5 h-5 text-dark" />
        </div>
        {!isCollapsed && (
          <span className="ml-3 text-lg font-semibold text-white animate-fade-in">
            Agent Artel
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {isCollapsed ? (
          // Collapsed: flat icon list, no groups
          <>
            {navGroups.flatMap((g) => g.items).map((item) => (
              <SidebarItem
                key={item.id}
                id={item.id}
                label={item.label}
                icon={<item.icon className="w-5 h-5" />}
                isActive={activeItem === item.id}
                isCollapsed
                onClick={() => onItemClick?.(item.id)}
              />
            ))}
          </>
        ) : (
          // Expanded: grouped with collapsible headers
          navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
              >
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", statusDotColor[group.status])} />
                <span className="flex-1 text-left">{group.label}</span>
                {openGroups[group.label] ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              {openGroups[group.label] && (
                <div className="space-y-0.5 mt-0.5">
                  {group.items.map((item) => (
                    <SidebarItem
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      icon={<item.icon className="w-5 h-5" />}
                      isActive={activeItem === item.id}
                      isCollapsed={false}
                      onClick={() => onItemClick?.(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </nav>

      {/* Settings pinned to bottom */}
      <div className="p-3 border-t border-white/5 flex-shrink-0">
        <SidebarItem
          id={settingsItem.id}
          label={settingsItem.label}
          icon={<settingsItem.icon className="w-5 h-5" />}
          isActive={activeItem === settingsItem.id}
          isCollapsed={isCollapsed}
          onClick={() => onItemClick?.(settingsItem.id)}
        />
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-dark-200 border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:border-green/30 transition-all"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
};
