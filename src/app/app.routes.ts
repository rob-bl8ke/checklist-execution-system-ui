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
