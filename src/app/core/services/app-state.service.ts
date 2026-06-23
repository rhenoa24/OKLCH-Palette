import { Injectable, signal, computed } from '@angular/core';
import { OklchColor, PaletteMode, WheelMode, AppSettings, PaletteCell } from '../../shared/models/color';
import { ColorService } from './color.service';
import { HistoryService } from './history.service';

const DEFAULT_SETTINGS: AppSettings = {
  autoCopyHex: true,
  altClickPick: true,
  uiScale: 100,
  wheelHueScroll: true,
  enabledModes: ['M', 'V', 'T', 'B'],
};

@Injectable({ providedIn: 'root' })
export class AppStateService {

  // ─── Core signals ────────────────────────────────────────────────────────
  readonly baseColor = signal<OklchColor>({ l: 0.75, c: 0.12, h: 220 });
  readonly selectedColor = signal<OklchColor>({ l: 0.75, c: 0.12, h: 220 });
  readonly paletteMode = signal<PaletteMode>('M');
  readonly wheelMode = signal<WheelMode>('none');
  readonly hueShift = signal<number>(0);
  readonly range = signal<number>(1);
  readonly locked = signal<boolean>(false);
  readonly showOutOfGamut = signal<boolean>(false);
  readonly settings = signal<AppSettings>(DEFAULT_SETTINGS);

  // ─── Derived ─────────────────────────────────────────────────────────────
  readonly baseHex = computed(() => this.colorService.oklchToHex(this.baseColor()));
  readonly selectedHex = computed(() => this.colorService.oklchToHex(this.selectedColor()));

  readonly palette = computed<PaletteCell[][]>(() =>
    this.colorService.generatePalette(
      this.baseColor(),
      this.paletteMode(),
      this.hueShift(),
      this.range()
    )
  );

  readonly showWheel = computed(() => this.wheelMode() !== 'none');

  constructor(
    private colorService: ColorService,
    private historyService: HistoryService,
  ) { }

  // ─── Actions ─────────────────────────────────────────────────────────────

  /** Left-click a palette cell → set as selected */
  selectColor(oklch: OklchColor): void {
    this.selectedColor.set(oklch);
    if (this.settings().autoCopyHex) {
      this.copyToClipboard(this.colorService.oklchToHex(oklch));
    }
  }

  /** Right-click / Alt+click a palette cell → set as new base and regenerate */
  setBaseFromCell(oklch: OklchColor): void {
    if (this.locked()) return;
    this.baseColor.set(oklch);
    this.selectedColor.set(oklch);
    this.hueShift.set(0);
  }

  /** Click the right (selected) swatch → promote selected to base */
  promoteSelectedToBase(): void {
    if (this.locked()) return;
    this.historyService.push(this.baseColor());
    this.baseColor.set(this.selectedColor());
    this.hueShift.set(0);
  }

  /** Type HEX + Enter */
  setBaseFromHex(hex: string): void {
    if (this.locked()) return;
    const clean = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return;
    const oklch = this.colorService.hexToOklch(clean);
    this.historyService.push(this.baseColor());
    this.baseColor.set(oklch);
    this.selectedColor.set(oklch);
    this.hueShift.set(0);
  }

  /** Double-click left swatch → toggle lock */
  toggleLock(): void {
    this.locked.update(v => !v);
  }

  setMode(mode: PaletteMode): void {
    this.paletteMode.set(mode);
  }

  setWheelMode(mode: WheelMode): void {
    this.wheelMode.set(mode);
  }

  setHueShift(value: number): void {
    this.hueShift.set(value);
  }

  setRange(value: number): void {
    this.range.set(Math.max(1, Math.min(9, value)));
  }

  setLightness(l: number): void {
    if (this.locked()) return;
    this.baseColor.update(c => ({ ...c, l: Math.max(0, Math.min(1, l)) }));
  }

  setChroma(c: number): void {
    if (this.locked()) return;
    this.baseColor.update(color => ({ ...color, c: Math.max(0, Math.min(0.4, c)) }));
  }

  /** Restore from history: left-click = selected, right-click = base */
  restoreFromHistory(index: number, asBase: boolean): void {
    const color = this.historyService.getAt(index);
    if (!color) return;
    if (asBase) {
      this.setBaseFromCell(color);
    } else {
      this.selectColor(color);
    }
  }

  updateSettings(patch: Partial<AppSettings>): void {
    this.settings.update(s => ({ ...s, ...patch }));
  }

  toggleOutOfGamut(): void {
    this.showOutOfGamut.update(v => !v);
  }

  private copyToClipboard(hex: string): void {
    navigator.clipboard.writeText(hex).catch(() => { });
  }
}
