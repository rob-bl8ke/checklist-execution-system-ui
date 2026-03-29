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
    path: 'templates/new',
    loadComponent: () =>
      import('./pages/templates/template-editor/template-editor.component').then(
        (m) => m.TemplateEditorComponent,
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
      import('./pages/todos/todos.component').then((m) => m.TodosComponent),
  },
  { path: '**', redirectTo: 'today' },
];
