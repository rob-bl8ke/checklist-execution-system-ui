import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { provideMarkdown } from 'ngx-markdown';

import { TodoListComponent } from './todo-list.component';
import { TodosApiService } from '../../../services/todos-api.service';
import { Todo } from '../../../models/api.models';

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

  beforeEach(async () => {
    api = jasmine.createSpyObj('TodosApiService', ['getTodos', 'createTodo', 'updateTodo', 'deleteTodo']);
    api.getTodos.and.returnValue(of(MOCK_TODOS));

    await TestBed.configureTestingModule({
      imports: [TodoListComponent],
      providers: [{ provide: TodosApiService, useValue: api }, provideMarkdown()],
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

  it('should populate todos signal after load', () => {
    expect(component.todos()).toEqual(MOCK_TODOS);
    expect(component.loading()).toBeFalse();
  });

  it('should set error signal when getTodos fails', () => {
    api.getTodos.and.returnValue(throwError(() => new Error('fail')));
    component.load();
    expect(component.error()).toBe('Failed to load todos.');
    expect(component.loading()).toBeFalse();
  });

  it('should render one li per todo', () => {
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(MOCK_TODOS.length);
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
      expect(component.todos()).toEqual(refreshed);
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
      const toggled = component.todos().find((t) => t.id === 1)!;
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
      const reverted = component.todos().find((t) => t.id === 1)!;
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
      expect(component.todos().find((t) => t.id === 1)).toBeUndefined();
      expect(component.todos().length).toBe(1);
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
});
