import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';
import { PaletteCell } from '../../shared/models/color';

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

  constructor(public state: AppStateService) { }

  onLeftClick(cell: PaletteCell): void {
    this.state.selectColor(cell.oklch);
  }

  onRightClick(event: MouseEvent, cell: PaletteCell): void {
    event.preventDefault();
    this.state.setBaseFromCell(cell.oklch);
  }

  onAltClick(event: MouseEvent, cell: PaletteCell): void {
    if (event.altKey) {
      event.preventDefault();
      this.state.setBaseFromCell(cell.oklch);
    }
  }

  isCenter(row: number, col: number): boolean {
    return row === 4 && col === 4;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
