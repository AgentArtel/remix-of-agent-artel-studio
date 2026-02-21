import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/ui-custom/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { WorkflowList } from '@/pages/WorkflowList';
import { ExecutionHistory } from '@/pages/ExecutionHistory';
import { Credentials } from '@/pages/Credentials';
import { Settings } from '@/pages/Settings';
import { AgentLibrary } from '@/pages/AgentLibrary';
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage';
import { ShowcasePage } from '@/pages/ShowcasePage';
import { NpcBuilder } from '@/pages/NPCs';
import { Integrations } from '@/pages/Integrations';
import { MapAgent } from '@/pages/MapAgent';
import { MapBrowser } from '@/pages/MapBrowser';
import { GameScripts } from '@/pages/GameScripts';
import { PlayerSessions } from '@/pages/PlayerSessions';
import { PlayGame } from '@/pages/PlayGame';
import { Ideas } from '@/pages/Ideas';
import { ObjectTemplates } from '@/pages/ObjectTemplates';
import { AgentBuilder } from '@/pages/AgentBuilder';
import { WorldLore } from '@/pages/WorldLore';
import { GameDashboard } from '@/pages/GameDashboard';
import { LoreEntryDetail } from '@/components/lore/LoreEntryDetail';
import { Login } from '@/pages/Login';
import { OAuthCallbackHandler } from '@/components/integrations/OAuthCallbackHandler';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

type Page = 'game-dashboard' | 'play-game' | 'ideas' | 'dashboard' | 'workflows' | 'npcs' | 'agents' | 'world-lore' | 'lore-detail' | 'map-agent' | 'map-browser' | 'game-scripts' | 'player-sessions' | 'integrations' | 'object-templates' | 'executions' | 'credentials' | 'templates' | 'settings' | 'editor' | 'showcase';

const MOBILE_BREAKPOINT = 768;

const AuthenticatedApp = () => {
  const [currentPage, setCurrentPage] = useState<Page>('game-dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editorWorkflowId, setEditorWorkflowId] = useState<string | undefined>();
  const [worldLoreTab, setWorldLoreTab] = useState<'chat' | 'fragments' | 'neural' | undefined>();
  const [loreDetailId, setLoreDetailId] = useState<string | undefined>();

  useEffect(() => {
    const check = () => setSidebarCollapsed((c) => (window.innerWidth < MOBILE_BREAKPOINT ? true : c));
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const onNavigate = (page: string) => {
    if (page.startsWith('editor:')) {
      const id = page.slice('editor:'.length);
      setEditorWorkflowId(id);
      setCurrentPage('editor');
    } else if (page.startsWith('lore-detail:')) {
      const id = page.slice('lore-detail:'.length);
      setLoreDetailId(id);
      setCurrentPage('lore-detail');
    } else if (page.startsWith('world-lore:')) {
      const tab = page.slice('world-lore:'.length) as 'chat' | 'fragments' | 'neural';
      setWorldLoreTab(tab);
      setCurrentPage('world-lore');
    } else {
      if (page === 'editor') setEditorWorkflowId(undefined);
      if (page === 'world-lore') setWorldLoreTab(undefined);
      setCurrentPage(page as Page);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'game-dashboard': return <GameDashboard onNavigate={onNavigate} />;
      case 'play-game': return <PlayGame onNavigate={onNavigate} />;
      case 'ideas': return <Ideas onNavigate={onNavigate} />;
      case 'dashboard': return <Dashboard onNavigate={onNavigate} />;
      case 'workflows': return <WorkflowList onNavigate={onNavigate} />;
      case 'npcs': return <NpcBuilder onNavigate={onNavigate} />;
      case 'agents': return <AgentBuilder onNavigate={onNavigate} />;
      case 'world-lore': return <WorldLore onNavigate={onNavigate} initialTab={worldLoreTab} />;
      case 'lore-detail': return <LoreEntryDetail entryId={loreDetailId!} onNavigate={onNavigate} />;
      case 'map-agent': return <MapAgent onNavigate={onNavigate} />;
      case 'map-browser': return <MapBrowser onNavigate={onNavigate} />;
      case 'game-scripts': return <GameScripts onNavigate={onNavigate} />;
      case 'player-sessions': return <PlayerSessions onNavigate={onNavigate} />;
      case 'integrations': return <Integrations onNavigate={onNavigate} />;
      case 'object-templates': return <ObjectTemplates onNavigate={onNavigate} />;
      case 'executions': return <ExecutionHistory onNavigate={onNavigate} />;
      case 'credentials': return <Credentials onNavigate={onNavigate} />;
      case 'templates': return <AgentLibrary onNavigate={onNavigate} />;
      case 'settings': return <Settings onNavigate={onNavigate} />;
      case 'editor': return <WorkflowEditorPage onNavigate={onNavigate} initialWorkflowId={editorWorkflowId} />;
      case 'showcase': return <ShowcasePage />;
      default: return <GameDashboard onNavigate={onNavigate} />;
    }
  };

  if (currentPage === 'editor' || currentPage === 'play-game') {
    return (
      <div className="min-h-screen bg-dark text-white font-urbanist">
        {renderPage()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white font-urbanist">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeItem={currentPage}
        onItemClick={(id) => setCurrentPage(id as Page)}
      />
      <main className={cn(
        "transition-all duration-moderate ease-out-expo",
        "max-md:ml-16",
        sidebarCollapsed ? 'ml-16' : 'ml-60'
      )}>
        {renderPage()}
      </main>
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auth gate disabled for development
  // if (!user) {
  //   return <Login />;
  // }

  return <AuthenticatedApp />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner theme="dark" />
          <Routes>
            <Route path="/auth/callback" element={<OAuthCallbackHandler />} />
            <Route path="*" element={<AppContent />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
