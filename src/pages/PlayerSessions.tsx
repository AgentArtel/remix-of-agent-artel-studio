import React from 'react';
import { ClipboardList, Construction } from 'lucide-react';

interface PlayerSessionsProps {
  onNavigate: (page: string) => void;
}

export const PlayerSessions: React.FC<PlayerSessionsProps> = () => {
  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Player Sessions</h1>
        <p className="text-white/50 mt-1">Review player session logs from start to end</p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
          <ClipboardList className="w-8 h-8 text-white/30" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Construction className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-medium text-white/70">Coming Soon</h2>
        </div>
        <p className="text-white/40 max-w-md text-sm leading-relaxed">
          Browse complete player session timelines — see every interaction, NPC conversation, 
          movement, and event from login to logout. This feature is planned for a future update.
        </p>
      </div>
    </div>
  );
};
