import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { InstancesApiService } from '../../../services/instances-api.service';
import { InstanceSummary } from '../../../models/api.models';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-run-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">Runs</h1>
        <button
          type="button"
          class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          (click)="startRun()"
        >
          + Start Run
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner label="Loading runs…" />
      } @else if (error()) {
        <p class="text-red-600 text-sm">{{ error() }}</p>
      } @else if (runs().length === 0) {
        <app-empty-state message="No runs yet. Start a run from a template to get going." />
      } @else {
        <ul class="divide-y divide-gray-200 bg-white rounded-xl shadow-sm overflow-hidden">
          @for (run of runs(); track run.id) {
            <li>
              <button
                type="button"
                class="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                (click)="openRun(run.id)"
              >
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-gray-900">{{ run.name }}</span>
                  <span class="text-xs text-gray-400">
                    {{ run.progress.completed }}/{{ run.progress.total }} steps
                  </span>
                </div>
                <span
                  class="text-xs font-medium px-2 py-1 rounded-full"
                  [class]="statusClass(run.status)"
                >
                  {{ run.status }}
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class RunListComponent implements OnInit {
  private readonly api = inject(InstancesApiService);
  private readonly router = inject(Router);

  readonly runs = signal<InstanceSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getInstances().subscribe({
      next: (runs) => {
        this.runs.set(runs);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load runs.');
        this.loading.set(false);
      },
    });
  }

  openRun(id: number): void {
    this.router.navigate(['/runs', id]);
  }

  startRun(): void {
    this.router.navigate(['/runs', 'new']);
  }

  statusClass(status: string): string {
    switch (status) {
      case 'COMPLETED':  return 'bg-green-100 text-green-700';
      case 'ABANDONED':  return 'bg-red-100 text-red-700';
      default:           return 'bg-blue-100 text-blue-700';
    }
  }
}
