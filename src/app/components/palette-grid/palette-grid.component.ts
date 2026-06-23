import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';
import { PaletteCell } from '../../shared/models/color';
import { HistoryService } from '../../core/services/history.service';

@Component({
  selector: 'app-palette-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './palette-grid.component.html',
  styleUrl: './palette-grid.component.scss',
})
export class PaletteGridComponent {
  readonly palette = computed(() => this.state.palette());
  readonly baseHex = computed(() => this.state.baseHex());

  constructor(
    public state: AppStateService,
    private historyService: HistoryService,
  ) { }

  onLeftClick(cell: PaletteCell): void {
    this.historyService.push(cell.oklch);  // store the color you just clicked
    this.state.selectColor(cell.oklch);
  }

  onRightClick(event: MouseEvent, cell: PaletteCell): void {
    event.preventDefault();
    this.state.setBaseFromCell(cell.oklch);  // traversal only, no history
  }

  isCenter(row: number, col: number): boolean {
    return row === 4 && col === 4;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
