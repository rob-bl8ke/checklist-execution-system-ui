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
import { DashboardRun } from '../../models/api.models';
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
                <li class="px-5 py-3 text-sm text-gray-800">{{ todo.title }}</li>
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
  private readonly router = inject(Router);

  readonly runs = signal<DashboardRun[]>([]);
  readonly todos = signal<{ id: number; title: string }[]>([]);
  readonly loading = signal(true);
  readonly completingStepId = signal<number | null>(null);
  readonly stepError = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.dashboardApi.getDashboard().subscribe({
      next: (data) => {
        this.runs.set(data.runs);
        this.todos.set(data.todos.filter((t) => !t.completed));
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

  openRun(id: number): void {
    this.router.navigate(['/runs', id]);
  }
}
