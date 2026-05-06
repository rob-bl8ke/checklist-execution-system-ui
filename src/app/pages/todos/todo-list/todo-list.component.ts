import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MarkdownComponent } from 'ngx-markdown';
import { TodosApiService } from '../../../services/todos-api.service';
import { Todo, TodoFilters, TodoPriority } from '../../../models/api.models';
import { applyFilters, DEFAULT_FILTERS } from './todo-filter';
import { PaginatorComponent } from '../../../components/paginator/paginator.component';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';
import { TodoEditorComponent } from '../todo-editor/todo-editor.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';

const PAGE_SIZE = 5;

const PRIORITY_OPTIONS: TodoPriority[] = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

const SORT_FIELD_OPTIONS: { value: TodoFilters['sortField']; label: string }[] = [
  { value: 'dueDate', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'createdAt', label: 'Created' },
  { value: 'title', label: 'Title' },
];

@Component({
  selector: 'app-todo-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LoadingSpinnerComponent,
    EmptyStateComponent,
    TodoEditorComponent,
    ConfirmDialogComponent,
    MarkdownComponent,
    PaginatorComponent,
  ],
  template: `
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold text-gray-900">Todos</h1>
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          (click)="openCreate()"
        >
          + New Todo
        </button>
      </div>

      <!-- Filter bar -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div class="grid grid-cols-3 gap-3">

          <!-- Row 1: Search | Status | Overdue -->
          <div>
            <label class="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              placeholder="Search todos…"
              [value]="filters().search"
              (input)="onSearchInput($event)"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Status</label>
            <select
              class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              [value]="filters().status"
              (change)="onStatusChange($event)"
            >
              <option value="incomplete">Incomplete</option>
              <option value="completed">Completed</option>
              <option value="all">All</option>
            </select>
          </div>
          <div class="flex items-end pb-2">
            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 accent-blue-600"
                [checked]="filters().overdueOnly"
                (change)="toggleOverdue()"
              />
              Overdue only
            </label>
          </div>

          <!-- Row 2: Priority checkboxes | Due from | Due to -->
          <div>
            <p class="text-xs text-gray-500 mb-1">Priority</p>
            <div class="flex flex-wrap gap-3">
              @for (p of PRIORITY_OPTIONS; track p) {
                <label class="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    class="w-4 h-4 rounded border-gray-300 accent-blue-600"
                    [checked]="filters().priority.includes(p)"
                    (change)="togglePriority(p)"
                  />
                  {{ p }}
                </label>
              }
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Due from</label>
            <input
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              [value]="filters().dueDateFrom ?? ''"
              (change)="onDueDateFromChange($event)"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Due to</label>
            <input
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              [value]="filters().dueDateTo ?? ''"
              (change)="onDueDateToChange($event)"
            />
          </div>

          <!-- Row 3: Sort | Clear -->
          <div>
            <label class="block text-xs text-gray-500 mb-1">Sort by</label>
            <div class="flex gap-1">
              <select
                class="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                [value]="filters().sortField"
                (change)="onSortFieldChange($event)"
              >
                @for (opt of SORT_FIELD_OPTIONS; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
              <button
                type="button"
                class="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                (click)="toggleSortDir()"
                [attr.aria-label]="filters().sortDir === 'asc' ? 'Switch to descending' : 'Switch to ascending'"
              >
                {{ filters().sortDir === 'asc' ? '↑' : '↓' }}
              </button>
            </div>
          </div>
          <div class="col-span-2 flex items-end">
            <button
              type="button"
              class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              (click)="clearFilters()"
            >
              Clear filters
            </button>
          </div>

        </div>
      </div>

      <!-- Result count -->
      @if (showingRange()) {
        <p class="text-sm text-gray-500 mb-3">Showing {{ showingRange() }}</p>
      }

      @if (loading()) {
        <app-loading-spinner label="Loading todos…" />
      } @else if (error()) {
        <p class="text-red-600 text-sm">{{ error() }}</p>
      } @else if (view().items.length === 0) {
        @if (allTodos().length === 0) {
          <app-empty-state message="No todos yet. Click '+ New Todo' to create one." />
        } @else {
          <app-empty-state message="No todos match the current filters." />
        }
      } @else {
        <ul class="bg-white rounded-xl shadow-sm divide-y divide-gray-200 overflow-hidden">
          @for (todo of view().items; track todo.id) {
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

        <app-paginator
          [page]="filters().page"
          [totalPages]="view().totalPages"
          (pageChange)="onPageChange($event)"
        />
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Exposed for template use
  readonly PRIORITY_OPTIONS = PRIORITY_OPTIONS;
  readonly SORT_FIELD_OPTIONS = SORT_FIELD_OPTIONS;

  // State
  readonly allTodos = signal<Todo[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filters = signal<TodoFilters>({ ...DEFAULT_FILTERS });

  // Derived
  readonly view = computed(() => applyFilters(this.allTodos(), this.filters(), PAGE_SIZE));
  readonly showingRange = computed(() => {
    const { total, totalPages } = this.view();
    if (total === 0) return null;
    const page = Math.min(this.filters().page, totalPages);
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${start}–${end} of ${total}`;
  });

  // Editor / dialog state
  readonly showEditor = signal(false);
  readonly editingTodo = signal<Todo | null>(null);
  readonly expandedIds = signal<Set<number>>(new Set());
  readonly pendingDeleteId = signal<number | null>(null);

  private readonly today = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.filters.set(this.paramsToFilters(this.route.snapshot.queryParamMap));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getTodos().subscribe({
      next: (todos) => {
        this.allTodos.set(todos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load todos.');
        this.loading.set(false);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Filter mutations
  // ---------------------------------------------------------------------------

  setFilter(patch: Partial<TodoFilters>): void {
    this.filters.update((f) => ({ ...f, ...patch }));
    this.syncUrl();
  }

  clearFilters(): void {
    this.filters.set({ ...DEFAULT_FILTERS });
    this.syncUrl();
  }

  onSearchInput(event: Event): void {
    this.setFilter({ search: (event.target as HTMLInputElement).value, page: 1 });
  }

  onStatusChange(event: Event): void {
    this.setFilter({
      status: (event.target as HTMLSelectElement).value as TodoFilters['status'],
      page: 1,
    });
  }

  togglePriority(p: TodoPriority): void {
    const current = this.filters().priority;
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    this.setFilter({ priority: next, page: 1 });
  }

  onDueDateFromChange(event: Event): void {
    this.setFilter({ dueDateFrom: (event.target as HTMLInputElement).value || null, page: 1 });
  }

  onDueDateToChange(event: Event): void {
    this.setFilter({ dueDateTo: (event.target as HTMLInputElement).value || null, page: 1 });
  }

  toggleOverdue(): void {
    this.setFilter({ overdueOnly: !this.filters().overdueOnly, page: 1 });
  }

  onSortFieldChange(event: Event): void {
    this.setFilter({
      sortField: (event.target as HTMLSelectElement).value as TodoFilters['sortField'],
      page: 1,
    });
  }

  toggleSortDir(): void {
    this.setFilter({ sortDir: this.filters().sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
  }

  onPageChange(page: number): void {
    this.setFilter({ page });
  }

  // ---------------------------------------------------------------------------
  // Editor
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Expand / collapse
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Toggle completion
  // ---------------------------------------------------------------------------

  toggleTodo(todo: Todo): void {
    const newCompleted = !todo.completed;
    this.allTodos.update((list) =>
      list.map((t) => (t.id === todo.id ? { ...t, completed: newCompleted } : t)),
    );
    this.api.updateTodo(todo.id, { completed: newCompleted }).subscribe({
      next: () => this.load(),
      error: () => {
        this.allTodos.update((list) =>
          list.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t)),
        );
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  confirmDelete(id: number): void {
    this.pendingDeleteId.set(id);
  }

  onDeleteConfirmed(): void {
    const id = this.pendingDeleteId();
    if (id === null) return;
    this.pendingDeleteId.set(null);
    this.api.deleteTodo(id).subscribe({
      next: () => this.allTodos.update((list) => list.filter((t) => t.id !== id)),
    });
  }

  onDeleteCancelled(): void {
    this.pendingDeleteId.set(null);
  }

  // ---------------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // URL sync
  // ---------------------------------------------------------------------------

  private syncUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.filtersToQueryParams(this.filters()),
      queryParamsHandling: 'replace',
    });
  }

  private filtersToQueryParams(f: TodoFilters): Record<string, string | null> {
    return {
      search: f.search || null,
      status: f.status !== 'incomplete' ? f.status : null,
      priority: f.priority.length > 0 ? f.priority.join(',') : null,
      dueDateFrom: f.dueDateFrom,
      dueDateTo: f.dueDateTo,
      overdueOnly: f.overdueOnly ? 'true' : null,
      sortField: f.sortField !== 'dueDate' ? f.sortField : null,
      sortDir: f.sortDir !== 'asc' ? f.sortDir : null,
      page: f.page > 1 ? String(f.page) : null,
    };
  }

  private paramsToFilters(params: ParamMap): TodoFilters {
    const priorityStr = params.get('priority');
    const pageStr = params.get('page');
    return {
      search: params.get('search') ?? '',
      status: (params.get('status') as TodoFilters['status']) ?? 'incomplete',
      priority: priorityStr ? (priorityStr.split(',') as TodoPriority[]) : [],
      dueDateFrom: params.get('dueDateFrom') || null,
      dueDateTo: params.get('dueDateTo') || null,
      overdueOnly: params.get('overdueOnly') === 'true',
      sortField: (params.get('sortField') as TodoFilters['sortField']) ?? 'dueDate',
      sortDir: (params.get('sortDir') as 'asc' | 'desc') ?? 'asc',
      page: pageStr ? (parseInt(pageStr, 10) || 1) : 1,
    };
  }
}
