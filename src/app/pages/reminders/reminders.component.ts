import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { RemindersApiService } from '../../services/reminders-api.service';
import { ReminderDefinition } from '../../models/api.models';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-reminders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LowerCasePipe, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">Reminders</h1>
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          (click)="newReminder()"
        >
          + New Reminder
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner label="Loading reminders…" />
      } @else if (error()) {
        <p class="text-red-600 text-sm">{{ error() }}</p>
      } @else if (reminders().length === 0) {
        <app-empty-state message="No reminders yet. Create one to get started." />
      } @else {
        <div class="flex flex-col gap-3">
          @for (reminder of reminders(); track reminder.id) {
            <div
              class="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              (click)="editReminder(reminder.id)"
            >
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">{{ reminder.title }}</span>
                  @if (!reminder.active) {
                    <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                  }
                </div>
                <span class="text-xs text-gray-400">
                  {{ reminder.cadence | lowercase }}
                  @if (reminder.category) {
                    · {{ reminder.category }}
                  }
                  · starts {{ reminder.anchorDate }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="text-red-400 hover:text-red-600 text-xs transition-colors"
                  (click)="$event.stopPropagation(); deleteReminder(reminder)"
                  [attr.aria-label]="'Delete ' + reminder.title"
                >
                  Delete
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class RemindersComponent implements OnInit {
  private readonly api = inject(RemindersApiService);
  private readonly router = inject(Router);

  readonly reminders = signal<ReminderDefinition[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getReminders().subscribe({
      next: (items) => {
        this.reminders.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load reminders.');
        this.loading.set(false);
      },
    });
  }

  newReminder(): void {
    this.router.navigate(['/reminders/new']);
  }

  editReminder(id: number): void {
    this.router.navigate(['/reminders', id]);
  }

  deleteReminder(reminder: ReminderDefinition): void {
    if (!confirm(`Delete "${reminder.title}"?`)) return;
    this.api.deleteReminder(reminder.id).subscribe({
      next: () => {
        this.reminders.update((items) => items.filter((r) => r.id !== reminder.id));
      },
      error: (err) => {
        const msg =
          err?.status === 409
            ? 'Cannot delete: a template is linked to this reminder.'
            : 'Failed to delete reminder.';
        alert(msg);
      },
    });
  }
}
