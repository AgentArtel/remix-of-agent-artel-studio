import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dices, Loader2, Wand2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  BODY_TYPES,
  SKIN_COLORS,
  HAIR_STYLES,
  HAIR_COLORS,
  randomSpriteConfig,
  compositeSprite,
  autoName,
  type SpriteConfig,
} from '@/lib/spriteCompositor';

export interface GeneratedSprite {
  dataUrl: string;
  width: number;
  height: number;
  suggestedName: string;
}

interface RandomSpritePanelProps {
  onUseSprite: (sprite: GeneratedSprite) => void;
}

export const RandomSpritePanel: React.FC<RandomSpritePanelProps> = ({ onUseSprite }) => {
  const [config, setConfig] = useState<SpriteConfig>(randomSpriteConfig);
  const [preview, setPreview] = useState<GeneratedSprite | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectCls =
    'w-full px-3 py-2 bg-dark-200 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-green/50';
  const labelCls = 'text-[10px] text-white/40 uppercase tracking-wider mb-1 block';

  const shuffle = useCallback(() => {
    const newConfig = randomSpriteConfig();
    setConfig(newConfig);
    setPreview(null);
  }, []);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setPreview(null);
    try {
      const result = await compositeSprite(config);
      const sprite: GeneratedSprite = {
        ...result,
        suggestedName: autoName(config),
      };
      setPreview(sprite);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate sprite. Try a different combination or use the full LPC generator.');
    } finally {
      setIsGenerating(false);
    }
  }, [config]);

  const update = (field: keyof SpriteConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setPreview(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-green">Random Character</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-white/40 hover:text-white/70"
          onClick={shuffle}
          title="Shuffle all options"
        >
          <Dices className="w-3.5 h-3.5 mr-1" />
          <span className="text-[10px]">Shuffle</span>
        </Button>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Body Type</label>
          <select
            className={selectCls}
            value={config.bodyType}
            onChange={(e) => update('bodyType', e.target.value)}
          >
            {BODY_TYPES.map((b) => (
              <option key={b.key} value={b.key}>{b.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Skin Color</label>
          <select
            className={selectCls}
            value={config.skinColor}
            onChange={(e) => update('skinColor', e.target.value)}
          >
            {SKIN_COLORS.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Hair Style</label>
          <select
            className={selectCls}
            value={config.hairStyle}
            onChange={(e) => update('hairStyle', e.target.value)}
          >
            {HAIR_STYLES.map((h) => (
              <option key={h.key} value={h.key}>{h.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Hair Color</label>
          <select
            className={selectCls}
            value={config.hairColor}
            onChange={(e) => update('hairColor', e.target.value)}
            disabled={config.hairStyle === 'bald'}
          >
            {HAIR_COLORS.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Generate button */}
      <Button
        className="w-full bg-green/10 text-green hover:bg-green/20 border border-green/20"
        onClick={generate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
        ) : (
          <><Wand2 className="w-4 h-4 mr-2" /> Generate Character</>
        )}
      </Button>

      {/* Preview */}
      {preview && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-center bg-[#1a1a2e] rounded-lg p-3 border border-white/5">
            <img
              src={preview.dataUrl}
              alt="Generated sprite"
              className="max-h-40 w-auto"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <p className="text-[10px] text-white/30 text-center">
            {preview.width}x{preview.height}px &middot; {preview.suggestedName}
          </p>
          <Button
            className="w-full bg-green text-dark hover:bg-green-light"
            onClick={() => onUseSprite(preview)}
          >
            Use This Sprite <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};
