import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="flex flex-col gap-1 p-4 h-full bg-gray-900 text-white w-52">
      <span class="text-xl font-semibold mb-6 px-2">Checklist</span>

      <a
        routerLink="/today"
        routerLinkActive="bg-blue-600"
        class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <span>📋</span> Today
      </a>

      <a
        routerLink="/runs"
        routerLinkActive="bg-blue-600"
        class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <span>▶</span> Runs
      </a>

      <a
        routerLink="/templates"
        routerLinkActive="bg-blue-600"
        class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <span>📄</span> Templates
      </a>

      <a
        routerLink="/todos"
        routerLinkActive="bg-blue-600"
        class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <span>☐</span> Todos
      </a>

      <a
        routerLink="/reminders"
        routerLinkActive="bg-blue-600"
        class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <span>🔔</span> Reminders
      </a>
    </nav>
  `,
})
export class NavComponent {}
