import React from 'react';
import { ArchitectureView } from '@/components/dashboard/ArchitectureView';

interface ArchitecturePageProps {
  onNavigate: (page: string) => void;
}

export const ArchitecturePage: React.FC<ArchitecturePageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Architecture</h1>
        <p className="text-muted-foreground mt-1">Skill execution flow and edge function registry.</p>
      </div>
      <ArchitectureView />
    </div>
  );
};
