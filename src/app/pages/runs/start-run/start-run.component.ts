import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TemplatesApiService } from '../../../services/templates-api.service';
import { InstancesApiService } from '../../../services/instances-api.service';
import { Template } from '../../../models/api.models';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';

/** Extract unique `{{variable}}` placeholder names from a block of text. */
export function extractVariables(text: string): string[] {
  const matches = [...text.matchAll(/{{\s*([\w]+)\s*}}/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

@Component({
  selector: 'app-start-run',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <div class="max-w-xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <button type="button" class="text-gray-500 hover:text-gray-700 text-sm" (click)="goBack()">
          ← Runs
        </button>
        <h1 class="text-2xl font-semibold text-gray-900">Start Run</h1>
      </div>

      @if (flowStep() === 'select') {
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Select a template</h2>

          @if (loadingTemplates()) {
            <app-loading-spinner label="Loading templates…" />
          } @else if (templates().length === 0) {
            <p class="text-sm text-gray-400">No templates found.</p>
          } @else {
            <ul class="divide-y divide-gray-200">
              @for (tmpl of templates(); track tmpl.id) {
                <li>
                  <button
                    type="button"
                    class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    (click)="selectTemplate(tmpl)"
                  >
                    <span class="font-medium text-gray-900">{{ tmpl.name }}</span>
                    @if (tmpl.description) {
                      <span class="block text-xs text-gray-400 mt-0.5">{{ tmpl.description }}</span>
                    }
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      }

      @if (flowStep() === 'form') {
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ selectedTemplate()?.name }}</h2>
          <p class="text-sm text-gray-400 mb-5">Fill in the details below to start this run.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="run-name">Run name</label>
              <input
                id="run-name"
                type="text"
                formControlName="__name"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Deploy v2.4.1 to prod"
              />
            </div>

            @for (varName of variableNames(); track varName) {
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 mb-1"
                  [for]="'var-' + varName"
                >
                  {{ varName }}
                </label>
                <input
                  [id]="'var-' + varName"
                  type="text"
                  [formControlName]="varName"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  [placeholder]="'Enter ' + varName"
                />
              </div>
            }

            @if (error()) {
              <p class="text-red-600 text-sm">{{ error() }}</p>
            }

            <div class="flex justify-between pt-2">
              <button
                type="button"
                class="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                (click)="flowStep.set('select')"
              >
                ← Back
              </button>
              <button
                type="submit"
                class="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                [disabled]="form.invalid || submitting()"
              >
                {{ submitting() ? 'Starting…' : 'Start Run' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class StartRunComponent implements OnInit {
  private readonly templatesApi = inject(TemplatesApiService);
  private readonly instancesApi = inject(InstancesApiService);
  private readonly router = inject(Router);

  readonly templates = signal<Template[]>([]);
  readonly loadingTemplates = signal(true);
  readonly selectedTemplate = signal<Template | null>(null);
  readonly variableNames = signal<string[]>([]);
  readonly flowStep = signal<'select' | 'form'>('select');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  form: FormGroup = new FormGroup({});

  ngOnInit(): void {
    this.templatesApi.getTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loadingTemplates.set(false);
      },
      error: () => this.loadingTemplates.set(false),
    });
  }

  selectTemplate(tmpl: Template): void {
    this.selectedTemplate.set(tmpl);
    this.templatesApi.getSteps(tmpl.id).subscribe({
      next: (steps) => {
        const allInstructions = steps.map((s) => s.instructions ?? '').join('\n');
        const vars = extractVariables(allInstructions);
        this.variableNames.set(vars);
        const controls: Record<string, FormControl<string>> = {
          __name: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
          }) as FormControl<string>,
        };
        for (const v of vars) {
          controls[v] = new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
          }) as FormControl<string>;
        }
        this.form = new FormGroup(controls);
        this.flowStep.set('form');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    const rawValues = this.form.getRawValue() as Record<string, string>;
    const { __name: name, ...variables } = rawValues;

    this.instancesApi
      .createInstance({
        templateId: this.selectedTemplate()!.id,
        name,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
      })
      .subscribe({
        next: (instance) => {
          this.submitting.set(false);
          this.router.navigate(['/runs', instance.id]);
        },
        error: () => {
          this.submitting.set(false);
          this.error.set('Failed to start run. Please try again.');
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/runs']);
  }
}
