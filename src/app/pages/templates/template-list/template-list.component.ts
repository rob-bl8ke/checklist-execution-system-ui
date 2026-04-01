import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TemplatesApiService } from '../../../services/templates-api.service';
import { Template } from '../../../models/api.models';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-template-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">Templates</h1>
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          (click)="createTemplate()"
        >
          + Create Template
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner label="Loading templates…" />
      } @else if (error()) {
        <p class="text-red-600 text-sm">{{ error() }}</p>
      } @else if (templates().length === 0) {
        <app-empty-state message="No templates yet. Create your first template to get started." />
      } @else {
        <ul class="divide-y divide-gray-200 bg-white rounded-xl shadow-sm overflow-hidden">
          @for (tmpl of templates(); track tmpl.id) {
            <li class="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <button
                type="button"
                class="flex-1 text-left"
                (click)="openTemplate(tmpl.id)"
              >
                <span class="font-medium text-gray-900">{{ tmpl.name }}</span>
                <span class="ml-3 text-sm text-gray-400">{{ tmpl.stepCount ?? 0 }} step{{ (tmpl.stepCount ?? 0) === 1 ? '' : 's' }}</span>
              </button>
              <button
                type="button"
                class="ml-4 text-red-400 hover:text-red-600 transition-colors text-sm"
                (click)="confirmDelete(tmpl)"
                aria-label="Delete template"
              >
                Delete
              </button>
            </li>
          }
        </ul>
      }
    </div>

    @if (pendingDelete()) {
      <app-confirm-dialog
        title="Delete template"
        [message]="'Delete ' + pendingDelete()!.name + '? This cannot be undone.'"
        (confirmed)="executeDelete()"
        (cancelled)="pendingDelete.set(null)"
      />
    }
  `,
})
export class TemplateListComponent implements OnInit {
  private readonly api = inject(TemplatesApiService);
  private readonly router = inject(Router);

  readonly templates = signal<Template[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendingDelete = signal<Template | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load templates.');
        this.loading.set(false);
      },
    });
  }

  openTemplate(id: number): void {
    this.router.navigate(['/templates', id]);
  }

  createTemplate(): void {
    this.router.navigate(['/templates', 'new']);
  }

  confirmDelete(tmpl: Template): void {
    this.pendingDelete.set(tmpl);
  }

  executeDelete(): void {
    const tmpl = this.pendingDelete();
    if (!tmpl) return;
    this.pendingDelete.set(null);
    this.api.deleteTemplate(tmpl.id).subscribe({
      next: () => {
        this.templates.update((list) => list.filter((t) => t.id !== tmpl.id));
      },
      error: (err) => {
        const msg =
          err?.status === 409
            ? 'Cannot delete: one or more reminders reference this template. Remove or update those reminders first.'
            : 'Failed to delete template. Please try again.';
        this.error.set(msg);
      },
    });
  }
}
