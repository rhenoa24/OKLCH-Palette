import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';
import { PaletteMode, WheelMode } from '../../shared/models/color';

interface ModeTab {
  id: PaletteMode;
  label: string;
}

interface WheelTab {
  id: WheelMode;
  label: string;
}

@Component({
  selector: 'app-mode-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mode-selector.component.html',
  styleUrl: './mode-selector.component.scss',
})
export class ModeSelectorComponent {
  readonly paletteModes: ModeTab[] = [
    { id: 'M', label: 'M' },
    { id: 'T', label: 'T' },
    { id: 'V', label: 'V' },
    { id: 'B', label: 'B' },
  ];

  readonly wheelModes: WheelTab[] = [
    { id: 'hsv', label: '▶' },
    { id: 'oklch-circular', label: '○' },
  ];

  readonly activeMode = computed(() => this.state.paletteMode());
  readonly activeWheel = computed(() => this.state.wheelMode());
  readonly showWheel = computed(() => this.state.showWheel());

  constructor(public state: AppStateService) { }

  selectMode(mode: PaletteMode): void {
    this.state.setMode(mode);
    // Switch back to palette view when a palette mode is selected
    if (this.showWheel()) {
      this.state.setWheelMode('none');
    }
  }

  toggleWheel(wheel: WheelMode): void {
    const current = this.activeWheel();
    // If already active, close; otherwise open
    this.state.setWheelMode(current === wheel ? 'none' : wheel);
  }
}
