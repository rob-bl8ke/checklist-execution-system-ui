import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { Note } from '../../../models/api.models';
import { NotesApiService } from '../../../services/notes-api.service';

type TagMode = 'any' | 'all';

@Component({
  selector: 'app-note-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EmptyStateComponent, LoadingSpinnerComponent],
  templateUrl: './note-list.component.html',
  styleUrl: './note-list.component.css',
})
export class NoteListComponent implements OnInit {
  private readonly api = inject(NotesApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly notes = signal<Note[]>([]);
  readonly availableTags = signal<string[]>([]);
  readonly activeTags = signal<string[]>([]);
  readonly searchTerm = signal('');
  readonly page = signal(1);
  readonly total = signal(0);
  readonly error = signal<string | null>(null);
  readonly tagMode = signal<TagMode>('any');

  private readonly pendingRequests = signal(0);

  readonly pageSize = 10;
  readonly loading = computed(() => this.pendingRequests() > 0);
  readonly hasPreviousPage = computed(() => this.page() > 1);
  readonly hasNextPage = computed(() => this.page() * this.pageSize < this.total());
  readonly showingFrom = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1,
  );
  readonly showingTo = computed(() => Math.min(this.page() * this.pageSize, this.total()));
  readonly emptyMessage = computed(() =>
    this.searchTerm() || this.activeTags().length > 0
      ? 'No notes match the current filters.'
      : 'No notes yet. Click Create Note to add your first note.',
  );

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.searchTerm.set(value.trim());
        this.page.set(1);
        this.loadNotes();
      });

    this.loadTags();
    this.loadNotes();
  }

  toggleTag(tag: string): void {
    this.activeTags.update((tags) =>
      tags.includes(tag) ? tags.filter((value) => value !== tag) : [...tags, tag],
    );
    this.page.set(1);
    this.loadNotes();
  }

  isTagActive(tag: string): boolean {
    return this.activeTags().includes(tag);
  }

  setTagMode(mode: TagMode): void {
    if (this.tagMode() === mode) {
      return;
    }

    this.tagMode.set(mode);
    this.page.set(1);
    this.loadNotes();
  }

  previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((page) => page - 1);
    this.loadNotes();
  }

  nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((page) => page + 1);
    this.loadNotes();
  }

  openNote(noteId: number): void {
    void this.router.navigate(['/notes', noteId, 'edit']);
  }

  createNote(): void {
    void this.router.navigate(['/notes', 'new']);
  }

  noteSummary(note: Note): string {
    const content = note.body?.replace(/\s+/g, ' ').trim();
    if (!content) {
      return 'No content yet.';
    }

    return content.length > 180 ? `${content.slice(0, 177)}...` : content;
  }

  private loadTags(): void {
    this.beginRequest();
    this.api
      .getTags()
      .pipe(finalize(() => this.endRequest()))
      .subscribe({
        next: (tags) => this.availableTags.set(tags),
        error: () => this.error.set('Failed to load notes.'),
      });
  }

  private loadNotes(): void {
    this.beginRequest();
    this.error.set(null);
    this.api
      .getNotes(
        this.page(),
        this.pageSize,
        this.searchTerm() || undefined,
        this.activeTags().length > 0 ? this.activeTags() : undefined,
        this.tagMode(),
      )
      .pipe(finalize(() => this.endRequest()))
      .subscribe({
        next: ({ items, total }) => {
          this.notes.set(items);
          this.total.set(total);
        },
        error: () => {
          this.notes.set([]);
          this.total.set(0);
          this.error.set('Failed to load notes.');
        },
      });
  }

  private beginRequest(): void {
    this.pendingRequests.update((count) => count + 1);
  }

  private endRequest(): void {
    this.pendingRequests.update((count) => Math.max(0, count - 1));
  }
}
