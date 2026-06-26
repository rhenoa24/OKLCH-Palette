import { Component, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from './core/services/app-state.service';

// Components
import { ModeSelectorComponent } from './components/mode-selector/mode-selector.component';
import { SwatchRowComponent } from './components/swatch-row/swatch-row.component';
import { HexInputComponent } from './components/hex-input/hex-input.component';
import { PaletteGridComponent } from './components/palette-grid/palette-grid.component';
import { RangeSidebarComponent } from './components/range-sidebar/range-sidebar.component';
import { ColorWheelComponent } from './components/color-wheel/color-wheel.component';
import { SliderPanelComponent } from './components/slider-panel/slider-panel.component';
import { HistoryRowComponent } from './components/history-row/history-row.component';
import { SettingsPanelComponent } from './components/settings-panel/settings-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ModeSelectorComponent,
    SwatchRowComponent,
    HexInputComponent,
    PaletteGridComponent,
    RangeSidebarComponent,
    ColorWheelComponent,
    SliderPanelComponent,
    HistoryRowComponent,
    SettingsPanelComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly showWheel = computed(() => this.state.showWheel());
  readonly uiScale = computed(() => this.state.settings().uiScale);
  readonly wheelHue = computed(() => this.state.settings().wheelHueScroll);
  readonly grayscale = computed(() => this.state.grayscale());
  showSettings = signal(false);

  constructor(public state: AppStateService) { }

  toggleSettings(): void {
    this.showSettings.update(v => !v);
  }

  //@HostListener('wheel', ['$event'])
  //onMouseWheel(event: WheelEvent): void {
  //  if (!this.wheelHue()) return;
  //  // Shift hue on scroll
  //  const delta = event.deltaY > 0 ? 5 : -5;
  //  this.state.setHueShift(this.state.hueShift() + delta);
  //}
}
