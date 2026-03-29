import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-2 py-8" role="status">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"
        aria-hidden="true"
      ></div>
      @if (label()) {
        <span class="text-sm text-gray-500">{{ label() }}</span>
      }
      <span class="sr-only">{{ label() || 'Loading…' }}</span>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  label = input<string>();
}
