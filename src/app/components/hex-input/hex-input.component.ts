import { Component, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-hex-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hex-input.component.html',
  styleUrl: './hex-input.component.scss',
})
export class HexInputComponent {
  @ViewChild('hexField') hexField!: ElementRef<HTMLInputElement>;

  readonly selectedHex = computed(() => this.state.selectedHex());
  readonly eyedropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

  constructor(public state: AppStateService) { }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const value = (event.target as HTMLInputElement).value;
      this.state.setBaseFromHex(value);
      (event.target as HTMLInputElement).blur();
    }
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Strip non-hex chars, limit to 6
    input.value = input.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
  }

  onFocus(): void {
    // Select all text on focus for easy replacement
    this.hexField?.nativeElement.select();
  }

  async onEyedropper(): Promise<void> {
    if (!this.eyedropperSupported) return;
    try {
      const EyeDropperAPI = (window as any).EyeDropper;
      const dropper = new EyeDropperAPI();
      const result = await dropper.open();
      const hex = result.sRGBHex.replace('#', '');
      this.state.setBaseFromHex(hex);
    } catch {
      // User cancelled (Esc) — do nothing
    }
  }
}
