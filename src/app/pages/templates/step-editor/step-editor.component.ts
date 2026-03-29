import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { TemplatesApiService } from '../../../services/templates-api.service';
import { TemplateStep } from '../../../models/api.models';

@Component({
  selector: 'app-step-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MarkdownComponent],
  template: `
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ step() ? 'Edit Step' : 'Add Step' }}
          </h2>
          <button type="button" class="text-gray-400 hover:text-gray-600" (click)="cancel.emit()">✕</button>
        </div>

        <div class="flex flex-col gap-4 overflow-y-auto p-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="step-title">Title</label>
            <input
              id="step-title"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              [(ngModel)]="title"
              placeholder="Step title…"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col">
              <label class="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <textarea
                class="flex-1 min-h-48 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                [(ngModel)]="instructions"
                placeholder="Markdown instructions…"
              ></textarea>
            </div>

            <div class="flex flex-col">
              <span class="block text-sm font-medium text-gray-700 mb-1">Preview</span>
              <div class="flex-1 min-h-48 border border-gray-200 rounded-lg p-3 overflow-y-auto prose prose-sm max-w-none bg-gray-50">
                <markdown [data]="instructions || '_No content yet_'" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            (click)="cancel.emit()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            [disabled]="saving() || !title.trim()"
            (click)="save()"
          >
            {{ saving() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class StepEditorComponent implements OnChanges {
  private readonly api = inject(TemplatesApiService);

  templateId = input.required<number>();
  step = input<TemplateStep | null>(null);

  saved = output<TemplateStep>();
  cancel = output<void>();

  title = '';
  instructions = '';
  readonly saving = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['step']) {
      const s = this.step();
      this.title = s?.title ?? '';
      this.instructions = s?.instructions ?? '';
    }
  }

  save(): void {
    if (!this.title.trim()) return;
    this.saving.set(true);
    const existing = this.step();
    const dto = { title: this.title.trim(), instructions: this.instructions };

    const call$ = existing
      ? this.api.updateStep(this.templateId(), existing.id, dto)
      : this.api.createStep(this.templateId(), dto);

    call$.subscribe({
      next: (step) => {
        this.saving.set(false);
        this.saved.emit(step);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
}
