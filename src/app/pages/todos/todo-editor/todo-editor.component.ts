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
import { TodosApiService } from '../../../services/todos-api.service';
import { Todo, TodoPriority } from '../../../models/api.models';

@Component({
  selector: 'app-todo-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MarkdownComponent],
  template: `
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ todo() ? 'Edit Todo' : 'Create Todo' }}
          </h2>
          <button type="button" class="text-gray-400 hover:text-gray-600" (click)="cancel.emit()">✕</button>
        </div>

        <div class="flex flex-col gap-4 overflow-y-auto p-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="todo-title">Title</label>
            <input
              id="todo-title"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              [(ngModel)]="title"
              placeholder="Todo title…"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="todo-due-date">Due Date</label>
              <input
                id="todo-due-date"
                type="date"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                [(ngModel)]="dueDate"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="todo-priority">Priority</label>
              <select
                id="todo-priority"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                [(ngModel)]="priority"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col">
              <label class="block text-sm font-medium text-gray-700 mb-1">Detail (Markdown)</label>
              <textarea
                class="flex-1 min-h-48 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                [(ngModel)]="description"
                placeholder="Optional markdown detail…"
              ></textarea>
            </div>

            <div class="flex flex-col">
              <span class="block text-sm font-medium text-gray-700 mb-1">Preview</span>
              <div class="flex-1 min-h-48 border border-gray-200 rounded-lg p-3 overflow-y-auto prose prose-sm max-w-none bg-gray-50">
                <markdown [data]="description || '_No content yet_'" />
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
export class TodoEditorComponent implements OnChanges {
  private readonly api = inject(TodosApiService);

  /** Pass an existing Todo to enter edit mode; omit or pass null for create mode. */
  todo = input<Todo | null>(null);

  saved = output<Todo>();
  cancel = output<void>();

  title = '';
  description = '';
  dueDate = '';
  priority: TodoPriority = 'NORMAL';
  readonly saving = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['todo']) {
      const t = this.todo();
      this.title = t?.title ?? '';
      this.description = t?.description ?? '';
      this.dueDate = t?.dueDate ?? '';
      this.priority = t?.priority ?? 'NORMAL';
    }
  }

  save(): void {
    if (!this.title.trim()) return;
    this.saving.set(true);
    const existing = this.todo();

    if (existing) {
      const dto = {
        title: this.title.trim(),
        description: this.description || null,
        dueDate: this.dueDate || null,
        priority: this.priority,
      };
      this.api.updateTodo(existing.id, dto).subscribe({
        next: (todo) => { this.saving.set(false); this.saved.emit(todo); },
        error: () => this.saving.set(false),
      });
    } else {
      const dto = {
        title: this.title.trim(),
        ...(this.description && { description: this.description }),
        ...(this.dueDate && { dueDate: this.dueDate }),
        priority: this.priority,
      };
      this.api.createTodo(dto).subscribe({
        next: (todo) => { this.saving.set(false); this.saved.emit(todo); },
        error: () => this.saving.set(false),
      });
    }
  }
}
