import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MarkdownComponent } from 'ngx-markdown';
import { InstancesApiService } from '../../../services/instances-api.service';
import { Instance, InstanceStep } from '../../../models/api.models';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-run-execution',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent, MarkdownComponent],
  styles: [`
    :host ::ng-deep pre {
      position: relative;
    }
    :host ::ng-deep .copy-btn {
      position: absolute;
      top: 0.4rem;
      right: 0.4rem;
      padding: 0.2rem 0.6rem;
      font-size: 0.7rem;
      background: rgba(255,255,255,0.15);
      color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 4px;
      cursor: pointer;
      z-index: 10;
    }
    :host ::ng-deep .copy-btn:hover {
      background: rgba(255,255,255,0.25);
    }
  `],
  template: `
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center gap-3 mb-4">
        <button type="button" class="text-gray-500 hover:text-gray-700 text-sm" (click)="goBack()">
          ← Runs
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner label="Loading run…" />
      } @else if (instance()) {
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-2xl font-semibold text-gray-900">{{ instance()!.name }}</h1>
          <span
            class="text-xs font-medium px-2 py-1 rounded-full"
            [class]="statusClass(instance()!.status)"
          >
            {{ instance()!.status }}
          </span>
        </div>

        <!-- Progress bar -->
        <div class="mb-6">
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{{ completedCount() }}/{{ totalCount() }}</span>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all duration-300"
              [style.width.%]="progressPercent()"
            ></div>
          </div>
        </div>

        <!-- Step list -->
        @if (stepError()) {
          <p class="text-red-600 text-sm mb-3">{{ stepError() }}</p>
        }

        <div class="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-200">
          @for (step of instance()!.steps; track step.id) {
            <div [attr.data-step-id]="step.id" [class.opacity-60]="step.completed && expandedStepId() !== step.id">
              <!-- Step header row -->
              <div class="flex items-center gap-3 px-5 py-3">
                <!-- Completion toggle -->
                <button
                  type="button"
                  class="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                  [class.border-blue-500]="!step.completed"
                  [class.bg-green-500]="step.completed"
                  [class.border-green-500]="step.completed"
                  [disabled]="completingStepId() === step.id"
                  (click)="toggleComplete(step)"
                  [attr.aria-label]="step.completed ? 'Mark incomplete' : 'Mark complete'"
                >
                  @if (step.completed) {
                    <span class="text-white text-xs font-bold">✓</span>
                  }
                </button>

                <!-- Title -->
                <button
                  type="button"
                  class="flex-1 text-left text-sm font-medium"
                  [class.line-through]="step.completed"
                  [class.text-gray-400]="step.completed"
                  [class.text-gray-900]="!step.completed"
                  (click)="toggleExpand(step.id)"
                >
                  {{ step.title }}
                </button>

                <!-- Expand indicator -->
                <span class="text-gray-400 text-xs select-none">
                  {{ expandedStepId() === step.id ? '▲' : '▼' }}
                </span>
              </div>

              <!-- Expanded instructions -->
              @if (expandedStepId() === step.id && step.renderedInstructions) {
                <div class="px-5 pb-4 pt-1" #mdContainer>
                  <div class="prose prose-sm max-w-none text-gray-700">
                    <markdown
                      [data]="step.renderedInstructions"
                      (load)="injectCopyButtons(mdContainer)"
                    />
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class RunExecutionComponent implements OnInit {
  private readonly api = inject(InstancesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly instance = signal<Instance | null>(null);
  readonly loading = signal(true);
  readonly expandedStepId = signal<number | null>(null);
  readonly completingStepId = signal<number | null>(null);
  readonly stepError = signal<string | null>(null);

  readonly completedCount = computed(
    () => this.instance()?.steps.filter((s) => s.completed).length ?? 0,
  );
  readonly totalCount = computed(() => this.instance()?.steps.length ?? 0);
  readonly progressPercent = computed(() =>
    this.totalCount() > 0
      ? Math.round((this.completedCount() / this.totalCount()) * 100)
      : 0,
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getInstance(id).subscribe({
      next: (inst) => {
        this.instance.set(inst);
        const defaultExpand =
          inst.nextStepId ?? inst.steps.find((s) => !s.completed)?.id ?? inst.steps[0]?.id ?? null;
        this.expandedStepId.set(defaultExpand);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleExpand(stepId: number): void {
    this.expandedStepId.set(this.expandedStepId() === stepId ? null : stepId);
  }

  toggleComplete(step: InstanceStep): void {
    const inst = this.instance();
    if (!inst) return;

    const newCompleted = !step.completed;
    this.completingStepId.set(step.id);
    this.stepError.set(null);

    // Optimistic update
    this.instance.update((i) =>
      i
        ? { ...i, steps: i.steps.map((s) => (s.id === step.id ? { ...s, completed: newCompleted } : s)) }
        : null,
    );

    this.api.completeStep(inst.id, step.id, { completed: newCompleted }).subscribe({
      next: (updated) => {
        this.completingStepId.set(null);
        this.instance.update((i) => {
          if (!i) return i;
          const steps = i.steps.map((s) => (s.id === updated.id ? updated : s));
          const nextStep = steps.find((s) => !s.completed);
          const allDone = steps.every((s) => s.completed);
          return {
            ...i,
            steps,
            nextStepId: nextStep?.id ?? null,
            status: allDone ? 'COMPLETED' : i.status,
          };
        });
        // Auto-advance expansion to next incomplete step on completion
        if (newCompleted) {
          const next = this.instance()?.steps.find((s) => !s.completed);
          if (next) this.expandedStepId.set(next.id);
        }
      },
      error: () => {
        // Revert optimistic update
        this.completingStepId.set(null);
        this.instance.update((i) =>
          i
            ? { ...i, steps: i.steps.map((s) => (s.id === step.id ? { ...s, completed: step.completed } : s)) }
            : null,
        );
        this.stepError.set('Failed to update step. Please try again.');
      },
    });
  }

  /** Inject a Copy button into every fenced code block rendered by ngx-markdown. */
  injectCopyButtons(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('pre code').forEach((codeEl) => {
      const pre = codeEl.parentElement!;
      if (pre.querySelector('.copy-btn')) return; // already injected

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = codeEl.innerText;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = 'Copied';
          setTimeout(() => {
            btn.textContent = 'Copy';
          }, 2000);
        });
      });
      pre.appendChild(btn);
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'ABANDONED': return 'bg-red-100 text-red-700';
      default:          return 'bg-blue-100 text-blue-700';
    }
  }

  goBack(): void {
    this.router.navigate(['/runs']);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase() ?? '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const inst = this.instance();
    if (!inst) return;

    const steps = inst.steps;
    const currentId = this.expandedStepId();
    const currentIndex = steps.findIndex((s) => s.id === currentId);
    const key = event.key.toLowerCase();

    switch (key) {
      case ' ':
        event.preventDefault();
        if (currentIndex !== -1) this.toggleComplete(steps[currentIndex]);
        break;
      case 'n': {
        event.preventDefault();
        const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
        if (nextIndex < steps.length) {
          this.expandedStepId.set(steps[nextIndex].id);
          this.scrollToStep(steps[nextIndex].id);
        }
        break;
      }
      case 'p':
        event.preventDefault();
        if (currentIndex > 0) {
          this.expandedStepId.set(steps[currentIndex - 1].id);
          this.scrollToStep(steps[currentIndex - 1].id);
        }
        break;
      case 'c':
        event.preventDefault();
        this.copyCurrentStepCode();
        break;
    }
  }

  scrollToStep(stepId: number): void {
    const el = this.elementRef.nativeElement.querySelector(`[data-step-id="${stepId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  copyCurrentStepCode(): void {
    const currentId = this.expandedStepId();
    if (currentId === null) return;
    const container = this.elementRef.nativeElement.querySelector(`[data-step-id="${currentId}"]`) as HTMLElement | null;
    const codeEl = container?.querySelector('pre code') as HTMLElement | null;
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.innerText);
    }
  }
}
