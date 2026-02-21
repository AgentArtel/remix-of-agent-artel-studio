import React from 'react';
import { Trash2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpriteEntry } from '@/hooks/useSpriteRegistry';

interface SpriteGalleryProps {
  sprites: SpriteEntry[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const SpriteGallery: React.FC<SpriteGalleryProps> = ({
  sprites,
  isLoading,
  onDelete,
  isDeleting,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-green">Registered Sprites</h3>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-dark-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (sprites.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-green">Registered Sprites</h3>
        <div className="text-center py-8 text-white/30">
          <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No sprites registered yet.</p>
          <p className="text-[10px] text-white/20 mt-1">
            Design a character above, download the PNG,<br />
            then upload it here to register it for your game.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-green">Registered Sprites</h3>
        <span className="text-xs text-white/30">{sprites.length} sprite{sprites.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
        {sprites.map((sprite) => {
          const imageUrl = sprite.metadata?.imageDataUrl;
          return (
            <div
              key={sprite.id}
              className="group relative bg-dark-200 border border-white/5 rounded-lg p-2 hover:border-white/10 transition-colors"
            >
              {/* Preview */}
              <div className="flex items-center justify-center bg-[#1a1a2e] rounded h-20 mb-2">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={sprite.label}
                    className="max-h-16 w-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <Image className="w-6 h-6 text-white/20" />
                )}
              </div>

              {/* Info */}
              <p className="text-xs text-white/70 font-medium truncate">{sprite.label}</p>
              <p className="text-[10px] text-white/30 truncate">{sprite.key}</p>

              {/* Delete button (hover) */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={() => {
                  if (window.confirm(`Delete sprite "${sprite.label}"?`)) {
                    onDelete(sprite.id);
                  }
                }}
                disabled={isDeleting}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
