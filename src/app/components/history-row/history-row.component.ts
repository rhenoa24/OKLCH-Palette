import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';
import { HistoryService } from '../../core/services/history.service';
import { ColorService } from '../../core/services/color.service';

@Component({
  selector: 'app-history-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history-row.component.html',
  styleUrl: './history-row.component.scss',
})
export class HistoryRowComponent {
  readonly history = computed(() => this.historyService.history());
  readonly slots = computed(() => {
    const h = this.history();
    // Always show 9 slots; empty ones are null
    return Array.from({ length: 27 }, (_, i) => h[i] ?? null);
  });

  constructor(
    public state: AppStateService,
    private historyService: HistoryService,
    private colorService: ColorService,
  ) { }

  getHex(index: number): string | null {
    const color = this.history()[index];
    return color ? this.colorService.oklchToHex(color) : null;
  }

  onLeftClick(index: number): void {
    this.state.restoreFromHistory(index, false);
  }

  onRightClick(event: MouseEvent, index: number): void {
    event.preventDefault();
    this.state.restoreFromHistory(index, true);
  }

  clearHistory(): void {
    this.historyService.clear();
  }
}
