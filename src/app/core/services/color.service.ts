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
    let lo = 0;
    let hi = oklch.c;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (this.isInGamut({ ...oklch, c: mid })) lo = mid;
      else hi = mid;
    }
    return { ...oklch, c: lo };
  }

  // ─── Palette Generation ──────────────────────────────────────────────────

  generatePalette(base: OklchColor, mode: PaletteMode, hueShift: number, range: number): PaletteCell[][] {
    const grid: PaletteCell[][] = [];
    for (let row = 0; row < 9; row++) {
      const rowCells: PaletteCell[] = [];
      for (let col = 0; col < 9; col++) {
        rowCells.push(this.computeCell(base, mode, hueShift, range, row, col));
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
    const dRow = row - 4;
    const dCol = col - 4;
    const spread = this.rangeToSpread(range);

    let oklch: OklchColor;
    switch (mode) {
      case 'M': oklch = this.computeCellM(base, hueShift, range, dCol, row); break;
      case 'V': oklch = this.computeCellV(base, hueShift, range, dRow, dCol); break;
      case 'T': oklch = this.computeCellT(base, hueShift, range, row, col); break;
      case 'B': oklch = this.computeCellB(base, hueShift, spread, dRow, dCol); break;
    }

    const clamped = this.clampToGamut(oklch!);
    const outOfGamut = !this.isInGamut(oklch!);
    return { hex: this.oklchToHex(clamped), oklch: clamped, outOfGamut };
  }

  // ─── Mode: M — Match ─────────────────────────────────────────────────────
  /**
   * Match: every cell shares the base's perceptual lightness (L = constant).
   * Columns sweep hue left/right; rows gently reduce chroma toward the bottom.
   * "Same perceived brightness" — grayscale view should look uniform.
   *
   * Formula:
   *   L = base.l  (identical for all 81 cells)
   *   C = base.c * chromaMult  (flat rows 0–4, stepping down rows 5–8)
   *   H = base.h + hueShift + dCol * hStep
   *
   * hStep(range): wider at range=1, narrower at range=9.
   *   hStep(range) = 25 - (range-1) * (15/6)  → 25 down to ~2.5 °/col
   *
   * Chroma multipliers (rows 0–4 = 1.0, then):
   *   row 5 → ×0.95 | row 6 → ×0.90 | row 7 → ×0.85 | row 8 → ×0.80
   */
  private computeCellM(
    base: OklchColor,
    hueShift: number,
    range: number,
    dCol: number,
    row: number   
  ): OklchColor {
    const hStep = 25 - (range - 1) * (15 / 6);
    const h = this.normalizeHue(base.h + hueShift + dCol * hStep);

    // Chroma ramp: top 2 rows boost, bottom 2 rows cut, middle 5 rows flat
    let c = base.c;
    if (row === 5) c = base.c * 0.95;
    else if (row === 6) c = base.c * 0.9;
    else if (row === 7) c = base.c * 0.85;
    else if (row === 8) c = base.c * 0.8;

    return { l: base.l, c, h };
  }

  // ─── Mode: V — Vivid ─────────────────────────────────────────────────────
  /**
   * Vivid: same hue sweep as Match but lightness is nudged toward
   * the chroma-optimal zone (~0.65) to keep colors saturated.
   * Rows introduce a subtle L gradient.
   */
  private computeCellV(
    base: OklchColor,
    hueShift: number,
    range: number,
    dRow: number,
    dCol: number
  ): OklchColor {
    const hStep = 20 - (range - 1) * (15 / 8);
    const lStep = 0.04 * this.rangeToSpread(range);
    const h = this.normalizeHue(base.h + hueShift + dCol * hStep);
    const lRaw = base.l - dRow * lStep;
    // Pull lightness toward the chroma-optimal zone
    const optimal = 0.65;
    const l = Math.max(0.02, Math.min(0.99, lRaw + (optimal - lRaw) * 0.15));
    return { l, c: base.c, h };
  }

  // ─── Mode: T — Temperature ───────────────────────────────────────────────
  /**
   * Temperature: cool hues on the left, warm hues on the right.
   * Rows control lightness; columns control hue (temperature).
   *
   * Reverse-engineered from 9 steps of F56600 sample data:
   *   lSpan(range) = 1.0374 - 0.1032*(range-1)   → total L spread across 8 rows
   *   hStep(range) = 15.955 - 1.6408*(range-1)   → degrees per column
   *
   * Key correction: base.l sits at row 4 (center), NOT row 2.83.
   *   The earlier 2.83 reading was an artifact of clamping at the top.
   *   L_top = base.l + 4 * lStep  (and naturally clamps to 1.0 for bright bases)
   *
   * Chroma: T mode always uses max(base.c, TEMP_CHROMA=0.185)
   *   so gray/black bases still produce a visible temperature gradient.
   */
  private computeCellT(
    base: OklchColor,
    hueShift: number,
    range: number,
    row: number,
    col: number
  ): OklchColor {
    // ── 1. Lightness: rows go bright (top) → dark (bottom) ──────────────
    const lSpan = 1 - 0.105 * (range - 1);
    const lStep = lSpan / 8;
    const L_top = base.l + 4 * lStep;
    const l = Math.max(0, Math.min(1, L_top - row * lStep));

    // ── 2. Build a neutral OKLCH at this lightness, then → linear RGB ───
    // Use base chroma/hue as the "neutral" starting point
    const neutralOklch: OklchColor = { l, c: base.c, h: base.h + hueShift };
    const neutralRgb = this.oklchToRgb(neutralOklch); // 0–255 sRGB

    // ── 3. White balance shift in RGB space ──────────────────────────────
    // col 0 = coldest (blue), col 4 = neutral, col 8 = warmest (orange)
    const dCol = col - 4; // –4 … +4
    const wbStrength = 0.04 * (5 - range); // range=1 → strong, range=9 → subtle

    // Warm = boost R, reduce B | Cool = boost B, reduce R
    const rScale = 1 + dCol * wbStrength ;
    const gScale = 1 + dCol * wbStrength * 0; // green barely shifts (realistic WB)
    const bScale = 1 - dCol * wbStrength;

    const wbRgb: RgbColor = {
      r: Math.max(0, Math.min(255, neutralRgb.r * rScale)),
      g: Math.max(0, Math.min(255, neutralRgb.g * gScale)),
      b: Math.max(0, Math.min(255, neutralRgb.b * bScale)),
    };

    // ── 4. Brighten top 3 rows gradually ─────────────────────────────────
    // row 0 → +80, row 1 → +53, row 2 → +27, row 3+ → 0
    const brightnessBoost = row <= 2 ? (3 - row) * (80 / 3) : 0;
    const finalRgb: RgbColor = {
      r: Math.round(Math.min(255, wbRgb.r + brightnessBoost)),
      g: Math.round(Math.min(255, wbRgb.g + brightnessBoost)),
      b: Math.round(Math.min(255, wbRgb.b + brightnessBoost)),
    };

    // ── 5. Convert back to OKLCH ─────────────────────────────────────────
    return this.rgbToOklch(finalRgb);
  }

  // ─── Mode: B — Brightness + Temperature ──────────────────────────────────
  /**
   * Experimental: hue and lightness shift diagonally.
   * No reference data — approximate until we have pro version samples.
   */
  private computeCellB(
    base: OklchColor,
    hueShift: number,
    spread: number,
    dRow: number,
    dCol: number
  ): OklchColor {
    const lStep = 0.055 * spread;
    const hStep = 12 * spread;
    const l = Math.max(0.02, Math.min(0.99, base.l - (dRow - dCol) * lStep * 0.5));
    const h = this.normalizeHue(base.h + hueShift + dCol * hStep - dRow * hStep * 0.4);
    return { l, c: base.c, h };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Convert range 1–9 to a spread multiplier.
   * Used by M, V, B modes (T uses range directly in its own formula).
   */
  private rangeToSpread(range: number): number {
    return 1.0374 - 0.1032 * (range - 1);
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
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
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
    const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
    return {
      L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    };
  }

  private linearRgbToSrgb(linear: { r: number; g: number; b: number }): RgbColor {
    const toSrgb = (v: number) => {
      const c = Math.max(0, Math.min(1, v));
      return (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255;
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
