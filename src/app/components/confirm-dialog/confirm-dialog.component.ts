import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="'dialog-title'"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 id="dialog-title" class="text-lg font-semibold text-gray-900 mb-2">
          {{ title() }}
        </h2>
        <p class="text-sm text-gray-600 mb-6">{{ message() }}</p>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            (click)="cancelled.emit()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            (click)="confirmed.emit()"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  title = input.required<string>();
  message = input.required<string>();

  confirmed = output<void>();
  cancelled = output<void>();
}
