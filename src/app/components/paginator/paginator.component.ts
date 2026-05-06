import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages > 1) {
      <nav class="flex items-center justify-center gap-1 mt-4" aria-label="Pagination">
        <button
          type="button"
          class="px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="page === 1"
          (click)="emit(page - 1)"
          aria-label="Previous page"
        >← Prev</button>

        @for (p of pages; track p) {
          <button
            type="button"
            class="px-3 py-1 text-sm rounded border transition-colors"
            [class.bg-blue-600]="p === page"
            [class.text-white]="p === page"
            [class.border-blue-600]="p === page"
            [class.border-gray-300]="p !== page"
            [class.text-gray-700]="p !== page"
            (click)="emit(p)"
            [attr.aria-label]="'Page ' + p"
            [attr.aria-current]="p === page ? 'page' : null"
          >{{ p }}</button>
        }

        <button
          type="button"
          class="px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="page === totalPages"
          (click)="emit(page + 1)"
          aria-label="Next page"
        >Next →</button>
      </nav>
    }
  `,
})
export class PaginatorComponent {
  @Input() page!: number;
  @Input() totalPages!: number;
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    const delta = 2;
    const start = Math.max(1, this.page - delta);
    const end = Math.min(this.totalPages, this.page + delta);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  emit(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.pageChange.emit(p);
    }
  }
}
