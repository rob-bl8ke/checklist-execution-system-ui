import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-note-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">
          {{ isCreateMode() ? 'Create Note' : 'Edit Note' }}
        </h1>
        <p class="mt-2 text-sm text-gray-600">
          The editor route is wired and ready for the full note editor experience.
        </p>
      </div>

      <div class="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
        <p class="text-sm text-gray-500">
          @if (isCreateMode()) {
            New-note navigation is working.
          } @else {
            Note {{ noteId() }} edit navigation is working.
          }
        </p>
      </div>
    </div>
  `,
})
export class NoteEditorComponent {
  private readonly route = inject(ActivatedRoute);

  noteId(): string | null {
    return this.route.snapshot.paramMap.get('id');
  }

  isCreateMode(): boolean {
    return this.noteId() === null;
  }
}
