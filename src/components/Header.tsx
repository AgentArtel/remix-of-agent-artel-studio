import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ZoomOut, ZoomIn, RotateCcw, Undo2, Redo2, Share2, Settings,
  Sparkles, ChevronLeft, Play, Upload, Loader2, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface HeaderProps {
  onBack?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onImport?: () => void;
  workflowName?: string;
  onNameChange?: (name: string) => void;
  isActive?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onBack, onZoomIn, onZoomOut, onReset, onUndo, onRedo, onShare, onSave, onImport,
  workflowName = 'AI Agent Workflow',
  onNameChange,
  isActive = true,
  canUndo = false, canRedo = false,
  isSaving = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(workflowName);

  const handleStartEdit = () => {
    if (!onNameChange) return;
    setEditValue(workflowName);
    setIsEditing(true);
  };

  const handleFinishEdit = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== workflowName) {
      onNameChange?.(editValue.trim());
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 glass border-b border-white/5">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left - Back & Logo */}
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green to-green-dark flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-dark" />
            </div>
            <div className="hidden sm:block">
              {isEditing ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFinishEdit(); if (e.key === 'Escape') { setIsEditing(false); } }}
                  className="text-sm font-semibold text-white bg-transparent border-b border-green/50 outline-none px-0 py-0.5 w-48"
                />
              ) : (
                <h1
                  className={cn("text-sm font-semibold text-white", onNameChange && "cursor-pointer hover:text-green transition-colors")}
                  onClick={handleStartEdit}
                  title={onNameChange ? "Click to rename" : undefined}
                >
                  {workflowName}
                </h1>
              )}
              <p className="text-xs text-white/40">Workflow Editor</p>
            </div>
          </div>
        </div>

        {/* Center - Zoom & History Controls */}
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-dark-100 rounded-lg p-1 border border-white/5">
            <button className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all" onClick={onZoomOut} title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
            <button className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all" onClick={onReset} title="Reset View"><RotateCcw className="w-4 h-4" /></button>
            <button className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all" onClick={onZoomIn} title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
          </div>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <div className="flex items-center bg-dark-100 rounded-lg p-1 border border-white/5">
            <button className={cn("w-8 h-8 rounded-md flex items-center justify-center transition-all", canUndo ? "text-white/60 hover:text-white hover:bg-white/5" : "text-white/20 cursor-not-allowed")} onClick={onUndo} disabled={!canUndo} title={canUndo ? "Undo (Ctrl+Z)" : "Nothing to undo"}><Undo2 className="w-4 h-4" /></button>
            <button className={cn("w-8 h-8 rounded-md flex items-center justify-center transition-all", canRedo ? "text-white/60 hover:text-white hover:bg-white/5" : "text-white/20 cursor-not-allowed")} onClick={onRedo} disabled={!canRedo} title={canRedo ? "Redo (Ctrl+Shift+Z)" : "Nothing to redo"}><Redo2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${isActive ? 'bg-green/15 text-green border border-green/30' : 'bg-white/5 text-white/50 border border-white/10'}`}>
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green animate-pulse' : 'bg-white/30'}`} />
            {isActive ? 'Active' : 'Inactive'}
          </div>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5 hidden sm:flex" onClick={onShare}>
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5 hidden sm:flex" onClick={onImport}>
            <Upload className="w-4 h-4 mr-2" /> Import
          </Button>
          <Button size="sm" className="bg-green text-dark hover:bg-green-light font-medium" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"><Settings className="w-4 h-4" /></button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green/30 to-green-dark/30 border border-green/30 flex items-center justify-center overflow-hidden ml-1">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
};
