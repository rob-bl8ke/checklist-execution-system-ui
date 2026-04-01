import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { TodosApiService } from '../../../services/todos-api.service';
import { Todo, TodoPriority } from '../../../models/api.models';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';
import { TodoEditorComponent } from '../todo-editor/todo-editor.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-todo-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LoadingSpinnerComponent,
    EmptyStateComponent,
    TodoEditorComponent,
    ConfirmDialogComponent,
    MarkdownComponent,
  ],
  template: `
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">Todos</h1>
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          (click)="openCreate()"
        >
          + New Todo
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner label="Loading todos…" />
      } @else if (error()) {
        <p class="text-red-600 text-sm">{{ error() }}</p>
      } @else if (todos().length === 0) {
        <app-empty-state message="No todos yet. Click '+ New Todo' to create one." />
      } @else {
        <ul class="bg-white rounded-xl shadow-sm divide-y divide-gray-200 overflow-hidden">
          @for (todo of todos(); track todo.id) {
            <li class="px-5 py-3">
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  class="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer shrink-0"
                  [checked]="todo.completed"
                  (change)="toggleTodo(todo)"
                  [attr.aria-label]="'Mark ' + todo.title + ' complete'"
                />

                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="text-sm"
                      [class.line-through]="todo.completed"
                      [class.text-gray-400]="todo.completed"
                      [class.text-gray-900]="!todo.completed"
                    >{{ todo.title }}</span>

                    @if (!todo.completed) {
                      <span [class]="'text-xs px-1.5 py-0.5 rounded font-medium ' + priorityClass(todo.priority)">
                        {{ todo.priority }}
                      </span>
                    }

                    @if (todo.dueDate && !todo.completed) {
                      <span [class]="'text-xs ' + (isOverdue(todo.dueDate) ? 'text-red-600 font-medium' : 'text-gray-500')">
                        @if (isOverdue(todo.dueDate)) { ⚠ Overdue · }Due {{ todo.dueDate }}
                      </span>
                    }
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  @if (todo.description) {
                    <button
                      type="button"
                      class="text-gray-400 hover:text-gray-600 text-xs transition-colors"
                      (click)="toggleExpand(todo.id)"
                      [attr.aria-label]="isExpanded(todo.id) ? 'Collapse detail' : 'Expand detail'"
                    >
                      {{ isExpanded(todo.id) ? '▲' : '▼' }}
                    </button>
                  }

                  <button
                    type="button"
                    class="text-blue-400 hover:text-blue-600 text-xs transition-colors"
                    (click)="openEdit(todo)"
                    [attr.aria-label]="'Edit ' + todo.title"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="text-red-400 hover:text-red-600 text-xs transition-colors"
                    (click)="confirmDelete(todo.id)"
                    [attr.aria-label]="'Delete ' + todo.title"
                  >
                    Delete
                  </button>
                </div>
              </div>

              @if (todo.description && isExpanded(todo.id)) {
                <div class="mt-3 pl-7 prose prose-sm max-w-none text-gray-600">
                  <markdown [data]="todo.description" />
                </div>
              }
            </li>
          }
        </ul>
      }
    </div>

    @if (showEditor()) {
      <app-todo-editor
        [todo]="editingTodo()"
        (saved)="onSaved($event)"
        (cancel)="onCancelEditor()"
      />
    }

    @if (pendingDeleteId() !== null) {
      <app-confirm-dialog
        title="Delete Todo"
        message="Are you sure you want to delete this todo? This action cannot be undone."
        (confirmed)="onDeleteConfirmed()"
        (cancelled)="onDeleteCancelled()"
      />
    }
  `,
})
export class TodoListComponent implements OnInit {
  private readonly api = inject(TodosApiService);

  readonly todos = signal<Todo[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly showEditor = signal(false);
  readonly editingTodo = signal<Todo | null>(null);
  readonly expandedIds = signal<Set<number>>(new Set());
  readonly pendingDeleteId = signal<number | null>(null);

  private readonly today = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getTodos().subscribe({
      next: (todos) => {
        this.todos.set(todos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load todos.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingTodo.set(null);
    this.showEditor.set(true);
  }

  openEdit(todo: Todo): void {
    this.editingTodo.set(todo);
    this.showEditor.set(true);
  }

  onSaved(_todo: Todo): void {
    this.showEditor.set(false);
    this.editingTodo.set(null);
    this.load();
  }

  onCancelEditor(): void {
    this.showEditor.set(false);
    this.editingTodo.set(null);
  }

  toggleExpand(id: number): void {
    this.expandedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  toggleTodo(todo: Todo): void {
    const newCompleted = !todo.completed;
    this.todos.update((list) =>
      list.map((t) => (t.id === todo.id ? { ...t, completed: newCompleted } : t)),
    );
    this.api.updateTodo(todo.id, { completed: newCompleted }).subscribe({
      next: () => this.load(),
      error: () => {
        this.todos.update((list) =>
          list.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t)),
        );
      },
    });
  }

  confirmDelete(id: number): void {
    this.pendingDeleteId.set(id);
  }

  onDeleteConfirmed(): void {
    const id = this.pendingDeleteId();
    if (id === null) return;
    this.pendingDeleteId.set(null);
    this.api.deleteTodo(id).subscribe({
      next: () => this.todos.update((list) => list.filter((t) => t.id !== id)),
    });
  }

  onDeleteCancelled(): void {
    this.pendingDeleteId.set(null);
  }

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
