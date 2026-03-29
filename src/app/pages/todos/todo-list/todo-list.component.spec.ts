import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { TodoListComponent } from './todo-list.component';
import { TodosApiService } from '../../../services/todos-api.service';
import { Todo } from '../../../models/api.models';

const MOCK_TODOS: Todo[] = [
  { id: 1, title: 'Buy groceries',  completed: false, description: null, createdAt: '', completedAt: null },
  { id: 2, title: 'Write tests',    completed: true,  description: null, createdAt: '', completedAt: null },
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
      providers: [{ provide: TodosApiService, useValue: api }],
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

  describe('addTodo', () => {
    it('should call createTodo with the entered title', () => {
      const newTodo: Todo = { id: 3, title: 'New Task', completed: false, description: null, createdAt: '', completedAt: null };
      api.createTodo.and.returnValue(of(newTodo));
      component.newTitle = 'New Task';
      component.addTodo();
      expect(api.createTodo).toHaveBeenCalledWith({ title: 'New Task' });
    });

    it('should append the returned todo to the list', () => {
      const newTodo: Todo = { id: 3, title: 'New Task', completed: false, description: null, createdAt: '', completedAt: null };
      api.createTodo.and.returnValue(of(newTodo));
      component.newTitle = 'New Task';
      component.addTodo();
      expect(component.todos().length).toBe(3);
      expect(component.todos()[2]).toEqual(newTodo);
    });

    it('should clear newTitle after successful add', () => {
      const newTodo: Todo = { id: 3, title: 'New Task', completed: false, description: null, createdAt: '', completedAt: null };
      api.createTodo.and.returnValue(of(newTodo));
      component.newTitle = 'New Task';
      component.addTodo();
      expect(component.newTitle).toBe('');
    });

    it('should not call createTodo when newTitle is empty', () => {
      component.newTitle = '  ';
      component.addTodo();
      expect(api.createTodo).not.toHaveBeenCalled();
    });

    it('should reset adding flag after error', () => {
      api.createTodo.and.returnValue(throwError(() => new Error('fail')));
      component.newTitle = 'Task';
      component.addTodo();
      expect(component.adding()).toBeFalse();
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
      api.updateTodo.and.returnValue(of({ ...MOCK_TODOS[0], completed: true }));
      component.toggleTodo(MOCK_TODOS[0]);
      const toggled = component.todos().find((t) => t.id === 1)!;
      expect(toggled.completed).toBeTrue();
    });

    it('should revert completed state on API error', () => {
      api.updateTodo.and.returnValue(throwError(() => new Error('fail')));
      component.toggleTodo(MOCK_TODOS[0]); // was false
      const reverted = component.todos().find((t) => t.id === 1)!;
      expect(reverted.completed).toBeFalse();
    });
  });

  describe('deleteTodo', () => {
    it('should call deleteTodo with correct id', () => {
      api.deleteTodo.and.returnValue(of(undefined as void));
      component.deleteTodo(1);
      expect(api.deleteTodo).toHaveBeenCalledWith(1);
    });

    it('should remove the todo from the list on success', () => {
      api.deleteTodo.and.returnValue(of(undefined as void));
      component.deleteTodo(1);
      expect(component.todos().find((t) => t.id === 1)).toBeUndefined();
      expect(component.todos().length).toBe(1);
    });
  });
});
