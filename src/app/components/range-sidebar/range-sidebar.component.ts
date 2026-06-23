import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-range-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './range-sidebar.component.html',
  styleUrl: './range-sidebar.component.scss',
})
export class RangeSidebarComponent {
  readonly range = computed(() => this.state.range());
  readonly steps = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  constructor(public state: AppStateService) { }

  selectRange(value: number): void {
    this.state.setRange(value);
  }
}
