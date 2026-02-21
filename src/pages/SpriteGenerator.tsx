import React, { useState } from 'react';
import { toast } from 'sonner';
import { Palette, ExternalLink, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpriteUploadPanel, type InitialPreview } from '@/components/sprites/SpriteUploadPanel';
import { SpriteGallery } from '@/components/sprites/SpriteGallery';
import { RandomSpritePanel, type GeneratedSprite } from '@/components/sprites/RandomSpritePanel';
import { useSpriteRegistry } from '@/hooks/useSpriteRegistry';

const LPC_GENERATOR_URL =
  'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/';

interface SpriteGeneratorProps {
  onNavigate: (page: string) => void;
}

export const SpriteGenerator: React.FC<SpriteGeneratorProps> = ({ onNavigate }) => {
  const { sprites, isLoading, createSprite, deleteSprite } = useSpriteRegistry();
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [initialPreview, setInitialPreview] = useState<InitialPreview | null>(null);

  const handleSave = (params: {
    key: string;
    label: string;
    imageDataUrl: string;
    width: number;
    height: number;
  }) => {
    // Check for duplicate key
    if (sprites.some((s) => s.key === params.key)) {
      toast.error(`A sprite with key "${params.key}" already exists. Choose a different name.`);
      return;
    }

    createSprite.mutate(params, {
      onSuccess: () => {
        toast.success(`Sprite "${params.label}" registered! It's now available in the NPC sprite dropdown.`);
        setInitialPreview(null);
      },
      onError: (err: Error) => {
        toast.error(`Failed to register sprite: ${err.message}`);
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteSprite.mutate(id, {
      onSuccess: () => toast.success('Sprite removed'),
      onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
    });
  };

  const handleUseSprite = (sprite: GeneratedSprite) => {
    setInitialPreview({
      dataUrl: sprite.dataUrl,
      width: sprite.width,
      height: sprite.height,
      suggestedName: sprite.suggestedName,
    });
  };

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col bg-dark text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-200 border border-white/10 text-white/50 hover:text-white hover:border-green/30 transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center">
            <Palette className="w-4 h-4 text-green" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Sprite Generator</h1>
            <p className="text-xs text-white/40">
              Design characters with the LPC generator, then register them for your game
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={LPC_GENERATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Open in new tab <ExternalLink className="w-3 h-3" />
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/40 hover:text-white/70"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
          >
            {panelCollapsed ? (
              <><ChevronLeft className="w-4 h-4 mr-1" /> Show Panel</>
            ) : (
              <>Hide Panel <ChevronRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </div>
      </div>

      {/* Content: iframe + side panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* LPC Generator iframe */}
        <div className="flex-1 relative bg-dark-100">
          <iframe
            src={LPC_GENERATOR_URL}
            className="w-full h-full border-0"
            title="LPC Spritesheet Character Generator"
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
          />
        </div>

        {/* Side panel */}
        {!panelCollapsed && (
          <div className="w-80 border-l border-white/5 bg-dark-100 flex flex-col overflow-hidden flex-shrink-0">
            <div className="flex-1 overflow-y-auto">
              {/* Random Character Generator */}
              <div className="px-4 py-3 border-b border-white/5">
                <RandomSpritePanel onUseSprite={handleUseSprite} />
              </div>

              {/* Upload area */}
              <div className="px-4 py-3 border-b border-white/5">
                <SpriteUploadPanel
                  onSave={handleSave}
                  isSaving={createSprite.isPending}
                  initialPreview={initialPreview}
                />
              </div>

              {/* Instructions */}
              <div className="px-4 py-3 border-b border-white/5">
                <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                  Or use the full editor
                </h2>
                <ol className="text-[11px] text-white/40 space-y-1.5 list-decimal list-inside">
                  <li>Design your character in the generator on the left</li>
                  <li>Click <span className="text-white/60 font-medium">"Download"</span> in the generator to save the PNG</li>
                  <li>Drag & drop the downloaded PNG into the upload area above</li>
                  <li>Give it a name and click <span className="text-green font-medium">Register Sprite</span></li>
                </ol>
              </div>

              {/* Gallery */}
              <div className="px-4 py-3">
                <SpriteGallery
                  sprites={sprites}
                  isLoading={isLoading}
                  onDelete={handleDelete}
                  isDeleting={deleteSprite.isPending}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
