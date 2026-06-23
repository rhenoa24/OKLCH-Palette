import {
  Component, computed, ElementRef, ViewChild,
  AfterViewInit, OnDestroy, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';
import { ColorService } from '../../core/services/color.service';
import { WheelMode } from '../../shared/models/color';

@Component({
  selector: 'app-color-wheel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-wheel.component.html',
  styleUrl: './color-wheel.component.scss',
})
export class ColorWheelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('wheelCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly wheelMode = computed(() => this.state.wheelMode());
  readonly baseColor = computed(() => this.state.baseColor());
  readonly lightness = computed(() => this.state.baseColor().l);

  private ctx: CanvasRenderingContext2D | null = null;
  private readonly SIZE = 280;

  // Dragging state
  private isDragging = false;

  constructor(
    public state: AppStateService,
    private colorService: ColorService,
  ) {
    // Re-render wheel when mode or base color changes
    effect(() => {
      this.wheelMode();
      this.baseColor();
      this.renderWheel();
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      canvas.width = this.SIZE;
      canvas.height = this.SIZE;
      this.ctx = canvas.getContext('2d');
      this.renderWheel();
    }
  }

  ngOnDestroy(): void { }

  // ─── Render ─────────────────────────────────────────────────────────────

  private renderWheel(): void {
    if (!this.ctx) return;
    const mode = this.wheelMode();
    if (mode === 'hsv' || mode === 'none') {
      this.renderHsvWheel();
    } else if (mode === 'oklch-circular') {
      this.renderOklchCircularWheel();
    } else if (mode === 'oklch-square') {
      this.renderOklchSquareWheel();
    }
  }

  private renderHsvWheel(): void {
    const ctx = this.ctx!;
    const cx = this.SIZE / 2;
    const cy = this.SIZE / 2;
    const radius = this.SIZE / 2 - 4;
    const imageData = ctx.createImageData(this.SIZE, this.SIZE);

    for (let y = 0; y < this.SIZE; y++) {
      for (let x = 0; x < this.SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > radius) continue;

        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const sat = dist / radius;
        const val = 1.0;

        const [r, g, b] = this.hsvToRgb(hue, sat, val);
        const idx = (y * this.SIZE + x) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private renderOklchCircularWheel(): void {
    const ctx = this.ctx!;
    const cx = this.SIZE / 2;
    const cy = this.SIZE / 2;
    const radius = this.SIZE / 2 - 4;
    const maxChroma = 0.32;
    const l = this.lightness();
    const imageData = ctx.createImageData(this.SIZE, this.SIZE);

    for (let y = 0; y < this.SIZE; y++) {
      for (let x = 0; x < this.SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > radius) continue;

        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const chroma = (dist / radius) * maxChroma;
        const oklch = { l, c: chroma, h: hue };

        const rgb = this.colorService.oklchToRgb(oklch);
        const inGamut = this.colorService.isInGamut(oklch);
        const idx = (y * this.SIZE + x) * 4;

        if (inGamut) {
          imageData.data[idx] = Math.round(rgb.r);
          imageData.data[idx + 1] = Math.round(rgb.g);
          imageData.data[idx + 2] = Math.round(rgb.b);
          imageData.data[idx + 3] = 255;
        } else {
          // Out-of-gamut: gray
          imageData.data[idx] = 80;
          imageData.data[idx + 1] = 80;
          imageData.data[idx + 2] = 80;
          imageData.data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private renderOklchSquareWheel(): void {
    const ctx = this.ctx!;
    const l = this.lightness();
    const maxChroma = 0.32;
    const imageData = ctx.createImageData(this.SIZE, this.SIZE);

    for (let y = 0; y < this.SIZE; y++) {
      for (let x = 0; x < this.SIZE; x++) {
        const hue = (x / this.SIZE) * 360;
        const chroma = (1 - y / this.SIZE) * maxChroma;
        const oklch = { l, c: chroma, h: hue };

        const rgb = this.colorService.oklchToRgb(oklch);
        const inGamut = this.colorService.isInGamut(oklch);
        const idx = (y * this.SIZE + x) * 4;

        if (inGamut) {
          imageData.data[idx] = Math.round(rgb.r);
          imageData.data[idx + 1] = Math.round(rgb.g);
          imageData.data[idx + 2] = Math.round(rgb.b);
        } else {
          imageData.data[idx] = 80;
          imageData.data[idx + 1] = 80;
          imageData.data[idx + 2] = 80;
        }
        imageData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // ─── Interaction ─────────────────────────────────────────────────────────

  onCanvasClick(event: MouseEvent): void {
    this.pickColorAt(event);
  }

  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.pickColorAt(event);
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) this.pickColorAt(event);
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  private pickColorAt(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = this.SIZE / rect.width;
    const scaleY = this.SIZE / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const mode = this.wheelMode();
    let oklch = this.baseColor();

    if (mode === 'hsv') {
      oklch = this.pickHsv(x, y);
    } else if (mode === 'oklch-circular') {
      oklch = this.pickOklchCircular(x, y);
    } else if (mode === 'oklch-square') {
      oklch = this.pickOklchSquare(x, y);
    }

    this.state.selectColor(oklch);
  }

  private pickHsv(x: number, y: number): import('../../shared/models/color').OklchColor {
    const cx = this.SIZE / 2;
    const cy = this.SIZE / 2;
    const radius = this.SIZE / 2 - 4;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
    const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const sat = dist / radius;
    // Convert HSV → RGB → OKLCH
    const [r, g, b] = this.hsvToRgb(hue, sat, 1);
    return this.colorService.rgbToOklch({ r, g, b });
  }

  private pickOklchCircular(x: number, y: number): import('../../shared/models/color').OklchColor {
    const cx = this.SIZE / 2;
    const cy = this.SIZE / 2;
    const radius = this.SIZE / 2 - 4;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
    const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const chroma = (dist / radius) * 0.32;
    return this.colorService.clampToGamut({ l: this.lightness(), c: chroma, h: hue });
  }

  private pickOklchSquare(x: number, y: number): import('../../shared/models/color').OklchColor {
    const hue = (x / this.SIZE) * 360;
    const chroma = (1 - y / this.SIZE) * 0.32;
    return this.colorService.clampToGamut({ l: this.lightness(), c: chroma, h: hue });
  }

  onLightnessChange(event: Event): void {
    this.state.setLightness(+(event.target as HTMLInputElement).value);
  }

  // ─── HSV Helper ──────────────────────────────────────────────────────────

  private hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - Math.floor(h / 60);
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const cases: [number, number, number][] = [
      [v, t, p], [q, v, p], [p, v, t],
      [p, q, v], [t, p, v], [v, p, q],
    ];
    const [r, g, b] = cases[i];
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
}
