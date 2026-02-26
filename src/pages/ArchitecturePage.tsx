import React from 'react';
import { ArchitectureView } from '@/components/dashboard/ArchitectureView';

interface ArchitecturePageProps {
  onNavigate: (page: string) => void;
}

export const ArchitecturePage: React.FC<ArchitecturePageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Architecture</h1>
      </div>
      <ArchitectureView />
    </div>
  );
};
