export interface OklchColor {
  l: number; // Lightness 0–1
  c: number; // Chroma 0–0.4
  h: number; // Hue 0–360
}

export interface RgbColor {
  r: number; // 0–255
  g: number; // 0–255
  b: number; // 0–255
}

export type PaletteMode = 'M' | 'V' | 'T' | 'B';

export type WheelMode = 'none' | 'hsv' | 'oklch-square' | 'oklch-circular';

export interface PaletteCell {
  hex: string;
  oklch: OklchColor;
  outOfGamut: boolean;
}

export interface AppState {
  baseColor: OklchColor;
  selectedColor: OklchColor;
  paletteMode: PaletteMode;
  wheelMode: WheelMode;
  hueShift: number;     // applied on top of base hue
  range: number;        // 1–9, controls spread
  locked: boolean;      // color lock on base swatch
  showOutOfGamut: boolean;
}

export interface AppSettings {
  autoCopyHex: boolean;
  altClickPick: boolean; // web: n/a but kept for parity
  uiScale: number;       // 80–150
  wheelHueScroll: boolean;
  enabledModes: PaletteMode[];
}
