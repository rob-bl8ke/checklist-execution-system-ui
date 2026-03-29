# checklist-execution-system-ui

Angular 19 SPA frontend for the Checklist Execution System — a Runbook + Todo manager for engineers performing repeatable operational tasks.

> Part of the [Checklist Execution System](https://github.com/rob-bl8ke/checklist-execution-system-planning). See the planning repo for Docker Compose setup and architecture overview.

## Prerequisites

- Node.js 22 (use `nvm use` to switch automatically — `.nvmrc` is provided)
- npm 10+

## Tech Stack

- **Framework**: Angular 19 (standalone components, signals, OnPush)
- **Styling**: Tailwind CSS v3 + Angular Material
- **Markdown**: ngx-markdown with Prism.js syntax highlighting
- **Drag-and-drop**: Angular CDK
- **Testing**: Karma + Jasmine (ChromeHeadless)

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:4200)
npm start

# Run tests (single run)
npx ng test --watch=false --browsers=ChromeHeadless

# Run tests in watch mode
npm test

# Production build
npm run build
```

The app expects the API to be running at `http://localhost:3000`. Start the backend first — see the [API README](https://github.com/rob-bl8ke/checklist-execution-system-api#readme).

## API Proxy Configuration

In local development the Angular dev server calls the API directly at `http://localhost:3000/api` (configured in `src/environments/environment.development.ts`). No proxy is needed because CORS is enabled on the API.

To change the API URL for local dev, edit `src/environments/environment.development.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
```

## Running Tests

```bash
# Single run (CI-style)
npx ng test --watch=false --browsers=ChromeHeadless

# Watch mode (interactive)
npm test
```

137 tests across all components and services.

## Project Structure

```
src/app/
  pages/
    today/          # /today — default landing page, dashboard
    templates/      # /templates, /templates/new, /templates/:id
    runs/           # /runs, /runs/new, /runs/:id (execution screen)
    todos/          # /todos
  components/       # Shared components (loading-spinner, etc.)
  services/         # API service layer (one service per resource)
  models/           # TypeScript interfaces matching API response shapes
  app.routes.ts     # Route definitions
  app.component.ts  # Root shell with navigation
```

## Keyboard Shortcuts (Run Execution Screen)

While on the run execution screen (`/runs/:id`):

| Key | Action |
|---|---|
| `Space` | Mark the currently expanded step complete |
| `N` | Expand and scroll to the next step |
| `P` | Expand and scroll to the previous step |
| `C` | Copy the first code block in the current step to clipboard |

Shortcuts are suppressed when an `input`, `textarea`, or `select` element is focused.
