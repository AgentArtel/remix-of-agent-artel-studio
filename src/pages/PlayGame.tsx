import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayGameProps {
  onNavigate?: (page: string) => void;
}

export const PlayGame: React.FC<PlayGameProps> = ({ onNavigate }) => {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="h-screen w-full flex flex-col bg-dark relative">
      {!hidden && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-100/80 backdrop-blur border border-white/10 text-white/70 hover:text-white hover:border-green/30 transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setHidden(true)}
            className="px-2 py-2 rounded-lg bg-dark-100/80 backdrop-blur border border-white/10 text-white/40 hover:text-white/70 transition-all text-xs"
            title="Hide overlay"
          >
            ✕
          </button>
        </div>
      )}
      <iframe
        src="https://codecamp-artel-mmorpg-production.up.railway.app"
        className="flex-1 w-full border-0"
        title="OpenClaw MMORPG"
        allow="fullscreen; autoplay; clipboard-write"
        allowFullScreen
      />
    </div>
  );
};
