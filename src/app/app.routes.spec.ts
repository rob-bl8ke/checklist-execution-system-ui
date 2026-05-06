import { routes } from './app.routes';
import { NoteEditorComponent } from './pages/notes/note-editor/note-editor.component';

describe('app.routes notes editor routes', () => {
  it('should lazy-load /notes/new to NoteEditorComponent', async () => {
    const route = routes.find((candidate) => candidate.path === 'notes/new');

    expect(route).toBeDefined();
    expect(route?.loadComponent).toEqual(jasmine.any(Function));

    const component = await route!.loadComponent!();

    expect(component).toBe(NoteEditorComponent);
  });

  it('should lazy-load /notes/:id/edit to NoteEditorComponent', async () => {
    const route = routes.find((candidate) => candidate.path === 'notes/:id/edit');

    expect(route).toBeDefined();
    expect(route?.loadComponent).toEqual(jasmine.any(Function));

    const component = await route!.loadComponent!();

    expect(component).toBe(NoteEditorComponent);
  });
});
