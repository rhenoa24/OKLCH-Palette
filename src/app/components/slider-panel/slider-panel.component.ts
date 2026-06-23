import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-slider-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slider-panel.component.html',
  styleUrl: './slider-panel.component.scss',
})
export class SliderPanelComponent {
  readonly hueShift = computed(() => this.state.hueShift());
  readonly range = computed(() => this.state.range());
  readonly lightness = computed(() => this.state.baseColor().l);
  readonly chroma = computed(() => this.state.baseColor().c);

  constructor(public state: AppStateService) { }

  onHueChange(event: Event): void {
    this.state.setHueShift(+(event.target as HTMLInputElement).value);
  }

  onRangeChange(event: Event): void {
    this.state.setRange(+(event.target as HTMLInputElement).value);
  }

  onLightnessChange(event: Event): void {
    this.state.setLightness(+(event.target as HTMLInputElement).value);
  }

  onChromaChange(event: Event): void {
    this.state.setChroma(+(event.target as HTMLInputElement).value);
  }
}
