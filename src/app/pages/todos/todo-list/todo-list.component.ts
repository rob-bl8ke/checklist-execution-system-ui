import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TodosApiService } from '../../../services/todos-api.service';
import { Todo } from '../../../models/api.models';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-todo-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-semibold text-gray-900 mb-6">Todos</h1>

      <!-- Inline add -->
      <form class="flex gap-2 mb-6" (ngSubmit)="addTodo()">
        <input
          type="text"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          [(ngModel)]="newTitle"
          name="newTitle"
          placeholder="Add a new todo…"
          [disabled]="adding()"
        />
        <button
          type="submit"
          class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          [disabled]="!newTitle.trim() || adding()"
        >
          {{ adding() ? 'Adding…' : 'Add' }}
        </button>
      </form>

      @if (loading()) {
        <app-loading-spinner label="Loading todos…" />
      } @else if (error()) {
        <p class="text-red-600 text-sm">{{ error() }}</p>
      } @else if (todos().length === 0) {
        <app-empty-state message="No todos yet. Add one above to get started." />
      } @else {
        <ul class="bg-white rounded-xl shadow-sm divide-y divide-gray-200 overflow-hidden">
          @for (todo of todos(); track todo.id) {
            <li class="flex items-center gap-3 px-5 py-3">
              <input
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                [checked]="todo.completed"
                (change)="toggleTodo(todo)"
                [attr.aria-label]="'Mark ' + todo.title + ' complete'"
              />
              <span
                class="flex-1 text-sm"
                [class.line-through]="todo.completed"
                [class.text-gray-400]="todo.completed"
                [class.text-gray-900]="!todo.completed"
              >
                {{ todo.title }}
              </span>
              <button
                type="button"
                class="text-red-400 hover:text-red-600 text-xs transition-colors"
                (click)="deleteTodo(todo.id)"
                [attr.aria-label]="'Delete ' + todo.title"
              >
                Delete
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class TodoListComponent implements OnInit {
  private readonly api = inject(TodosApiService);

  readonly todos = signal<Todo[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly adding = signal(false);

  newTitle = '';

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

  addTodo(): void {
    const title = this.newTitle.trim();
    if (!title) return;
    this.adding.set(true);
    this.api.createTodo({ title }).subscribe({
      next: (todo) => {
        this.todos.update((list) => [...list, todo]);
        this.newTitle = '';
        this.adding.set(false);
      },
      error: () => this.adding.set(false),
    });
  }

  toggleTodo(todo: Todo): void {
    const newCompleted = !todo.completed;
    // Optimistic update
    this.todos.update((list) =>
      list.map((t) => (t.id === todo.id ? { ...t, completed: newCompleted } : t)),
    );
    this.api.updateTodo(todo.id, { completed: newCompleted }).subscribe({
      next: (updated) => {
        this.todos.update((list) =>
          list.map((t) => (t.id === updated.id ? updated : t)),
        );
      },
      error: () => {
        // Revert on failure
        this.todos.update((list) =>
          list.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t)),
        );
      },
    });
  }

  deleteTodo(id: number): void {
    this.api.deleteTodo(id).subscribe({
      next: () => {
        this.todos.update((list) => list.filter((t) => t.id !== id));
      },
    });
  }
}
