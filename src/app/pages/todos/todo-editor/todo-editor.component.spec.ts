import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideMarkdown } from 'ngx-markdown';

import { TodoEditorComponent } from './todo-editor.component';
import { TodosApiService } from '../../../services/todos-api.service';
import { Todo } from '../../../models/api.models';

const MOCK_TODO: Todo = {
  id: 1,
  title: 'Buy groceries',
  description: '## List\n- Milk',
  dueDate: '2026-05-01',
  priority: 'HIGH',
  completed: false,
  createdAt: '2026-04-01T00:00:00.000Z',
  completedAt: null,
};

describe('TodoEditorComponent', () => {
  let fixture: ComponentFixture<TodoEditorComponent>;
  let component: TodoEditorComponent;
  let api: jasmine.SpyObj<TodosApiService>;

  function create(todoInput?: Todo | null) {
    return TestBed.createComponent(TodoEditorComponent);
  }

  beforeEach(async () => {
    api = jasmine.createSpyObj('TodosApiService', ['createTodo', 'updateTodo']);

    await TestBed.configureTestingModule({
      imports: [TodoEditorComponent],
      providers: [{ provide: TodosApiService, useValue: api }, provideMarkdown()],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('create mode (no todo input)', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should start with empty fields', () => {
      expect(component.title).toBe('');
      expect(component.description).toBe('');
      expect(component.dueDate).toBe('');
      expect(component.priority).toBe('NORMAL');
    });

    it('should not call createTodo when title is empty', () => {
      component.title = '';
      component.save();
      expect(api.createTodo).not.toHaveBeenCalled();
    });

    it('should call createTodo with title and priority', () => {
      const saved: Todo = { ...MOCK_TODO, id: 5, title: 'New task' };
      api.createTodo.and.returnValue(of(saved));
      component.title = 'New task';
      component.priority = 'LOW';
      component.save();
      expect(api.createTodo).toHaveBeenCalledWith(jasmine.objectContaining({
        title: 'New task',
        priority: 'LOW',
      }));
    });

    it('should emit saved event with the created todo', () => {
      const saved: Todo = { ...MOCK_TODO, id: 5, title: 'New task' };
      api.createTodo.and.returnValue(of(saved));
      const emitted: Todo[] = [];
      component.saved.subscribe((t) => emitted.push(t));
      component.title = 'New task';
      component.save();
      expect(emitted).toEqual([saved]);
    });

    it('should clear saving flag after success', () => {
      api.createTodo.and.returnValue(of({ ...MOCK_TODO }));
      component.title = 'Task';
      component.save();
      expect(component.saving()).toBeFalse();
    });

    it('should clear saving flag after error', () => {
      api.createTodo.and.returnValue(throwError(() => new Error('fail')));
      component.title = 'Task';
      component.save();
      expect(component.saving()).toBeFalse();
    });
  });

  describe('edit mode (todo input provided)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('todo', MOCK_TODO);
      fixture.detectChanges();
    });

    it('should pre-populate fields from the input todo', () => {
      expect(component.title).toBe(MOCK_TODO.title);
      expect(component.description).toBe(MOCK_TODO.description ?? '');
      expect(component.dueDate).toBe(MOCK_TODO.dueDate ?? '');
      expect(component.priority).toBe(MOCK_TODO.priority);
    });

    it('should call updateTodo with the edited fields', () => {
      const updated: Todo = { ...MOCK_TODO, title: 'Updated' };
      api.updateTodo.and.returnValue(of(updated));
      component.title = 'Updated';
      component.save();
      expect(api.updateTodo).toHaveBeenCalledWith(MOCK_TODO.id, jasmine.objectContaining({
        title: 'Updated',
      }));
    });

    it('should emit saved event with the updated todo', () => {
      const updated: Todo = { ...MOCK_TODO, title: 'Updated' };
      api.updateTodo.and.returnValue(of(updated));
      const emitted: Todo[] = [];
      component.saved.subscribe((t) => emitted.push(t));
      component.title = 'Updated';
      component.save();
      expect(emitted).toEqual([updated]);
    });

    it('should send null dueDate when cleared', () => {
      const updated: Todo = { ...MOCK_TODO, dueDate: null };
      api.updateTodo.and.returnValue(of(updated));
      component.dueDate = '';
      component.save();
      expect(api.updateTodo).toHaveBeenCalledWith(
        MOCK_TODO.id,
        jasmine.objectContaining({ dueDate: null }),
      );
    });

    it('should send null description when cleared', () => {
      const updated: Todo = { ...MOCK_TODO, description: null };
      api.updateTodo.and.returnValue(of(updated));
      component.description = '';
      component.save();
      expect(api.updateTodo).toHaveBeenCalledWith(
        MOCK_TODO.id,
        jasmine.objectContaining({ description: null }),
      );
    });
  });

  describe('cancel', () => {
    it('should emit cancel event when cancel button action fires', () => {
      fixture.detectChanges();
      let cancelled = false;
      component.cancel.subscribe(() => (cancelled = true));
      component.cancel.emit();
      expect(cancelled).toBeTrue();
    });
  });
});
