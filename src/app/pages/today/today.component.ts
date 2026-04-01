import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { DashboardApiService } from '../../services/dashboard-api.service';
import { InstancesApiService } from '../../services/instances-api.service';
import { TodosApiService } from '../../services/todos-api.service';
import { RemindersApiService } from '../../services/reminders-api.service';
import { DashboardRun, ReminderAgendaItem, Todo, TodoPriority } from '../../models/api.models';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-today',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent],
  template: `
    <div class="max-w-3xl mx-auto">
      <h1 class="text-2xl font-semibold text-gray-900 mb-6">Today</h1>

      @if (loading()) {
        <app-loading-spinner label="Loading dashboard…" />
      } @else {
        <!-- Ready Now reminders -->
        @if (dueNow().length > 0) {
          <section class="mb-8">
            <h2 class="text-lg font-semibold text-gray-700 mb-3">Ready Now</h2>
            <div class="flex flex-col gap-3">
              @for (item of dueNow(); track item.reminderId + '_' + item.occurrenceDate) {
                <div class="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-0.5">
                      <span class="font-medium text-gray-900">{{ item.title }}</span>
                      @if (item.category) {
                        <span class="text-xs text-gray-400">{{ item.category }}</span>
                      }
                    </div>
                    <div class="flex gap-2">
                      @if (item.canStartRun && item.linkedTemplate) {
                        <button
                          type="button"
                          class="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          [disabled]="togglingOccurrenceKey() === item.reminderId + '_' + item.occurrenceDate"
                          (click)="startRun(item)"
                        >
                          Start Run
                        </button>
                      }
                      <button
                        type="button"
                        class="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        [disabled]="togglingOccurrenceKey() === item.reminderId + '_' + item.occurrenceDate"
                        (click)="markOccurrenceDone(item)"
                      >
                        {{ togglingOccurrenceKey() === item.reminderId + '_' + item.occurrenceDate ? '…' : 'Done' }}
                      </button>
                      <button
                        type="button"
                        class="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        [disabled]="togglingOccurrenceKey() === item.reminderId + '_' + item.occurrenceDate"
                        (click)="dismissOccurrence(item)"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <span class="text-xs text-gray-400">Due {{ item.occurrenceDate }}{{ item.isOverdue ? ' (overdue)' : '' }}</span>
                </div>
              }
            </div>
          </section>
        }

        <!-- Coming Up reminders -->
        @if (upcoming().length > 0) {
          <section class="mb-8">
            <h2 class="text-lg font-semibold text-gray-700 mb-3">Coming Up</h2>
            <div class="flex flex-col gap-3">
              @for (item of upcoming(); track item.reminderId + '_' + item.occurrenceDate) {
                <div class="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
                  <div class="flex flex-col gap-0.5">
                    <span class="font-medium text-gray-900">{{ item.title }}</span>
                    @if (item.category) {
                      <span class="text-xs text-gray-400">{{ item.category }}</span>
                    }
                  </div>
                  <span class="text-xs text-gray-400">{{ item.occurrenceDate }} ({{ item.daysUntilOccurrence }}d)</span>
                </div>
              }
            </div>
          </section>
        }

        <!-- Active runs -->
        <section class="mb-8">
          <h2 class="text-lg font-semibold text-gray-700 mb-3">Active Runs</h2>
          @if (runs().length === 0) {
            <p class="text-sm text-gray-400">No active runs. Start a run to get going.</p>
          } @else {
            <div class="flex flex-col gap-3">
              @for (run of runs(); track run.id) {
                <div class="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-gray-900">{{ run.name }}</span>
                    <button
                      type="button"
                      class="text-sm text-blue-600 hover:underline"
                      (click)="openRun(run.id)"
                    >
                      Open
                    </button>
                  </div>

                  @if (run.nextStep) {
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex flex-col gap-0.5">
                        <span class="text-xs text-gray-400">
                          Step {{ run.progress.completed + 1 }} of {{ run.progress.total }}
                        </span>
                        <span class="text-sm text-gray-700">{{ run.nextStep.title }}</span>
                      </div>
                      <button
                        type="button"
                        class="flex-shrink-0 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        [disabled]="completingStepId() === run.nextStep.id"
                        (click)="completeStep(run)"
                      >
                        {{ completingStepId() === run.nextStep.id ? 'Completing…' : 'Complete' }}
                      </button>
                    </div>
                    @if (stepError()[run.id]) {
                      <p class="text-red-600 text-xs">{{ stepError()[run.id] }}</p>
                    }
                  } @else {
                    <span class="text-xs text-green-600 font-medium">All steps complete ✓</span>
                  }
                </div>
              }
            </div>
          }
        </section>

        <!-- Incomplete todos -->
        <section>
          <h2 class="text-lg font-semibold text-gray-700 mb-3">Todos</h2>
          @if (todos().length === 0) {
            <p class="text-sm text-gray-400">No incomplete todos.</p>
          } @else {
            <ul class="bg-white rounded-xl shadow-sm divide-y divide-gray-200 overflow-hidden">
              @for (todo of todos(); track todo.id) {
                <li class="flex items-start gap-3 px-5 py-3">
                  <input
                    type="checkbox"
                    class="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer disabled:opacity-50 shrink-0"
                    [checked]="false"
                    [disabled]="togglingTodoId() === todo.id"
                    (change)="toggleTodo(todo)"
                    [attr.aria-label]="'Mark ' + todo.title + ' complete'"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-sm text-gray-800">{{ todo.title }}</span>
                      <span [class]="'text-xs px-1.5 py-0.5 rounded font-medium ' + priorityClass(todo.priority)">
                        {{ todo.priority }}
                      </span>
                      @if (todo.dueDate) {
                        <span [class]="'text-xs ' + (isOverdue(todo.dueDate) ? 'text-red-600 font-medium' : 'text-gray-500')">
                          @if (isOverdue(todo.dueDate)) { ⚠ Overdue · }Due {{ todo.dueDate }}
                        </span>
                      }
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      }
    </div>
  `,
})
export class TodayComponent implements OnInit {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly instancesApi = inject(InstancesApiService);
  private readonly todosApi = inject(TodosApiService);
  private readonly remindersApi = inject(RemindersApiService);
  private readonly router = inject(Router);

