import { Injectable, signal, computed } from '@angular/core';
import { OklchColor } from '../../shared/models/color';
import { ColorService } from './color.service';

const MAX_HISTORY = 27;

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private _history = signal<OklchColor[]>([]);

  readonly history = computed(() => this._history());

  constructor(private colorService: ColorService) { }

  push(color: OklchColor): void {
    const current = this._history();
    // Avoid duplicate of the most recent entry
    if (current.length > 0) {
      const lastHex = this.colorService.oklchToHex(current[0]);
      const newHex = this.colorService.oklchToHex(color);
      if (lastHex === newHex) return;
    }
    const updated = [color, ...current].slice(0, MAX_HISTORY);
    this._history.set(updated);
  }

  clear(): void {
    this._history.set([]);
  }

  getAt(index: number): OklchColor | null {
    return this._history()[index] ?? null;
  }
}
