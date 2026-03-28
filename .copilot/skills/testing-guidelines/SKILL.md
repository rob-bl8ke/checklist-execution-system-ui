---
name: testing-guidelines
description: >
  Project-specific testing strategy and conventions for the Checklist Execution
  System. Use when deciding what to test, how to structure tests, and how to set
  up test data. This skill supplements the installed external skills (`tdd` from
  mattpocock and `angular-testing` from analogjs) — those cover general TDD
  workflow and Angular TestBed patterns. This skill owns project-specific test
  scope, fixtures, coverage rules, and phase-by-phase priorities.
---

# Testing Policy — Checklist Execution System (Frontend)

## When to Use This Skill

Use this skill when:
- Deciding what Angular component or service tests to write
- Setting up mock services or test data builders
- Planning coverage for a frontend phase

For TDD workflow, defer to `tdd`. For Angular TestBed setup patterns, defer to `angular-testing`.

---

## Testing Philosophy

- **Vertical slices first** — test complete user-visible features, not isolated pieces
- **Protect interaction logic** — checkbox toggles, form submissions, step completion, drag-drop callbacks
- **Avoid framework noise** — don't test Angular's own router, HttpClient internals, or Material component rendering
- **Deterministic** — no date/time-sensitive assertions; use fixed test dates

---

## Phase-by-Phase Frontend Test Priorities

| Phase | Critical Tests |
|---|---|
| 6 — Shell | Route definitions resolve to correct components |
| 7 — Templates | Template list renders items, step editor updates on input, delete triggers confirmation |
| 8 — Runs | Variable form generates fields from template data, step completion toggle updates signal state |
| 9 — Todos | Inline add creates todo, checkbox toggles completed state, delete calls service |
| 10 — Dashboard | Today cards render with correct run/step data, complete from dashboard calls correct service method |

---

## Component Tests

Use `TestBed.configureTestingModule` with `imports: [ComponentUnderTest]`.

```typescript
beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [TodayComponent],
    providers: [
      { provide: DashboardService, useValue: mockDashboardService },
    ],
  }).compileComponents();
});
```

- Use `data-testid` attributes for querying elements — not CSS classes or DOM structure
- Test: initial render with correct data, primary interactions, empty states, loading states

### What NOT to Test

- Angular Material component internal rendering
- Angular Router's actual navigation
- `HttpClient` internals (test at service level instead)
- Tailwind CSS class application

---

## Service Tests

Mock `HttpClient` with `HttpClientTestingModule` and `HttpTestingController`:

```typescript
it('should call GET /api/templates', () => {
  service.getTemplates().subscribe();
  const req = httpMock.expectOne(`${environment.apiUrl}/templates`);
  expect(req.request.method).toBe('GET');
  req.flush([buildTemplateDto()]);
});
```

---

## Test Data Builders (Frontend DTOs)

```typescript
export function buildTemplateDto(overrides?: Partial<TemplateDto>): TemplateDto {
  return { id: 1, name: 'Test Template', stepCount: 3, ...overrides };
}

export function buildDashboardRunDto(overrides?: Partial<DashboardRunDto>): DashboardRunDto {
  return {
    id: 1,
    name: 'Deploy v1.5',
    nextStep: { id: 10, title: 'Run tests', renderedInstructions: '`npm test`' },
    ...overrides,
  };
}
```

Place in: `src/app/test/builders/`.

---

## Naming and Placement Conventions

```
src/app/
  pages/today/
    today.component.spec.ts
  services/
    template.service.spec.ts
  test/
    builders/
      template.builder.ts
      instance.builder.ts
```

`describe` = class name. `it` = observable behavior.

---

## Coverage Rules

| Area | Target |
|---|---|
| Page component render + interactions | all primary flows |
| Service URL and response mapping | all methods |
| Form validation logic | all validators |

---

## Anti-Patterns

- Snapshot tests for component HTML
- Testing Angular Material's internal rendering
- Committing `it.only` / `describe.only`
- Non-deterministic test data

---

## Definition of Done

- [ ] All tests pass with `ng test`
- [ ] `data-testid` attributes used for element queries
- [ ] Mock services provided via `TestBed` providers
- [ ] Builder functions used for DTO test data
- [ ] No `it.only` / `describe.only` in committed code
