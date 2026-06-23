import { Injectable } from '@angular/core';
import { OklchColor, RgbColor, PaletteCell, PaletteMode } from '../../shared/models/color';

@Injectable({ providedIn: 'root' })
export class ColorService {

  // ─── OKLCH ↔ Linear RGB ──────────────────────────────────────────────────

  oklchToRgb(oklch: OklchColor): RgbColor {
    const oklab = this.oklchToOklab(oklch);
    const linearRgb = this.oklabToLinearRgb(oklab);
    return this.linearRgbToSrgb(linearRgb);
  }

  rgbToOklch(rgb: RgbColor): OklchColor {
    const linearRgb = this.srgbToLinearRgb(rgb);
    const oklab = this.linearRgbToOklab(linearRgb);
    return this.oklabToOklch(oklab);
  }

  hexToRgb(hex: string): RgbColor {
    const clean = hex.replace('#', '');
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }

  rgbToHex(rgb: RgbColor): string {
    const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    return (toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b)).toUpperCase();
  }

  hexToOklch(hex: string): OklchColor {
    return this.rgbToOklch(this.hexToRgb(hex));
  }

  oklchToHex(oklch: OklchColor): string {
    return this.rgbToHex(this.oklchToRgb(oklch));
  }

  isInGamut(oklch: OklchColor): boolean {
    const rgb = this.oklchToRgb(oklch);
    return rgb.r >= 0 && rgb.r <= 255 &&
      rgb.g >= 0 && rgb.g <= 255 &&
      rgb.b >= 0 && rgb.b <= 255;
  }

  clampToGamut(oklch: OklchColor): OklchColor {
    if (this.isInGamut(oklch)) return { ...oklch };
    // Binary search on chroma to find the edge of gamut
    let lo = 0;
    let hi = oklch.c;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const candidate = { ...oklch, c: mid };
      if (this.isInGamut(candidate)) lo = mid;
      else hi = mid;
    }
    return { ...oklch, c: lo };
  }

  // ─── Palette Generation ──────────────────────────────────────────────────

  /**
   * Generate the 9×9 palette grid.
   * Returns a flat array of 81 cells, row-major (top-left to bottom-right).
   * Center cell [4][4] = index 40 = base color.
   */
  generatePalette(base: OklchColor, mode: PaletteMode, hueShift: number, range: number): PaletteCell[][] {
    const size = 9;
    const grid: PaletteCell[][] = [];

    for (let row = 0; row < size; row++) {
      const rowCells: PaletteCell[] = [];
      for (let col = 0; col < size; col++) {
        const cell = this.computeCell(base, mode, hueShift, range, row, col);
        rowCells.push(cell);
      }
      grid.push(rowCells);
    }

    return grid;
  }

  private computeCell(
    base: OklchColor,
    mode: PaletteMode,
    hueShift: number,
    range: number,
    row: number,
    col: number
  ): PaletteCell {
    const center = 4;
    const spread = this.rangeToSpread(range); // how wide the palette is

    const dRow = row - center; // negative = top (higher L), positive = bottom (lower L)
    const dCol = col - center; // negative = left, positive = right

    let oklch: OklchColor;

    switch (mode) {
      case 'M': oklch = this.computeCellM(base, hueShift, spread, dRow, dCol); break;
      case 'V': oklch = this.computeCellV(base, hueShift, spread, dRow, dCol); break;
      case 'T': oklch = this.computeCellT(base, hueShift, spread, dRow, dCol); break;
      case 'B': oklch = this.computeCellB(base, hueShift, spread, dRow, dCol); break;
    }

    const clamped = this.clampToGamut(oklch);
    const outOfGamut = !this.isInGamut(oklch);

    return {
      hex: this.oklchToHex(clamped),
      oklch: clamped,
      outOfGamut,
    };
  }

  /**
   * M — Match: perceptual lightness matching.
   * Columns shift hue, rows shift lightness. Chroma is preserved.
   */
  private computeCellM(base: OklchColor, hueShift: number, spread: number, dRow: number, dCol: number): OklchColor {
    const lStep = 0.06 * spread;
    const hStep = 15 * spread;
    const cBoost = 0.015; // top 2 rows increase chroma, bottom 2 decrease

    let l = base.l - dRow * lStep;
    let c = base.c;
    let h = base.h + hueShift + dCol * hStep;

    // Top 2 rows: increase chroma; bottom 2: decrease
    if (dRow <= -3) c = Math.min(0.4, c + Math.abs(dRow + 2) * cBoost);
    if (dRow >= 3) c = Math.max(0, c - (dRow - 2) * cBoost);

    l = Math.max(0.05, Math.min(0.99, l));
    return { l, c, h: this.normalizeHue(h) };
  }

  /**
   * V — Vivid: like M but lightness is tweaked to secure stronger chroma.
   */
  private computeCellV(base: OklchColor, hueShift: number, spread: number, dRow: number, dCol: number): OklchColor {
    const cell = this.computeCellM(base, hueShift, spread, dRow, dCol);
    // Squeeze lightness toward the chroma-optimal zone (~0.65)
    const optimal = 0.65;
    const correction = (optimal - cell.l) * 0.18;
    return { ...cell, l: Math.max(0.05, Math.min(0.99, cell.l + correction)) };
  }

  /**
   * T — Temperature: cool on left, warm on right.
   * Hue shifts toward blue (cool) going left, toward orange (warm) going right.
   * Rows control lightness.
   */
  private computeCellT(base: OklchColor, hueShift: number, spread: number, dRow: number, dCol: number): OklchColor {
    const lStep = 0.07 * spread;
    // Temperature hue offsets: left = +180° toward blue, right = toward orange/red
    const tempHueShift = dCol * 18 * spread;
    const l = Math.max(0.05, Math.min(0.99, base.l - dRow * lStep));
    const h = this.normalizeHue(base.h + hueShift + tempHueShift);
    return { l, c: base.c, h };
  }

  /**
   * B — Brightness + Temperature: arranges temperature and lightness together.
   * Experimental — hue and lightness shift diagonally.
   */
  private computeCellB(base: OklchColor, hueShift: number, spread: number, dRow: number, dCol: number): OklchColor {
    const lStep = 0.055 * spread;
    const hStep = 12 * spread;
    const l = Math.max(0.05, Math.min(0.99, base.l - (dRow - dCol) * lStep * 0.5));
    const h = this.normalizeHue(base.h + hueShift + dCol * hStep - dRow * hStep * 0.4);
    return { l, c: base.c, h };
  }

  // ─── Math Helpers ────────────────────────────────────────────────────────

  private rangeToSpread(range: number): number {
    // Range 1 = wide (spread 1.0), Range 9 = narrow (spread ~0.15)
    return 1.0 - (range - 1) * (0.85 / 8);
  }

  normalizeHue(h: number): number {
    return ((h % 360) + 360) % 360;
  }

  // ─── Color Space Conversions ─────────────────────────────────────────────

  private oklchToOklab(oklch: OklchColor): { L: number; a: number; b: number } {
    const hRad = (oklch.h * Math.PI) / 180;
    return {
      L: oklch.l,
      a: oklch.c * Math.cos(hRad),
      b: oklch.c * Math.sin(hRad),
    };
  }

  private oklabToOklch(oklab: { L: number; a: number; b: number }): OklchColor {
    const c = Math.sqrt(oklab.a ** 2 + oklab.b ** 2);
    const h = (Math.atan2(oklab.b, oklab.a) * 180) / Math.PI;
    return { l: oklab.L, c, h: this.normalizeHue(h) };
  }

  private oklabToLinearRgb(oklab: { L: number; a: number; b: number }): { r: number; g: number; b: number } {
    const l_ = oklab.L + 0.3963377774 * oklab.a + 0.2158037573 * oklab.b;
    const m_ = oklab.L - 0.1055613458 * oklab.a - 0.0638541728 * oklab.b;
    const s_ = oklab.L - 0.0894841775 * oklab.a - 1.2914855480 * oklab.b;

    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;

    return {
      r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    };
  }

  private linearRgbToOklab(rgb: { r: number; g: number; b: number }): { L: number; a: number; b: number } {
    const l = 0.4122214708 * rgb.r + 0.5363325363 * rgb.g + 0.0514459929 * rgb.b;
    const m = 0.2119034982 * rgb.r + 0.6806995451 * rgb.g + 0.1073969566 * rgb.b;
    const s = 0.0883024619 * rgb.r + 0.2817188376 * rgb.g + 0.6299787005 * rgb.b;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    return {
      L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    };
  }

  private linearRgbToSrgb(linear: { r: number; g: number; b: number }): RgbColor {
    const toSrgb = (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      return (clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255;
    };
    return { r: toSrgb(linear.r), g: toSrgb(linear.g), b: toSrgb(linear.b) };
  }

  private srgbToLinearRgb(rgb: RgbColor): { r: number; g: number; b: number } {
    const toLinear = (v: number) => {
      const n = v / 255;
      return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };
    return { r: toLinear(rgb.r), g: toLinear(rgb.g), b: toLinear(rgb.b) };
  }
}
