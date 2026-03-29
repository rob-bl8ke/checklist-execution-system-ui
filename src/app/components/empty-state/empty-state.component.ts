import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span class="text-4xl">📭</span>
      <p class="text-gray-500 text-sm">{{ message() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  message = input.required<string>();
}
