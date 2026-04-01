import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'today', pathMatch: 'full' },
  {
    path: 'today',
    loadComponent: () =>
      import('./pages/today/today.component').then((m) => m.TodayComponent),
  },
  {
    path: 'runs',
    loadComponent: () =>
      import('./pages/runs/run-list/run-list.component').then((m) => m.RunListComponent),
  },
  {
    path: 'runs/new',
    loadComponent: () =>
      import('./pages/runs/start-run/start-run.component').then((m) => m.StartRunComponent),
  },
  {
    path: 'runs/:id',
    loadComponent: () =>
      import('./pages/runs/run-execution/run-execution.component').then(
        (m) => m.RunExecutionComponent,
      ),
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('./pages/templates/template-list/template-list.component').then(
        (m) => m.TemplateListComponent,
      ),
  },
  {
    path: 'templates/:id',
    loadComponent: () =>
      import('./pages/templates/template-editor/template-editor.component').then(
        (m) => m.TemplateEditorComponent,
      ),
  },
  {
    path: 'todos',
    loadComponent: () =>
      import('./pages/todos/todo-list/todo-list.component').then((m) => m.TodoListComponent),
  },
  {
    path: 'reminders',
    loadComponent: () =>
      import('./pages/reminders/reminders.component').then((m) => m.RemindersComponent),
  },
  {
    path: 'reminders/new',
    loadComponent: () =>
      import('./pages/reminders/reminder-editor.component').then((m) => m.ReminderEditorComponent),
  },
  {
    path: 'reminders/:id',
    loadComponent: () =>
      import('./pages/reminders/reminder-editor.component').then((m) => m.ReminderEditorComponent),
  },
  { path: '**', redirectTo: 'today' },
];
