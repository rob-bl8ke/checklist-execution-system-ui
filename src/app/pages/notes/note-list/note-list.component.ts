import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-note-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">Notes</h1>
        <p class="mt-2 text-sm text-gray-600">
          Notes is wired into routing and ready for the list experience to be built.
        </p>
      </div>

      <div class="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
        <p class="text-sm text-gray-500">The Notes page stub is loading correctly.</p>
      </div>
    </div>
  `,
})
export class NoteListComponent {}