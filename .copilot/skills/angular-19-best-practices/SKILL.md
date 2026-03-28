---
name: angular-19-best-practices
description: >
  Project-specific Angular 19 implementation policy for the Checklist Execution
  System UI. Use when creating pages, shared components, API services, route
  configuration, typed forms, markdown rendering, and drag-drop checklist UI.
  This skill supplements the installed external skills (`angular-component`,
  `angular-signals`, `angular-testing` from analogjs) — those cover general
  Angular 19 patterns. This skill owns project-specific rules only.
---

# Angular 19 Project Policy — Checklist Execution System UI

## When to Use This Skill

Use this skill when:
- Creating or modifying any Angular component, service, or route in this project
- Implementing the run execution, template editor, today dashboard, or todo UI
- Configuring routing, form validation, or API service calls
- Integrating `ngx-markdown`, Angular CDK drag-drop, or Angular Material

For general Angular 19 component patterns, signal state, and test setup, defer to
the installed `angular-component`, `angular-signals`, and `angular-testing` skills first.

---

## Project Structure

```
src/app/
  pages/
    today/           # Today dashboard — Phase 10
    runs/            # Run list + execution screen — Phase 8
    templates/       # Template list + editor — Phase 7
    todos/           # Todo list — Phase 9
  services/          # All HttpClient API services — Phase 6
  shared/            # Nav component, dialogs, loading, empty states — Phase 6
  app.routes.ts      # Lazy-loaded route definitions
  app.config.ts      # Application providers
```

One component per file. Barrel exports (`index.ts`) only where genuinely needed.

---

## Component Conventions

- **All components are standalone** — no `NgModule` declarations
- **`changeDetection: ChangeDetectionStrategy.OnPush`** on all components
- **Signal inputs** (`input()`) for component inputs; `output()` for events
- **Modern control flow** — use `@if`, `@for`, `@switch` (not `*ngIf`, `*ngFor`)
- Container/presentational split: pages handle data fetching; child components receive data via inputs

```typescript
@Component({
  selector: 'app-today',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './today.component.html',
})
export class TodayComponent {
  // signals for local state
  // inject services for data
}
```

---

## State Conventions

- Component-local reactive state: use `signal()`
- Derived values: use `computed()`
- Side effects (API calls, navigation): use `effect()` sparingly — prefer explicit methods
- Service state exposed as `readonly` signals
- RxJS: only use for `HttpClient` observables; convert to signals with `toSignal()` at the component boundary

---

## Forms Conventions

- Use **typed reactive forms** (`FormGroup<...>`) — NOT template-driven or experimental Signal Forms
- Dynamic variable form for run creation: build `FormGroup` from extracted variable list
- Validation errors displayed inline, below the field
- `[disabled]` binding on submit buttons while form is invalid or loading

```typescript
form = new FormGroup({
  name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
});
```

---

## Routing

| Route | Component | Notes |
|---|---|---|
| `/` | redirect to `/today` | `pathMatch: 'full'` |
| `/today` | `TodayComponent` | Default page |
| `/runs` | `RunsComponent` | Run list |
| `/runs/:id` | `RunDetailComponent` | Execution screen (Phase 8) |
| `/templates` | `TemplatesComponent` | Template list |
| `/templates/:id` | `TemplateEditorComponent` | Step editor (Phase 7) |
| `/todos` | `TodosComponent` | Todo list |
| `**` | redirect to `/today` | Wildcard fallback |

All routes are **lazy-loaded** via `loadComponent`.
Route params accessed via `inject(ActivatedRoute)`.

---

## Data-Access Conventions

- One service class per domain resource: `TemplateService`, `InstanceService`, `TodoService`, `DashboardService`
- Services use `inject(HttpClient)` — no constructor injection
- Return `Observable<T>` from service methods; components convert with `toSignal()`
- Base URL configured via environment: `environment.apiUrl` → `http://localhost:3000/api`
- Loading and error state modelled as signals in the component:

```typescript
loading = signal(false);
error = signal<string | null>(null);
```

---

## Markdown and Checklist Conventions

- Use `ngx-markdown` for rendering step instructions (Phase 7+)
- Code blocks rendered with Prism.js syntax highlighting
- Each code block in rendered markdown includes a `[Copy]` button
- Copy action uses `navigator.clipboard.writeText()`
- Markdown content is treated as read-only display — never edited by users at runtime

---

## Angular CDK Drag-Drop

- Used for template step reordering in the template editor (Phase 7)
- `cdkDropList` + `cdkDrag` on step list items
- On `cdkDropListDropped`: call the move-step API endpoint with `beforeStepId` / `afterStepId`
- Provide a visible drag handle element — don't make the whole row draggable
- Support keyboard reorder as an accessible alternative

---

## Angular Material

- Use sparingly — prefer Tailwind utility classes for layout and spacing
- Angular Material components to use: `MatDialog` for confirmations, `MatSnackBar` for toasts, `MatProgressBar` for run progress, `MatCheckbox` for todos
- Theme: azure-blue (configured in `styles.css`)
- Do not mix Material layout (flex/grid directives) with Tailwind equivalents

---

## Testing Conventions

- Test files colocated beside source: `*.spec.ts`
- TestBed with `ComponentFixture` for component tests
- Mock services with `jasmine.createSpyObj` or signal-based test doubles
- Test user-visible behavior, not implementation details
- For services: test the observable/signal outputs for given inputs
- See the shared `testing-guidelines` skill for test pyramid and phase-by-phase priorities

---

## Anti-Patterns

- Do not use `NgModule` declarations — standalone only
- Do not use `Default` change detection on new components
- Do not use `*ngIf` / `*ngFor` — use `@if` / `@for`
- Do not use experimental Signal Forms (Angular 21+ only)
- Do not put HTTP calls directly in components — use services
- Do not use inline styles — use Tailwind utilities or component CSS
- Do not use `any` types in service DTOs — define interfaces matching API shapes

---

## Definition of Done (per component/feature)

- [ ] Standalone component with `OnPush` change detection
- [ ] Signal inputs/outputs used where applicable
- [ ] Modern control flow (`@if`, `@for`) used in template
- [ ] HTTP calls delegated to a service; component uses `toSignal()`
- [ ] Loading and error states handled in the template
- [ ] Lazy-loaded route registered in `app.routes.ts`
- [ ] Component test covers at least the primary render and interaction
- [ ] No `any` types in service interfaces
