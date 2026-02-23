import React from 'react';
import { SkillsManager } from '@/components/dashboard/SkillsManager';

interface SkillsPageProps {
  onNavigate: (page: string) => void;
}

export const SkillsPage: React.FC<SkillsPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Agent Skills</h1>
        <p className="text-muted-foreground mt-1">Create and manage PicoClaw agent skills.</p>
      </div>
      <SkillsManager />
    </div>
  );
};
