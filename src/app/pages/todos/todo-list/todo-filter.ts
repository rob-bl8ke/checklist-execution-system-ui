import { Todo, TodoFilters, TodoPriority } from '../../../models/api.models';

const PRIORITY_RANK: Record<TodoPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

export const DEFAULT_FILTERS: TodoFilters = {
  search: '',
  status: 'incomplete',
  priority: [],
  dueDateFrom: null,
  dueDateTo: null,
  overdueOnly: false,
  sortField: 'dueDate',
  sortDir: 'asc',
  page: 1,
};

function sortItems(
  items: Todo[],
  sortField: TodoFilters['sortField'],
  sortDir: 'asc' | 'desc',
): Todo[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    switch (sortField) {
      case 'dueDate': {
        // Nulls always last regardless of direction
        if (a.dueDate === null && b.dueDate === null) {
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        }
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        const dateCmp = a.dueDate.localeCompare(b.dueDate) * dir;
        if (dateCmp !== 0) return dateCmp;
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      }
      case 'priority': {
        const pCmp = (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * dir;
        if (pCmp !== 0) return pCmp;
        // Tiebreak: dated before undated, then ascending date
        if (a.dueDate === null && b.dueDate !== null) return 1;
        if (a.dueDate !== null && b.dueDate === null) return -1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return 0;
      }
      case 'createdAt': {
        const aT = new Date(a.createdAt).getTime();
        const bT = new Date(b.createdAt).getTime();
        return (aT - bT) * dir;
      }
      case 'title': {
        return a.title.localeCompare(b.title) * dir;
      }
    }
  });
}

export function applyFilters(
  todos: Todo[],
  filters: TodoFilters,
  pageSize: number,
): { items: Todo[]; total: number; totalPages: number } {
  const today = new Date().toISOString().slice(0, 10);
  let result = todos.slice();

  // 1. Status
  if (filters.status === 'incomplete') {
    result = result.filter((t) => !t.completed);
  } else if (filters.status === 'completed') {
    result = result.filter((t) => t.completed);
  }

  // 2. Text search (case-insensitive)
  const q = filters.search.trim().toLowerCase();
  if (q) {
    result = result.filter((t) => t.title.toLowerCase().includes(q));
  }

  // 3. Priority (empty array = all)
  if (filters.priority.length > 0) {
    result = result.filter((t) => filters.priority.includes(t.priority));
  }

  // 4. Due date range (nulls are excluded from range comparisons)
  if (filters.dueDateFrom) {
    result = result.filter((t) => t.dueDate !== null && t.dueDate >= filters.dueDateFrom!);
  }
  if (filters.dueDateTo) {
    result = result.filter((t) => t.dueDate !== null && t.dueDate <= filters.dueDateTo!);
  }

  // 5. Overdue only
  if (filters.overdueOnly) {
    result = result.filter((t) => t.dueDate !== null && t.dueDate < today);
  }

  // 6. Sort
  result = sortItems(result, filters.sortField, filters.sortDir);

  // 7. Totals
  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 8. Paginate — clamp page to valid range so a stale page shows the last page
  const page = Math.max(1, Math.min(filters.page, totalPages));
  const start = (page - 1) * pageSize;
  const items = result.slice(start, start + pageSize);

  return { items, total, totalPages };
}
