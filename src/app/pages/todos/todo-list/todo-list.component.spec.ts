import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { provideMarkdown } from 'ngx-markdown';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';

import { TodoListComponent } from './todo-list.component';
import { TodosApiService } from '../../../services/todos-api.service';
import { Todo } from '../../../models/api.models';
import { DEFAULT_FILTERS } from './todo-filter';

const MOCK_TODOS: Todo[] = [
  {
    id: 1, title: 'Buy groceries', completed: false,
    description: '## Items\n- Milk\n- Eggs', dueDate: null,
    priority: 'NORMAL', createdAt: '2026-04-01T00:00:00.000Z', completedAt: null,
  },
  {
    id: 2, title: 'Write tests', completed: true,
    description: null, dueDate: null,
    priority: 'HIGH', createdAt: '2026-04-01T00:00:00.000Z', completedAt: '2026-04-01T12:00:00.000Z',
  },
];

describe('TodoListComponent', () => {
  let fixture: ComponentFixture<TodoListComponent>;
  let component: TodoListComponent;
  let api: jasmine.SpyObj<TodosApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('TodosApiService', ['getTodos', 'createTodo', 'updateTodo', 'deleteTodo']);
    api.getTodos.and.returnValue(of(MOCK_TODOS));
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [TodoListComponent],
      providers: [
        { provide: TodosApiService, useValue: api },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        provideMarkdown(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getTodos on init', () => {
    expect(api.getTodos).toHaveBeenCalledOnceWith();
  });

  it('should populate allTodos signal after load', () => {
    expect(component.allTodos()).toEqual(MOCK_TODOS);
    expect(component.loading()).toBeFalse();
  });

  it('should set error signal when getTodos fails', () => {
    api.getTodos.and.returnValue(throwError(() => new Error('fail')));
    component.load();
    expect(component.error()).toBe('Failed to load todos.');
    expect(component.loading()).toBeFalse();
  });

  it('should render only incomplete todos by default', () => {
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li');
    // Default filter: status=incomplete; MOCK_TODOS[1] is completed so it is hidden
    expect(items.length).toBe(1);
  });

  describe('openCreate / openEdit / onCancelEditor', () => {
    it('openCreate should set showEditor true and editingTodo null', () => {
      component.openCreate();
      expect(component.showEditor()).toBeTrue();
      expect(component.editingTodo()).toBeNull();
    });

    it('openEdit should set showEditor true and editingTodo to the given todo', () => {
      component.openEdit(MOCK_TODOS[0]);
      expect(component.showEditor()).toBeTrue();
      expect(component.editingTodo()).toEqual(MOCK_TODOS[0]);
    });

    it('onCancelEditor should close the editor', () => {
      component.openCreate();
      component.onCancelEditor();
      expect(component.showEditor()).toBeFalse();
      expect(component.editingTodo()).toBeNull();
    });
  });

  describe('onSaved', () => {
    it('should close editor and reload todos', () => {
      const refreshed: Todo[] = [...MOCK_TODOS, {
        id: 3, title: 'New', completed: false, description: null,
        dueDate: null, priority: 'LOW', createdAt: '', completedAt: null,
      }];
      api.getTodos.and.returnValue(of(refreshed));
      component.openCreate();
      component.onSaved(refreshed[2]);
      expect(component.showEditor()).toBeFalse();
      expect(component.editingTodo()).toBeNull();
      expect(component.allTodos()).toEqual(refreshed);
    });
  });

  describe('expand / collapse', () => {
    it('toggleExpand should expand a collapsed todo', () => {
      expect(component.isExpanded(1)).toBeFalse();
      component.toggleExpand(1);
      expect(component.isExpanded(1)).toBeTrue();
    });

    it('toggleExpand should collapse an expanded todo', () => {
      component.toggleExpand(1);
      component.toggleExpand(1);
      expect(component.isExpanded(1)).toBeFalse();
    });

    it('expand state should be independent per todo', () => {
      component.toggleExpand(1);
      expect(component.isExpanded(1)).toBeTrue();
      expect(component.isExpanded(2)).toBeFalse();
    });
  });

  describe('toggleTodo', () => {
    it('should call updateTodo with completed: true when uncompleted todo is toggled', () => {
      api.updateTodo.and.returnValue(of({ ...MOCK_TODOS[0], completed: true }));
      component.toggleTodo(MOCK_TODOS[0]);
      expect(api.updateTodo).toHaveBeenCalledWith(1, { completed: true });
    });

    it('should call updateTodo with completed: false when completed todo is toggled', () => {
      api.updateTodo.and.returnValue(of({ ...MOCK_TODOS[1], completed: false }));
      component.toggleTodo(MOCK_TODOS[1]);
      expect(api.updateTodo).toHaveBeenCalledWith(2, { completed: false });
    });

    it('should optimistically update the completed state', () => {
      api.updateTodo.and.returnValue(NEVER); // never completes so reload is not triggered
      component.toggleTodo(MOCK_TODOS[0]);
      const toggled = component.allTodos().find((t) => t.id === 1)!;
      expect(toggled.completed).toBeTrue();
    });

    it('should reload todos on success', () => {
      api.updateTodo.and.returnValue(of({ ...MOCK_TODOS[0], completed: true }));
      component.toggleTodo(MOCK_TODOS[0]);
      expect(api.getTodos).toHaveBeenCalledTimes(2); // init + reload
    });

    it('should revert completed state on API error', () => {
      api.updateTodo.and.returnValue(throwError(() => new Error('fail')));
      component.toggleTodo(MOCK_TODOS[0]); // was false
      const reverted = component.allTodos().find((t) => t.id === 1)!;
      expect(reverted.completed).toBeFalse();
    });
  });

  describe('delete with confirmation', () => {
    it('confirmDelete should set pendingDeleteId', () => {
      component.confirmDelete(1);
      expect(component.pendingDeleteId()).toBe(1);
    });

    it('onDeleteCancelled should clear pendingDeleteId', () => {
      component.confirmDelete(1);
      component.onDeleteCancelled();
      expect(component.pendingDeleteId()).toBeNull();
    });

    it('onDeleteConfirmed should call deleteTodo with the pending id', () => {
      api.deleteTodo.and.returnValue(of(undefined as void));
      component.confirmDelete(1);
      component.onDeleteConfirmed();
      expect(api.deleteTodo).toHaveBeenCalledWith(1);
    });

    it('onDeleteConfirmed should remove the todo from the list', () => {
      api.deleteTodo.and.returnValue(of(undefined as void));
      component.confirmDelete(1);
      component.onDeleteConfirmed();
      expect(component.allTodos().find((t) => t.id === 1)).toBeUndefined();
      expect(component.allTodos().length).toBe(1);
    });

    it('onDeleteConfirmed should clear pendingDeleteId', () => {
      api.deleteTodo.and.returnValue(of(undefined as void));
      component.confirmDelete(1);
      component.onDeleteConfirmed();
      expect(component.pendingDeleteId()).toBeNull();
    });
  });

  describe('priorityClass', () => {
    it('should return red classes for CRITICAL', () => {
      expect(component.priorityClass('CRITICAL')).toContain('red');
    });

    it('should return orange classes for HIGH', () => {
      expect(component.priorityClass('HIGH')).toContain('orange');
    });

    it('should return blue classes for NORMAL', () => {
      expect(component.priorityClass('NORMAL')).toContain('blue');
    });

    it('should return gray classes for LOW', () => {
      expect(component.priorityClass('LOW')).toContain('gray');
    });
  });

  describe('isOverdue', () => {
    it('should return true for a past date', () => {
      expect(component.isOverdue('2000-01-01')).toBeTrue();
    });

    it('should return false for a future date', () => {
      expect(component.isOverdue('2099-12-31')).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  describe('filters signal', () => {
    it('should default to incomplete status', () => {
      expect(component.filters().status).toBe('incomplete');
    });

    it('should default to page 1', () => {
      expect(component.filters().page).toBe(1);
    });

    it('setFilter should patch filters and keep rest unchanged', () => {
      component.setFilter({ search: 'hello' });
      expect(component.filters().search).toBe('hello');
      expect(component.filters().status).toBe('incomplete');
    });

    it('clearFilters should reset to DEFAULT_FILTERS', () => {
      component.setFilter({ search: 'something', status: 'all' });
      component.clearFilters();
      expect(component.filters()).toEqual(DEFAULT_FILTERS);
    });

    it('togglePriority should add a priority to the filter', () => {
      component.togglePriority('CRITICAL');
      expect(component.filters().priority).toContain('CRITICAL');
    });

    it('togglePriority should remove a priority already in the filter', () => {
      component.togglePriority('CRITICAL');
      component.togglePriority('CRITICAL');
      expect(component.filters().priority).not.toContain('CRITICAL');
    });

    it('toggleOverdue should flip overdueOnly', () => {
      expect(component.filters().overdueOnly).toBeFalse();
      component.toggleOverdue();
      expect(component.filters().overdueOnly).toBeTrue();
    });

    it('toggleSortDir should switch asc to desc', () => {
      component.toggleSortDir();
      expect(component.filters().sortDir).toBe('desc');
    });

    it('onPageChange should update page in filters', () => {
      component.onPageChange(3);
      expect(component.filters().page).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // view computed
  // ---------------------------------------------------------------------------

  describe('view computed', () => {
    it('should show only incomplete todos by default', () => {
      expect(component.view().items.every((t) => !t.completed)).toBeTrue();
    });

    it('should show completed todos when status filter is completed', () => {
      component.setFilter({ status: 'completed' });
      expect(component.view().items.every((t) => t.completed)).toBeTrue();
    });

    it('should show all todos when status is all', () => {
      component.setFilter({ status: 'all' });
      expect(component.view().items.length).toBe(MOCK_TODOS.length);
    });

    it('should filter by search text', () => {
      component.setFilter({ status: 'all', search: 'groceries' });
      expect(component.view().items.length).toBe(1);
      expect(component.view().items[0].title).toContain('groceries');
    });

    it('should return totalPages of 1 for small lists', () => {
      expect(component.view().totalPages).toBe(1);
    });

    it('should compute totalPages correctly for large lists', () => {
      const manyTodos: Todo[] = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1, title: `Todo ${i + 1}`, completed: false,
        description: null, dueDate: null, priority: 'NORMAL',
        createdAt: '2026-01-01T00:00:00.000Z', completedAt: null,
      }));
      api.getTodos.and.returnValue(of(manyTodos));
      component.load();
      expect(component.view().totalPages).toBe(2); // ceil(25/20)
    });
  });

  // ---------------------------------------------------------------------------
  // URL sync
  // ---------------------------------------------------------------------------

  describe('URL sync', () => {
    it('should call router.navigate when a filter changes', () => {
      routerSpy.navigate.calls.reset();
      component.setFilter({ status: 'all' });
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({ queryParamsHandling: 'replace' }),
      );
    });

    it('should include non-default status in query params', () => {
      routerSpy.navigate.calls.reset();
      component.setFilter({ status: 'all' });
      const [, options] = routerSpy.navigate.calls.mostRecent().args as [unknown[], { queryParams: Record<string, string | null>; queryParamsHandling: string }];
      expect(options.queryParams['status']).toBe('all');
    });

    it('should omit default status from query params (clean URLs)', () => {
      component.clearFilters(); // resets to status=incomplete
      routerSpy.navigate.calls.reset();
      component.setFilter({ search: 'test' }); // keep status as default
      const [, options] = routerSpy.navigate.calls.mostRecent().args as [unknown[], { queryParams: Record<string, string | null>; queryParamsHandling: string }];
      expect(options.queryParams['status']).toBeNull();
    });

    it('should serialize priority array as comma-separated string', () => {
      routerSpy.navigate.calls.reset();
      component.setFilter({ priority: ['CRITICAL', 'HIGH'] });
      const [, options] = routerSpy.navigate.calls.mostRecent().args as [unknown[], { queryParams: Record<string, string | null>; queryParamsHandling: string }];
      expect(options.queryParams['priority']).toBe('CRITICAL,HIGH');
    });
  });
});

