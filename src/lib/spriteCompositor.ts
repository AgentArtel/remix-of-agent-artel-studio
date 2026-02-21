/**
 * Sprite Compositor
 * Loads LPC sprite sheet PNGs from GitHub and composites them on a canvas.
 */

const LPC_BASE_URL =
  'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets';

// ── Option Constants ──────────────────────────────────────────────────────────

export interface BodyTypeOption {
  key: string;
  label: string;
  hairGroup: string; // subfolder for hair lookup
}

export const BODY_TYPES: BodyTypeOption[] = [
  { key: 'male', label: 'Male', hairGroup: 'adult' },
  { key: 'female', label: 'Female', hairGroup: 'adult' },
  { key: 'muscular', label: 'Muscular', hairGroup: 'adult' },
  { key: 'teen', label: 'Teen', hairGroup: 'adult' },
  { key: 'child', label: 'Child', hairGroup: 'child' },
];

export interface ColorOption {
  key: string;
  label: string;
  hex: string; // for the color swatch in UI
}

export const SKIN_COLORS: ColorOption[] = [
  { key: 'light', label: 'Light', hex: '#f5d6b4' },
  { key: 'amber', label: 'Amber', hex: '#e8b87e' },
  { key: 'olive', label: 'Olive', hex: '#c8a86e' },
  { key: 'taupe', label: 'Taupe', hex: '#b89470' },
  { key: 'bronze', label: 'Bronze', hex: '#a07850' },
  { key: 'brown', label: 'Brown', hex: '#7a5a3c' },
  { key: 'black', label: 'Black', hex: '#4a3728' },
  { key: 'lavender', label: 'Lavender', hex: '#c8a0d8' },
  { key: 'blue', label: 'Blue', hex: '#6890c0' },
  { key: 'green', label: 'Green', hex: '#70a870' },
  { key: 'zombie_green', label: 'Zombie', hex: '#88a868' },
];

export interface HairStyleOption {
  key: string;
  label: string;
  path: string; // relative path under spritesheets/ before the body-type subfolder
}

export const HAIR_STYLES: HairStyleOption[] = [
  { key: 'bald', label: 'Bald', path: '' }, // no hair layer
  { key: 'plain', label: 'Plain', path: 'hair/plain' },
  { key: 'messy', label: 'Messy', path: 'hair/messy1' },
  { key: 'messy2', label: 'Shaggy', path: 'hair/messy2' },
  { key: 'pixie', label: 'Pixie', path: 'hair/pixie' },
  { key: 'bangs', label: 'Bangs', path: 'hair/bangs' },
  { key: 'bedhead', label: 'Bedhead', path: 'hair/bedhead' },
  { key: 'swoop', label: 'Swoop', path: 'hair/swoop' },
];

export const HAIR_COLORS: ColorOption[] = [
  { key: 'black', label: 'Black', hex: '#2a2a2a' },
  { key: 'dark_brown', label: 'Dark Brown', hex: '#4a3020' },
  { key: 'light_brown', label: 'Light Brown', hex: '#8a6840' },
  { key: 'blonde', label: 'Blonde', hex: '#d8c060' },
  { key: 'redhead', label: 'Redhead', hex: '#c04830' },
  { key: 'white', label: 'White', hex: '#e0e0e0' },
  { key: 'gray', label: 'Gray', hex: '#909090' },
  { key: 'strawberry', label: 'Strawberry', hex: '#d09060' },
  { key: 'green', label: 'Green', hex: '#50a050' },
  { key: 'blue', label: 'Blue', hex: '#5070c0' },
  { key: 'purple', label: 'Purple', hex: '#8050a0' },
  { key: 'pink', label: 'Pink', hex: '#d070a0' },
];

// ── Sprite Config ─────────────────────────────────────────────────────────────

export interface SpriteConfig {
  bodyType: string;
  skinColor: string;
  hairStyle: string;
  hairColor: string;
}

export function randomSpriteConfig(): SpriteConfig {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return {
    bodyType: pick(BODY_TYPES).key,
    skinColor: pick(SKIN_COLORS).key,
    hairStyle: pick(HAIR_STYLES).key,
    hairColor: pick(HAIR_COLORS).key,
  };
}

// ── Image Loading ─────────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

// ── URL Building ──────────────────────────────────────────────────────────────

interface SpriteLayer {
  url: string;
  zPos: number;
}

export function buildSpriteUrls(config: SpriteConfig): SpriteLayer[] {
  const layers: SpriteLayer[] = [];

  // Body layer (zPos 10)
  const bodyUrl = `${LPC_BASE_URL}/body/bodies/${config.bodyType}/walk/${config.skinColor}.png`;
  layers.push({ url: bodyUrl, zPos: 10 });

  // Hair layer (zPos 120) — skip for "bald"
  if (config.hairStyle !== 'bald') {
    const hairDef = HAIR_STYLES.find((h) => h.key === config.hairStyle);
    if (hairDef && hairDef.path) {
      const bodyTypeDef = BODY_TYPES.find((b) => b.key === config.bodyType);
      const hairGroup = bodyTypeDef?.hairGroup ?? 'adult';
      const hairUrl = `${LPC_BASE_URL}/${hairDef.path}/${hairGroup}/walk/${config.hairColor}.png`;
      layers.push({ url: hairUrl, zPos: 120 });
    }
  }

  // Sort by zPos so lower layers draw first
  layers.sort((a, b) => a.zPos - b.zPos);
  return layers;
}

// ── Compositing ───────────────────────────────────────────────────────────────

export async function compositeSprite(config: SpriteConfig): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const layers = buildSpriteUrls(config);

  // Load all images in parallel
  const results = await Promise.allSettled(layers.map((l) => loadImage(l.url)));

  // Collect successfully loaded images (body is required, hair is optional)
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      images.push(result.value);
    } else if (i === 0) {
      // Body layer failed — can't proceed
      throw new Error('Failed to load body sprite. The LPC asset may be unavailable.');
    }
    // Hair layer failure is non-fatal — skip it silently
  }

  if (images.length === 0) {
    throw new Error('No sprite layers could be loaded.');
  }

  // Create canvas with the dimensions of the first (body) image
  const canvas = document.createElement('canvas');
  canvas.width = images[0].width;
  canvas.height = images[0].height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Draw each layer
  for (const img of images) {
    ctx.drawImage(img, 0, 0);
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

// ── Auto-name ─────────────────────────────────────────────────────────────────

export function autoName(config: SpriteConfig): string {
  const body = BODY_TYPES.find((b) => b.key === config.bodyType)?.label ?? config.bodyType;
  const skin = SKIN_COLORS.find((c) => c.key === config.skinColor)?.label ?? config.skinColor;
  const hair = HAIR_STYLES.find((h) => h.key === config.hairStyle)?.label ?? config.hairStyle;
  return `${body} ${skin} ${hair}`;
}
