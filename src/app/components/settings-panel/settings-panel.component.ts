import { Component, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.scss',
})
export class SettingsPanelComponent {
  readonly close = output<void>();
  readonly settings = computed(() => this.state.settings());

  constructor(public state: AppStateService) { }

  onAutoCopyChange(event: Event): void {
    this.state.updateSettings({ autoCopyHex: (event.target as HTMLInputElement).checked });
  }

  onWheelHueChange(event: Event): void {
    this.state.updateSettings({ wheelHueScroll: (event.target as HTMLInputElement).checked });
  }

  onScaleChange(event: Event): void {
    this.state.updateSettings({ uiScale: +(event.target as HTMLInputElement).value });
  }

  onClose(): void {
    this.close.emit();
  }
}
