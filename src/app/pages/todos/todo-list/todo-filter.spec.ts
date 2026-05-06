import { Todo, TodoFilters, TodoPriority } from '../../../models/api.models';
import { applyFilters, DEFAULT_FILTERS } from './todo-filter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    title: 'Test todo',
    description: null,
    dueDate: null,
    priority: 'NORMAL',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

function filters(overrides: Partial<TodoFilters> = {}): TodoFilters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

const PAGE_SIZE = 3;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyFilters', () => {
  // -------------------------------------------------------------------------
  // Status filter
  // -------------------------------------------------------------------------

  describe('status filter', () => {
    const todos = [
      makeTodo({ id: 1, completed: false }),
      makeTodo({ id: 2, completed: true }),
    ];

    it('returns only incomplete todos when status is incomplete', () => {
      const { items } = applyFilters(todos, filters({ status: 'incomplete' }), PAGE_SIZE);
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(1);
    });

    it('returns only completed todos when status is completed', () => {
      const { items } = applyFilters(todos, filters({ status: 'completed' }), PAGE_SIZE);
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(2);
    });

    it('returns all todos when status is all', () => {
      const { items } = applyFilters(todos, filters({ status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Text search
  // -------------------------------------------------------------------------

  describe('text search', () => {
    const todos = [
      makeTodo({ id: 1, title: 'Buy groceries', completed: false }),
      makeTodo({ id: 2, title: 'Write tests', completed: false }),
    ];

    it('filters by title (case-insensitive)', () => {
      const { items } = applyFilters(todos, filters({ search: 'buy', status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(1);
      expect(items[0].title).toBe('Buy groceries');
    });

    it('matches partial title', () => {
      const { items } = applyFilters(todos, filters({ search: 'ests', status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(2);
    });

    it('returns all when search is empty', () => {
      const { items } = applyFilters(todos, filters({ search: '', status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(2);
    });

    it('returns empty when no title matches', () => {
      const { items } = applyFilters(todos, filters({ search: 'xyz', status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(0);
    });

    it('trims whitespace before searching', () => {
      const { items } = applyFilters(todos, filters({ search: '  buy  ', status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Priority filter
  // -------------------------------------------------------------------------

  describe('priority filter', () => {
    const todos = [
      makeTodo({ id: 1, priority: 'LOW' as TodoPriority, completed: false }),
      makeTodo({ id: 2, priority: 'CRITICAL' as TodoPriority, completed: false }),
      makeTodo({ id: 3, priority: 'HIGH' as TodoPriority, completed: false }),
    ];

    it('returns all todos when priority array is empty', () => {
      const { items } = applyFilters(todos, filters({ priority: [], status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(3);
    });

    it('filters to a single priority', () => {
      const { items } = applyFilters(todos, filters({ priority: ['CRITICAL'], status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(1);
      expect(items[0].priority).toBe('CRITICAL');
    });

    it('filters to multiple priorities', () => {
      const { items } = applyFilters(
        todos,
        filters({ priority: ['CRITICAL', 'HIGH'], status: 'all' }),
        PAGE_SIZE,
      );
      expect(items.length).toBe(2);
      expect(items.every((t) => t.priority === 'CRITICAL' || t.priority === 'HIGH')).toBeTrue();
    });
  });

  // -------------------------------------------------------------------------
  // Due date range
  // -------------------------------------------------------------------------

  describe('due date range', () => {
    const todos = [
      makeTodo({ id: 1, dueDate: '2026-04-01', completed: false }),
      makeTodo({ id: 2, dueDate: '2026-05-01', completed: false }),
      makeTodo({ id: 3, dueDate: '2026-06-01', completed: false }),
      makeTodo({ id: 4, dueDate: null, completed: false }),
    ];

    it('filters by dueDateFrom (nulls excluded)', () => {
      const { items } = applyFilters(
        todos,
        filters({ dueDateFrom: '2026-05-01', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items.every((t) => t.dueDate !== null)).toBeTrue();
      expect(items.length).toBe(2);
    });

    it('filters by dueDateTo (nulls excluded)', () => {
      const { items } = applyFilters(
        todos,
        filters({ dueDateTo: '2026-05-01', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items.every((t) => t.dueDate !== null)).toBeTrue();
      expect(items.length).toBe(2);
    });

    it('filters by both from and to', () => {
      const { items } = applyFilters(
        todos,
        filters({ dueDateFrom: '2026-05-01', dueDateTo: '2026-05-31', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(2);
    });

    it('excludes todos with null dueDate from range filter', () => {
      const { items } = applyFilters(
        todos,
        filters({ dueDateFrom: '2026-01-01', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items.some((t) => t.dueDate === null)).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // Overdue only
  // -------------------------------------------------------------------------

  describe('overdueOnly', () => {
    const todos = [
      makeTodo({ id: 1, dueDate: '2000-01-01', completed: false }), // always past
      makeTodo({ id: 2, dueDate: '2099-12-31', completed: false }), // always future
      makeTodo({ id: 3, dueDate: null, completed: false }),
    ];

    it('returns only overdue todos', () => {
      const { items } = applyFilters(todos, filters({ overdueOnly: true, status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(1);
    });

    it('excludes todos with null dueDate from overdue filter', () => {
      const { items } = applyFilters(todos, filters({ overdueOnly: true, status: 'all' }), PAGE_SIZE);
      expect(items.every((t) => t.dueDate !== null)).toBeTrue();
    });

    it('excludes future-dated todos', () => {
      const { items } = applyFilters(todos, filters({ overdueOnly: true, status: 'all' }), PAGE_SIZE);
      expect(items.some((t) => t.id === 2)).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // Sort
  // -------------------------------------------------------------------------

  describe('sort by dueDate asc (default)', () => {
    it('puts dated todos before undated', () => {
      const todos = [
        makeTodo({ id: 1, dueDate: null }),
        makeTodo({ id: 2, dueDate: '2026-05-01' }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ sortField: 'dueDate', sortDir: 'asc', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items[0].id).toBe(2);
      expect(items[1].id).toBe(1);
    });

    it('sorts dated todos ascending', () => {
      const todos = [
        makeTodo({ id: 1, dueDate: '2026-06-01' }),
        makeTodo({ id: 2, dueDate: '2026-04-01' }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ sortField: 'dueDate', sortDir: 'asc', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items[0].id).toBe(2);
      expect(items[1].id).toBe(1);
    });
  });

  describe('sort by dueDate desc', () => {
    it('sorts dated todos descending, nulls still last', () => {
      const todos = [
        makeTodo({ id: 1, dueDate: '2026-04-01' }),
        makeTodo({ id: 2, dueDate: '2026-06-01' }),
        makeTodo({ id: 3, dueDate: null }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ sortField: 'dueDate', sortDir: 'desc', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items[0].id).toBe(2);
      expect(items[1].id).toBe(1);
      expect(items[2].id).toBe(3);
    });
  });

  describe('sort by priority', () => {
    it('puts CRITICAL before LOW when asc', () => {
      const todos = [
        makeTodo({ id: 1, priority: 'LOW' as TodoPriority }),
        makeTodo({ id: 2, priority: 'CRITICAL' as TodoPriority }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ sortField: 'priority', sortDir: 'asc', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items[0].id).toBe(2);
      expect(items[1].id).toBe(1);
    });

    it('puts LOW before CRITICAL when desc', () => {
      const todos = [
        makeTodo({ id: 1, priority: 'CRITICAL' as TodoPriority }),
        makeTodo({ id: 2, priority: 'LOW' as TodoPriority }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ sortField: 'priority', sortDir: 'desc', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items[0].id).toBe(2);
    });
  });

  describe('sort by title', () => {
    it('sorts alphabetically ascending', () => {
      const todos = [
        makeTodo({ id: 1, title: 'Zebra' }),
        makeTodo({ id: 2, title: 'Apple' }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ sortField: 'title', sortDir: 'asc', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items[0].id).toBe(2);
      expect(items[1].id).toBe(1);
    });

    it('sorts alphabetically descending', () => {
      const todos = [
        makeTodo({ id: 1, title: 'Apple' }),
        makeTodo({ id: 2, title: 'Zebra' }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ sortField: 'title', sortDir: 'desc', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items[0].id).toBe(2);
    });
  });

  describe('sort by createdAt', () => {
    it('sorts oldest first when asc', () => {
      const todos = [
        makeTodo({ id: 1, createdAt: '2026-03-01T00:00:00.000Z' }),
        makeTodo({ id: 2, createdAt: '2026-01-01T00:00:00.000Z' }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ sortField: 'createdAt', sortDir: 'asc', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items[0].id).toBe(2);
    });

    it('sorts newest first when desc', () => {
      const todos = [
        makeTodo({ id: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
        makeTodo({ id: 2, createdAt: '2026-03-01T00:00:00.000Z' }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ sortField: 'createdAt', sortDir: 'desc', status: 'all' }),
        PAGE_SIZE,
      );
      expect(items[0].id).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  describe('pagination', () => {
    const todos = Array.from({ length: 7 }, (_, i) =>
      makeTodo({ id: i + 1, title: `Todo ${i + 1}` }),
    );

    it('returns correct total', () => {
      const { total } = applyFilters(todos, filters({ status: 'all' }), PAGE_SIZE);
      expect(total).toBe(7);
    });

    it('returns correct totalPages (ceil)', () => {
      const { totalPages } = applyFilters(todos, filters({ status: 'all' }), PAGE_SIZE);
      expect(totalPages).toBe(3); // ceil(7/3)
    });

    it('returns first page items', () => {
      const { items } = applyFilters(todos, filters({ page: 1, status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(PAGE_SIZE);
    });

    it('returns partial last page items', () => {
      const { items } = applyFilters(todos, filters({ page: 3, status: 'all' }), PAGE_SIZE);
      expect(items.length).toBe(1); // 7 % 3 = 1
    });

    it('returns totalPages of 1 when list is empty', () => {
      const { totalPages, total } = applyFilters([], filters({ status: 'all' }), PAGE_SIZE);
      expect(totalPages).toBe(1);
      expect(total).toBe(0);
    });

    it('clamps to last page when page exceeds totalPages', () => {
      const { items } = applyFilters(todos, filters({ page: 99, status: 'all' }), PAGE_SIZE);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Combined filters
  // -------------------------------------------------------------------------

  describe('combined filters', () => {
    it('applies status and search together', () => {
      const todos = [
        makeTodo({ id: 1, title: 'Buy milk', completed: false }),
        makeTodo({ id: 2, title: 'Buy eggs', completed: true }),
        makeTodo({ id: 3, title: 'Write tests', completed: false }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ status: 'incomplete', search: 'buy' }),
        PAGE_SIZE,
      );
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(1);
    });

    it('applies overdueOnly and priority together', () => {
      const todos = [
        makeTodo({ id: 1, dueDate: '2000-01-01', priority: 'CRITICAL' as TodoPriority }),
        makeTodo({ id: 2, dueDate: '2000-01-01', priority: 'LOW' as TodoPriority }),
        makeTodo({ id: 3, dueDate: '2099-12-31', priority: 'CRITICAL' as TodoPriority }),
      ];
      const { items } = applyFilters(
        todos,
        filters({ overdueOnly: true, priority: ['CRITICAL'], status: 'all' }),
        PAGE_SIZE,
      );
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(1);
    });
  });
});
