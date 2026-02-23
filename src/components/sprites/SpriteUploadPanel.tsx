import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export interface InitialPreview {
  dataUrl: string;
  width: number;
  height: number;
  suggestedName: string;
}

interface SpriteUploadPanelProps {
  onSave: (params: { key: string; label: string; imageDataUrl: string; width: number; height: number }) => void;
  isSaving: boolean;
  initialPreview?: InitialPreview | null;
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

export const SpriteUploadPanel: React.FC<SpriteUploadPanelProps> = ({ onSave, isSaving, initialPreview }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accept pre-populated data from the random generator
  useEffect(() => {
    if (initialPreview) {
      setPreview(initialPreview.dataUrl);
      setDimensions({ width: initialPreview.width, height: initialPreview.height });
      setLabel(initialPreview.suggestedName);
      setKey(slugify(initialPreview.suggestedName));
    }
  }, [initialPreview]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        setPreview(dataUrl);
        setDimensions({ width: img.width, height: img.height });
        // Auto-generate name from filename
        const baseName = file.name.replace(/\.[^.]+$/, '');
        if (!label) {
          setLabel(baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
          setKey(slugify(baseName));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [label]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSave = () => {
    if (!preview || !dimensions || !key.trim() || !label.trim()) {
      toast.error('Please provide an image and a name for the sprite.');
      return;
    }
    onSave({
      key: key.trim(),
      label: label.trim(),
      imageDataUrl: preview,
      width: dimensions.width,
      height: dimensions.height,
    });
  };

  const handleClear = () => {
    setPreview(null);
    setDimensions(null);
    setLabel('');
    setKey('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const inputCls =
    'w-full px-4 py-2.5 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50';
  const labelCls = 'text-xs text-white/50 uppercase tracking-wider mb-1.5 block';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-green">Upload Sprite</h3>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-green bg-green/5'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
          }
        `}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative bg-[#1a1a2e] rounded-lg p-2 border border-white/5">
              <img
                src={preview}
                alt="Sprite preview"
                className="max-h-48 w-auto image-rendering-pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            {dimensions && (
              <span className="text-xs text-white/40">
                {dimensions.width} x {dimensions.height}px
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white/30" />
            </div>
            <p className="text-sm text-white/50">
              Drop your spritesheet here
            </p>
            <p className="text-xs text-white/30">
              or click to browse
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Name fields */}
      {preview && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <label className={labelCls}>Sprite Name</label>
            <input
              className={inputCls}
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setKey(slugify(e.target.value));
              }}
              placeholder="e.g. Warrior Knight"
            />
          </div>
          <div>
            <label className={labelCls}>Sprite Key</label>
            <input
              className={inputCls}
              value={key}
              onChange={(e) => setKey(slugify(e.target.value))}
              placeholder="auto-generated"
            />
            <p className="text-[10px] text-white/30 mt-1">
              Used as the identifier in the game engine
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 bg-green text-dark hover:bg-green-light"
              onClick={handleSave}
              disabled={isSaving || !key.trim() || !label.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              {isSaving ? 'Registering...' : 'Register Sprite'}
            </Button>
            <Button
              variant="ghost"
              className="text-white/40 hover:text-white/70"
              onClick={handleClear}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