  readonly runs = signal<DashboardRun[]>([]);
  readonly todos = signal<Todo[]>([]);
  readonly dueNow = signal<ReminderAgendaItem[]>([]);
  readonly upcoming = signal<ReminderAgendaItem[]>([]);
  readonly loading = signal(true);
  readonly completingStepId = signal<number | null>(null);
  readonly stepError = signal<Record<number, string>>({});
  readonly togglingTodoId = signal<number | null>(null);
  readonly togglingOccurrenceKey = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.dashboardApi.getDashboard().subscribe({
      next: (data) => {
        this.runs.set(data.runs);
        this.todos.set(data.todos.filter((t) => !t.completed));
        this.dueNow.set(data.reminders.dueNow);
        this.upcoming.set(data.reminders.upcoming);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  completeStep(run: DashboardRun): void {
    if (!run.nextStep) return;
    const stepId = run.nextStep.id;
    this.completingStepId.set(stepId);
    this.stepError.update((errs) => ({ ...errs, [run.id]: '' }));

    this.instancesApi.completeStep(run.id, stepId, { completed: true }).subscribe({
      next: () => {
        this.completingStepId.set(null);
        this.loadDashboard();
      },
      error: () => {
        this.completingStepId.set(null);
        this.stepError.update((errs) => ({ ...errs, [run.id]: 'Failed to complete step.' }));
      },
    });
  }

  toggleTodo(todo: Todo): void {
    this.togglingTodoId.set(todo.id);
    this.todosApi.updateTodo(todo.id, { completed: true }).subscribe({
      next: () => {
        this.todos.update((ts) => ts.filter((t) => t.id !== todo.id));
        this.togglingTodoId.set(null);
      },
      error: () => {
        this.togglingTodoId.set(null);
      },
    });
  }

  markOccurrenceDone(item: ReminderAgendaItem): void {
    const key = `${item.reminderId}_${item.occurrenceDate}`;
    this.togglingOccurrenceKey.set(key);
    this.remindersApi
      .updateOccurrence(item.reminderId, item.occurrenceDate, { status: 'COMPLETED' })
      .subscribe({
        next: () => {
          this.dueNow.update((items) =>
            items.filter(
              (i) => !(i.reminderId === item.reminderId && i.occurrenceDate === item.occurrenceDate),
            ),
          );
          this.togglingOccurrenceKey.set(null);
        },
        error: () => this.togglingOccurrenceKey.set(null),
      });
  }

  dismissOccurrence(item: ReminderAgendaItem): void {
    const key = `${item.reminderId}_${item.occurrenceDate}`;
    this.togglingOccurrenceKey.set(key);
    this.remindersApi
      .updateOccurrence(item.reminderId, item.occurrenceDate, { status: 'DISMISSED' })
      .subscribe({
        next: () => {
          this.dueNow.update((items) =>
            items.filter(
              (i) => !(i.reminderId === item.reminderId && i.occurrenceDate === item.occurrenceDate),
            ),
          );
          this.togglingOccurrenceKey.set(null);
        },
        error: () => this.togglingOccurrenceKey.set(null),
      });
  }

  startRun(item: ReminderAgendaItem): void {
    this.router.navigate(['/runs/new'], {
      queryParams: { templateId: item.linkedTemplate!.id },
    });
  }

  openRun(id: number): void {
    this.router.navigate(['/runs', id]);
  }

  private readonly today = new Date().toISOString().slice(0, 10);

  priorityClass(priority: TodoPriority): string {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-700';
      case 'HIGH':     return 'bg-orange-100 text-orange-700';
      case 'NORMAL':   return 'bg-blue-100 text-blue-700';
      case 'LOW':      return 'bg-gray-100 text-gray-500';
    }
  }

  isOverdue(dueDate: string): boolean {
    return dueDate < this.today;
  }
}

