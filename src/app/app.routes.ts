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
      import('./pages/runs/runs.component').then((m) => m.RunsComponent),
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('./pages/templates/templates.component').then(
        (m) => m.TemplatesComponent,
      ),
  },
  {
    path: 'todos',
    loadComponent: () =>
      import('./pages/todos/todos.component').then((m) => m.TodosComponent),
  },
  { path: '**', redirectTo: 'today' },
];
