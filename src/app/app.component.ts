import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './components/nav/nav.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavComponent],
  template: `
    <div class="flex h-screen overflow-hidden">
      <app-nav />
      <main class="flex-1 overflow-y-auto p-6 bg-gray-50">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {}
