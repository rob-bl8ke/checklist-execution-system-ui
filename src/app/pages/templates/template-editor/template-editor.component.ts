import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { TemplatesApiService } from '../../../services/templates-api.service';
import { Template, TemplateStep } from '../../../models/api.models';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { StepEditorComponent } from '../step-editor/step-editor.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-template-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DragDropModule,
    LoadingSpinnerComponent,
    StepEditorComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <button
          type="button"
          class="text-gray-500 hover:text-gray-700 text-sm"
          (click)="goBack()"
        >
          ← Templates
        </button>
        <h1 class="text-2xl font-semibold text-gray-900">
          {{ isNew() ? 'New Template' : 'Edit Template' }}
        </h1>
      </div>

      @if (loading()) {
        <app-loading-spinner label="Loading template…" />
      } @else {
        <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div class="flex flex-col gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="tmpl-name">Name</label>
              <input
                id="tmpl-name"
                type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                [(ngModel)]="name"
                placeholder="Template name…"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="tmpl-desc">Description</label>
              <textarea
                id="tmpl-desc"
                rows="3"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                [(ngModel)]="description"
                placeholder="Optional description…"
              ></textarea>
            </div>

            <!-- Variable Delimiters (collapsible) -->
            <div>
              <button
                type="button"
                class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                (click)="showDelimiters.set(!showDelimiters())"
              >
                {{ showDelimiters() ? '▾' : '▸' }} Variable Delimiters
              </button>

              @if (showDelimiters()) {
                <div class="mt-3 flex flex-col gap-3 pl-4 border-l-2 border-gray-200">
                  <p class="text-xs text-gray-400">
                    Customize the opening and closing delimiters for template variables.
                    Leave blank to use the defaults <code>&#123;&#123;</code> and <code>&#125;&#125;</code>.
                  </p>
                  <div class="flex gap-3">
                    <div class="flex-1">
                      <label class="block text-xs font-medium text-gray-600 mb-1" for="tmpl-prefix">Prefix</label>
                      <input
                        id="tmpl-prefix"
                        type="text"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        [(ngModel)]="variablePrefix"
                        placeholder="{{"
                        maxlength="10"
                      />
                    </div>
                    <div class="flex-1">
                      <label class="block text-xs font-medium text-gray-600 mb-1" for="tmpl-suffix">Suffix</label>
                      <input
                        id="tmpl-suffix"
                        type="text"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        [(ngModel)]="variableSuffix"
                        placeholder="}}"
                        maxlength="10"
                      />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 mt-4">
            @if (saveError()) {
              <span class="text-red-600 text-sm">{{ saveError() }}</span>
            }
            <button
              type="button"
              class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              [disabled]="saving() || !name.trim()"
              (click)="saveTemplate()"
            >
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>

        <!-- Steps -->
        @if (templateId()) {
          <div class="bg-white rounded-xl shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Steps</h2>
              <button
                type="button"
                class="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
                (click)="openStepEditor(null)"
              >
                + Add Step
              </button>
            </div>

            @if (steps().length === 0) {
              <p class="text-sm text-gray-400">No steps yet. Add your first step.</p>
            } @else {
              <ul
                cdkDropList
                (cdkDropListDropped)="onStepDrop($event)"
                class="flex flex-col gap-2"
              >
                @for (step of steps(); track step.id) {
                  <li
                    cdkDrag
                    class="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 cursor-default"
                  >
                    <span cdkDragHandle class="text-gray-400 cursor-grab select-none" aria-label="Drag to reorder">⠿</span>
                    <button
                      type="button"
                      class="flex-1 text-left text-sm text-gray-900 hover:text-blue-600"
                      (click)="openStepEditor(step)"
                    >
                      {{ step.title }}
                    </button>
                    <button
                      type="button"
                      class="text-gray-400 hover:text-red-600 text-sm px-1"
                      aria-label="Delete step"
                      (click)="confirmDeleteStep(step)"
                    >✕</button>
                  </li>
                }
              </ul>
            }

            @if (dragError()) {
              <p class="text-red-600 text-sm mt-2">{{ dragError() }}</p>
            }
          </div>
        }
      }
    </div>

    @if (editingStep() !== undefined) {
      <app-step-editor
        [templateId]="templateId()!"
        [step]="editingStep()!"
        (saved)="onStepSaved($event)"
        (cancel)="editingStep.set(undefined)"
      />
    }

    @if (stepToDelete() !== undefined) {
      <app-confirm-dialog
        title="Delete Step"
        [message]="deleteStepMessage()"
        (confirmed)="executeDeleteStep()"
        (cancelled)="stepToDelete.set(undefined)"
      />
    }
  `,
})
export class TemplateEditorComponent implements OnInit {
  private readonly api = inject(TemplatesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isNew = signal(false);
  readonly templateId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly steps = signal<TemplateStep[]>([]);
  readonly dragError = signal<string | null>(null);
  /** undefined = editor closed; null = new step; TemplateStep = edit mode */
  readonly editingStep = signal<TemplateStep | null | undefined>(undefined);
  /** undefined = dialog closed; TemplateStep = confirm delete for that step */
  readonly stepToDelete = signal<TemplateStep | undefined>(undefined);
  readonly deleteError = signal<string | null>(null);
  readonly deleteStepMessage = computed(() => {
    const s = this.stepToDelete();
    return s ? `Delete step "${s.title}"? This cannot be undone.` : '';
  });

  name = '';
  description = '';
  variablePrefix = '';
  variableSuffix = '';
  readonly showDelimiters = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new') {
      this.isNew.set(true);
    } else if (id) {
      this.templateId.set(Number(id));
      this.loadTemplate(Number(id));
    }
  }

  private loadTemplate(id: number): void {
    this.loading.set(true);
    this.api.getTemplate(id).subscribe({
      next: (template: Template) => {
        this.name = template.name;
        this.description = template.description ?? '';
        this.variablePrefix = template.variablePrefix ?? '';
        this.variableSuffix = template.variableSuffix ?? '';
        if (this.variablePrefix || this.variableSuffix) this.showDelimiters.set(true);
        this.loading.set(false);
        this.loadSteps(id);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadSteps(id: number): void {
    this.api.getSteps(id).subscribe({
      next: (steps) => this.steps.set(steps),
    });
  }

  saveTemplate(): void {
    if (!this.name.trim()) return;
    this.saving.set(true);
    this.saveError.set(null);
    const prefix = this.variablePrefix.trim();
    const suffix = this.variableSuffix.trim();
    const dto = {
      name: this.name.trim(),
      description: this.description.trim() || undefined,
      ...(prefix && suffix ? { variablePrefix: prefix, variableSuffix: suffix } : {}),
    };

    const call$ = this.isNew()
      ? this.api.createTemplate(dto)
      : this.api.updateTemplate(this.templateId()!, dto);

    call$.subscribe({
      next: (template) => {
        this.saving.set(false);
        if (this.isNew()) {
          this.isNew.set(false);
          this.templateId.set(template.id);
          this.router.navigate(['/templates', template.id], { replaceUrl: true });
          this.loadSteps(template.id);
        }
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Failed to save template.');
      },
    });
  }

  openStepEditor(step: TemplateStep | null): void {
    this.editingStep.set(step);
  }

  onStepSaved(step: TemplateStep): void {
    this.editingStep.set(undefined);
    this.steps.update((list) => {
      const idx = list.findIndex((s) => s.id === step.id);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = step;
        return updated;
      }
      return [...list, step];
    });
  }

  onStepDrop(event: CdkDragDrop<TemplateStep[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const previous = this.steps().slice();
    const reordered = this.steps().slice();
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.steps.set(reordered);

    const moved = reordered[event.currentIndex];
    const beforeStep = reordered[event.currentIndex - 1] ?? null;
    const afterStep = reordered[event.currentIndex + 1] ?? null;

    this.dragError.set(null);
    this.api
      .moveStep(this.templateId()!, moved.id, {
        beforeStepId: beforeStep?.id ?? null,
        afterStepId: afterStep?.id ?? null,
      })
      .subscribe({
        error: () => {
          this.steps.set(previous);
          this.dragError.set('Failed to reorder step. Please try again.');
        },
      });
  }

  confirmDeleteStep(step: TemplateStep): void {
    this.stepToDelete.set(step);
  }

  executeDeleteStep(): void {
    const step = this.stepToDelete();
    if (!step) return;
    this.api.deleteStep(this.templateId()!, step.id).subscribe({
      next: () => {
        this.steps.update((list) => list.filter((s) => s.id !== step.id));
        this.stepToDelete.set(undefined);
        this.deleteError.set(null);
      },
      error: () => {
        this.stepToDelete.set(undefined);
        this.deleteError.set('Failed to delete step. Please try again.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/templates']);
  }
}
