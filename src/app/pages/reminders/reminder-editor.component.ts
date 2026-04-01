import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RemindersApiService } from '../../services/reminders-api.service';
import { TemplatesApiService } from '../../services/templates-api.service';
import {
  ReminderDefinition,
  Template,
  CreateReminderDto,
  UpdateReminderDto,
  ReminderCadence,
} from '../../models/api.models';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';

interface Preset {
  label: string;
  values: Partial<CreateReminderDto>;
}

const PRESETS: Preset[] = [
  {
    label: 'Daily Standup Prep',
    values: {
      title: 'Daily Standup Prep',
      cadence: 'DAILY',
      interval: 1,
      anchorDate: new Date().toISOString().slice(0, 10),
      timeOfDay: '09:00',
      leadTimeDays: 0,
    },
  },
  {
    label: 'Weekly Review',
    values: {
      title: 'Weekly Review',
      cadence: 'WEEKLY',
      interval: 1,
      anchorDate: new Date().toISOString().slice(0, 10),
      weekdays: [5],
      timeOfDay: '14:00',
      leadTimeDays: 1,
    },
  },
  {
    label: 'Sprint Retro',
    values: {
      title: 'Sprint Retro',
      cadence: 'WEEKLY',
      interval: 2,
      anchorDate: new Date().toISOString().slice(0, 10),
      weekdays: [5],
      leadTimeDays: 2,
    },
  },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-reminder-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LoadingSpinnerComponent],
  template: `
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <button
          type="button"
          class="text-gray-500 hover:text-gray-700 text-sm"
          (click)="goBack()"
        >
          ← Reminders
        </button>
        <h1 class="text-2xl font-semibold text-gray-900">
          {{ isNew() ? 'New Reminder' : 'Edit Reminder' }}
        </h1>
      </div>

      @if (loading()) {
        <app-loading-spinner label="Loading…" />
      } @else {
        <!-- Presets (only for new reminders) -->
        @if (isNew()) {
          <div class="mb-6">
            <p class="text-sm font-medium text-gray-700 mb-2">Quick Presets</p>
            <div class="flex flex-wrap gap-2">
              @for (preset of presets; track preset.label) {
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  (click)="applyPreset(preset)"
                >
                  {{ preset.label }}
                </button>
              }
            </div>
          </div>
        }

        <form class="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-5" (ngSubmit)="save()">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="r-title">Title *</label>
            <input
              id="r-title"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              [(ngModel)]="title"
              name="title"
              placeholder="Reminder title…"
              maxlength="200"
              required
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="r-desc">Description</label>
            <textarea
              id="r-desc"
              rows="3"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              [(ngModel)]="description"
              name="description"
              placeholder="Optional description…"
            ></textarea>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="r-cat">Category</label>
            <input
              id="r-cat"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              [(ngModel)]="category"
              name="category"
              placeholder="e.g. Work, Health…"
              maxlength="50"
            />
          </div>

          <!-- Cadence -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="r-cadence">Cadence *</label>
            <select
              id="r-cadence"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              [(ngModel)]="cadence"
              name="cadence"
            >
              <option value="ONCE">Once</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </div>

          <!-- Interval (not for ONCE) -->
          @if (cadence !== 'ONCE') {
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="r-interval">
                Every {{ cadence === 'DAILY' ? 'N days' : 'N weeks' }}
              </label>
              <input
                id="r-interval"
                type="number"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                [(ngModel)]="interval"
                name="interval"
                min="1"
                max="52"
              />
            </div>
          }

          <!-- Anchor Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="r-anchor">
              {{ cadence === 'ONCE' ? 'Occurrence Date *' : 'Anchor Date *' }}
            </label>
            <input
              id="r-anchor"
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              [(ngModel)]="anchorDate"
              name="anchorDate"
              required
            />
          </div>

          <!-- Weekdays (WEEKLY only) -->
          @if (cadence === 'WEEKLY') {
            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">Days of week</p>
              <div class="flex flex-wrap gap-2">
                @for (day of weekdayOptions; track day.value) {
                  <button
                    type="button"
                    class="px-3 py-1 text-xs rounded-lg border transition-colors"
                    [class.bg-blue-600]="weekdays.includes(day.value)"
                    [class.text-white]="weekdays.includes(day.value)"
                    [class.border-blue-600]="weekdays.includes(day.value)"
                    [class.bg-white]="!weekdays.includes(day.value)"
                    [class.text-gray-700]="!weekdays.includes(day.value)"
                    [class.border-gray-300]="!weekdays.includes(day.value)"
                    (click)="toggleWeekday(day.value)"
                  >
                    {{ day.label }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Time of Day -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="r-time">Time of Day</label>
            <input
              id="r-time"
              type="time"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              [(ngModel)]="timeOfDay"
              name="timeOfDay"
            />
          </div>

          <!-- Lead Time Days -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="r-lead">
              Lead Time (days)
            </label>
            <input
              id="r-lead"
              type="number"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              [(ngModel)]="leadTimeDays"
              name="leadTimeDays"
              min="0"
              max="365"
            />
            <p class="text-xs text-gray-400 mt-1">
              Show this reminder this many days before the occurrence date.
            </p>
          </div>

          <!-- Linked Template -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="r-template">
              Linked Template
            </label>
            <select
              id="r-template"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              [(ngModel)]="linkedTemplateId"
              name="linkedTemplateId"
            >
              <option [ngValue]="null">— None —</option>
              @for (t of templates(); track t.id) {
                <option [ngValue]="t.id">{{ t.name }}</option>
              }
            </select>
          </div>

          <!-- Active toggle (edit mode only) -->
          @if (!isNew()) {
            <div class="flex items-center gap-3">
              <input
                id="r-active"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                [(ngModel)]="active"
                name="active"
              />
              <label class="text-sm font-medium text-gray-700 cursor-pointer" for="r-active">
                Active
              </label>
            </div>
          }

          @if (saveError()) {
            <p class="text-red-600 text-sm">{{ saveError() }}</p>
          }

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              class="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              (click)="goBack()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              [disabled]="saving() || !title.trim() || !anchorDate"
            >
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class ReminderEditorComponent implements OnInit {
  private readonly api = inject(RemindersApiService);
  private readonly templatesApi = inject(TemplatesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly isNew = signal(true);
  readonly templates = signal<Template[]>([]);

  readonly presets = PRESETS;
  readonly weekdayOptions = WEEKDAY_LABELS.map((label, value) => ({ label, value }));

  // form fields
  title = '';
  description = '';
  category = '';
  cadence: ReminderCadence = 'DAILY';
  interval = 1;
  anchorDate = new Date().toISOString().slice(0, 10);
  weekdays: number[] = [];
  timeOfDay = '';
  leadTimeDays = 0;
  linkedTemplateId: number | null = null;
  active = true;

  private reminderId: number | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isNew.set(id === 'new' || id === null);

    this.templatesApi.getTemplates().subscribe({
      next: (ts) => this.templates.set(ts),
      error: () => {},
    });

    if (!this.isNew()) {
      this.reminderId = Number(id);
      this.api.getReminder(this.reminderId).subscribe({
        next: (r) => {
          this.populateForm(r);
          this.loading.set(false);
        },
        error: () => {
          this.router.navigate(['/reminders']);
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  private populateForm(r: ReminderDefinition): void {
    this.title = r.title;
    this.description = r.description ?? '';
    this.category = r.category ?? '';
    this.cadence = r.cadence;
    this.interval = r.interval;
    this.anchorDate = r.anchorDate;
    this.weekdays = r.weekdays ?? [];
    this.timeOfDay = r.timeOfDay ?? '';
    this.leadTimeDays = r.leadTimeDays;
    this.linkedTemplateId = r.linkedTemplateId;
    this.active = r.active;
  }

  applyPreset(preset: Preset): void {
    const v = preset.values;
    if (v.title) this.title = v.title;
    if (v.cadence) this.cadence = v.cadence;
    if (v.interval != null) this.interval = v.interval;
    if (v.anchorDate) this.anchorDate = v.anchorDate;
    if (v.weekdays) this.weekdays = [...v.weekdays];
    if (v.timeOfDay) this.timeOfDay = v.timeOfDay;
    if (v.leadTimeDays != null) this.leadTimeDays = v.leadTimeDays;
  }

  toggleWeekday(day: number): void {
    if (this.weekdays.includes(day)) {
      this.weekdays = this.weekdays.filter((d) => d !== day);
    } else {
      this.weekdays = [...this.weekdays, day].sort();
    }
  }

  save(): void {
    if (!this.title.trim() || !this.anchorDate) return;
    this.saving.set(true);
    this.saveError.set(null);

    const dto: CreateReminderDto | UpdateReminderDto = {
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      category: this.category.trim() || undefined,
      cadence: this.cadence,
      interval: this.cadence !== 'ONCE' ? this.interval : undefined,
      anchorDate: this.anchorDate,
      weekdays: this.cadence === 'WEEKLY' && this.weekdays.length > 0 ? this.weekdays : undefined,
      timeOfDay: this.timeOfDay || undefined,
      leadTimeDays: this.leadTimeDays,
      linkedTemplateId: this.linkedTemplateId ?? undefined,
    };

    const obs$ = this.isNew()
      ? this.api.createReminder(dto as CreateReminderDto)
      : this.api.updateReminder(this.reminderId!, { ...dto, active: this.active } as UpdateReminderDto);

    obs$.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/reminders']);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message ?? 'Failed to save reminder.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/reminders']);
  }
}
