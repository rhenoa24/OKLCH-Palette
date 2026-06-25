import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-swatch-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './swatch-row.component.html',
  styleUrl: './swatch-row.component.scss',
})
export class SwatchRowComponent {

  readonly centerHex = computed(() => this.state.centerHex());
  readonly selectedHex = computed(() => this.state.selectedHex());
  readonly locked = computed(() => this.state.locked());

  constructor(public state: AppStateService) { }

  onBaseDblClick(): void {
    this.state.toggleLock();
  }

  onSelectedClick(): void {
    this.state.promoteSelectedToBase();
  }
}
