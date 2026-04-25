import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MarkdownComponent } from 'ngx-markdown';
import { map, startWith } from 'rxjs';
import { AiAssistantPanelComponent } from '../../../components/ai-assistant-panel/ai-assistant-panel.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { AiProviderKey, Note } from '../../../models/api.models';
import { extractVariables } from '../../runs/start-run/start-run.component';
import { NotesApiService } from '../../../services/notes-api.service';

const AI_PROVIDER_OPTIONS: ReadonlyArray<{ value: AiProviderKey; label: string }> = [
  { value: 'anthropic-api', label: 'Anthropic API' },
  { value: 'openai-api', label: 'OpenAI API' },
  { value: 'google-api', label: 'Google API' },
  { value: 'claude-code-cli', label: 'Claude Code CLI' },
  { value: 'copilot-cli', label: 'Copilot CLI' },
];

function delimiterPairValidator(control: AbstractControl): ValidationErrors | null {
  const group = control as FormGroup;
  const prefix = `${group.get('variablePrefix')?.value ?? ''}`.trim();
  const suffix = `${group.get('variableSuffix')?.value ?? ''}`.trim();
  return (!!prefix && !suffix) || (!prefix && !!suffix)
    ? { delimiterPair: true }
    : null;
}

type NoteEditorFormValue = {
  title: string;
  body: string;
  variablePrefix: string;
  variableSuffix: string;
  aiEnabled: boolean;
  aiProviderKey: AiProviderKey | '';
  aiModel: string;
  aiPrompt: string;
};

type NoteEditorSnapshot = NoteEditorFormValue & {
  tags: string[];
};

@Component({
  selector: 'app-note-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MarkdownComponent,
    LoadingSpinnerComponent,
    ConfirmDialogComponent,
    AiAssistantPanelComponent,
  ],
  templateUrl: './note-editor.component.html',
  styleUrl: './note-editor.component.css',
})
export class NoteEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(NotesApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup(
    {
      title: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      body: new FormControl('', { nonNullable: true }),
      variablePrefix: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(10)],
      }),
      variableSuffix: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(10)],
      }),
      aiEnabled: new FormControl(false, { nonNullable: true }),
      aiProviderKey: new FormControl<AiProviderKey | ''>('', { nonNullable: true }),
      aiModel: new FormControl('', { nonNullable: true }),
      aiPrompt: new FormControl('', { nonNullable: true }),
    },
    { validators: [delimiterPairValidator] },
  );
  readonly tagInput = new FormControl('', { nonNullable: true });
  readonly availableTags = signal<string[]>([]);
  readonly selectedTags = signal<string[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly savingVersion = signal(false);
  readonly deleting = signal(false);
  readonly submitted = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly versionMessage = signal<string | null>(null);
  readonly deleteError = signal<string | null>(null);
  readonly deleteDialogOpen = signal(false);
  readonly generating = signal(false);
  readonly generateError = signal<string | null>(null);
  readonly generatedMarkdown = signal<string | null>(null);

  readonly aiProviderOptions = AI_PROVIDER_OPTIONS;
  readonly noteId = signal<number | null>(null);
  readonly isCreateMode = computed(() => this.noteId() === null);
  readonly showDelimiters = signal(false);
  readonly variableForm = new UntypedFormGroup({});
  readonly formRawValue = signal<NoteEditorFormValue>(this.form.getRawValue());
  readonly initialSnapshot = signal<NoteEditorSnapshot>(
    this.createSnapshot(this.form.getRawValue(), this.selectedTags()),
  );
  readonly isDirty = computed(() =>
    !this.areSnapshotsEqual(
      this.initialSnapshot(),
      this.createSnapshot(this.formRawValue(), this.selectedTags()),
    ),
  );

  readonly tagInputValue = toSignal(
    this.tagInput.valueChanges.pipe(startWith(this.tagInput.value)),
    { initialValue: this.tagInput.value },
  );
  readonly filteredTagSuggestions = computed(() => {
    const query = this.tagInputValue().trim().toLowerCase();
    const selected = new Set(this.selectedTags().map((tag) => tag.toLowerCase()));
    return this.availableTags().filter((tag) => {
      const normalized = tag.toLowerCase();
      return !selected.has(normalized) && (query.length === 0 || normalized.includes(query));
    });
  });
  readonly markdownPreview = toSignal(
    this.form.controls.body.valueChanges.pipe(
      startWith(this.form.controls.body.value),
      map((value) => value || '_No content yet_'),
    ),
    { initialValue: this.form.controls.body.value || '_No content yet_' },
  );
  readonly variableNames = computed(() => {
    const formValue = this.formRawValue();
    const prefix = formValue.variablePrefix.trim() || '{{';
    const suffix = formValue.variableSuffix.trim() || '}}';
    return extractVariables(formValue.body, prefix, suffix);
  });
  readonly showAiAssistantPanel = computed(
    () => !this.isCreateMode() && this.noteId() !== null && this.formRawValue().aiEnabled,
  );
  readonly hasGeneratePanel = computed(() => !this.isCreateMode() && this.variableNames().length > 0);

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    if (rawId) {
      this.noteId.set(Number(rawId));
      this.loadNote(Number(rawId));
    }

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formRawValue.set(this.form.getRawValue());
        this.reconcileVariableForm();
      });

    this.form.controls.aiEnabled.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => {
        if (enabled) {
          this.form.controls.aiProviderKey.enable({ emitEvent: false });
          this.form.controls.aiModel.enable({ emitEvent: false });
          this.form.controls.aiPrompt.enable({ emitEvent: false });
        } else {
          this.form.controls.aiProviderKey.disable({ emitEvent: false });
          this.form.controls.aiModel.disable({ emitEvent: false });
          this.form.controls.aiPrompt.disable({ emitEvent: false });
          this.form.patchValue(
            {
              aiProviderKey: '',
              aiModel: '',
              aiPrompt: '',
            },
            { emitEvent: false },
          );
        }
        this.formRawValue.set(this.form.getRawValue());
      });

    if (!this.form.controls.aiEnabled.value) {
      this.form.controls.aiProviderKey.disable({ emitEvent: false });
      this.form.controls.aiModel.disable({ emitEvent: false });
      this.form.controls.aiPrompt.disable({ emitEvent: false });
      this.formRawValue.set(this.form.getRawValue());
    }

    this.loadTags();
    this.reconcileVariableForm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.isDirty() || this.saving() || this.deleting()) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

  addTagFromInput(): void {
    const tag = this.normalizeTag(this.tagInput.value);
    if (!tag) {
      return;
    }

    if (this.selectedTags().some((value) => value.toLowerCase() === tag.toLowerCase())) {
      this.tagInput.setValue('');
      return;
    }

    this.selectedTags.update((tags) => [...tags, tag]);
    this.tagInput.setValue('');
  }

  addTag(tag: string): void {
    this.tagInput.setValue(tag);
    this.addTagFromInput();
  }

  removeTag(tag: string): void {
    this.selectedTags.update((tags) => tags.filter((value) => value !== tag));
  }

  toggleDelimiters(): void {
    this.showDelimiters.update((value) => !value);
  }

  generatePreview(): void {
    const existingId = this.noteId();
    if (existingId === null) {
      return;
    }

    this.generating.set(true);
    this.generateError.set(null);
    this.api.generateNote(existingId, this.getVariableValues()).subscribe({
      next: ({ rendered }) => {
        this.generating.set(false);
        this.generatedMarkdown.set(rendered);
      },
      error: () => {
        this.generating.set(false);
        this.generateError.set('Failed to generate rendered note preview.');
      },
    });
  }

  handleAssistantBodyChange(event: { body: string; source: 'apply' | 'revert'; proposalId: number }): void {
    this.form.controls.body.setValue(event.body);
    this.initialSnapshot.update((snapshot) => ({
      ...snapshot,
      body: event.body,
    }));
  }

  save(): void {
    this.submitted.set(true);
    this.versionMessage.set(null);
    this.saveError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.buildDto();
    this.saving.set(true);

    const existingId = this.noteId();
    const request$ = existingId === null
      ? this.api.createNote(dto)
      : this.api.updateNote(existingId, dto);

    request$.subscribe({
      next: (note) => {
        this.saving.set(false);
        this.saveError.set(null);
        this.applyNoteToForm(note);
        if (existingId === null) {
          this.noteId.set(note.id);
          void this.router.navigate(['/notes', note.id, 'edit'], { replaceUrl: true });
        }
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Failed to save note.');
      },
    });
  }

  saveVersion(): void {
    const existingId = this.noteId();
    if (existingId === null) {
      return;
    }

    this.savingVersion.set(true);
    this.versionMessage.set(null);
    this.api.createVersion(existingId).subscribe({
      next: () => {
        this.savingVersion.set(false);
        this.versionMessage.set('Version saved successfully.');
      },
      error: () => {
        this.savingVersion.set(false);
        this.versionMessage.set('Failed to save version.');
      },
    });
  }

  confirmDelete(): void {
    this.deleteDialogOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogOpen.set(false);
  }

  deleteNote(): void {
    const existingId = this.noteId();
    if (existingId === null) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);
    this.api.deleteNote(existingId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteDialogOpen.set(false);
        void this.router.navigate(['/notes']);
      },
      error: () => {
        this.deleting.set(false);
        this.deleteDialogOpen.set(false);
        this.deleteError.set('Failed to delete note.');
      },
    });
  }

  goBack(): void {
    if (this.isDirty() && !window.confirm('Discard unsaved note changes?')) {
      return;
    }

    void this.router.navigate(['/notes']);
  }

  showControlError(controlName: 'title' | 'variablePrefix' | 'variableSuffix'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  showDelimiterError(): boolean {
    return !!this.form.errors?.['delimiterPair'] && (this.form.touched || this.submitted());
  }

  private loadNote(id: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.getNote(id).subscribe({
      next: (note) => {
        this.loading.set(false);
        this.applyNoteToForm(note);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Failed to load note.');
      },
    });
  }

  private loadTags(): void {
    this.api.getTags().subscribe({
      next: (tags) => this.availableTags.set(tags),
    });
  }

  private applyNoteToForm(note: Note): void {
    this.form.patchValue(
      {
        title: note.title,
        body: note.body ?? '',
        variablePrefix: note.variablePrefix ?? '',
        variableSuffix: note.variableSuffix ?? '',
        aiEnabled: note.aiEnabled,
        aiProviderKey: note.aiProviderKey ?? '',
        aiModel: note.aiModel ?? '',
        aiPrompt: note.aiPrompt ?? '',
      },
      { emitEvent: false },
    );
    this.formRawValue.set(this.form.getRawValue());
    if (note.aiEnabled) {
      this.form.controls.aiProviderKey.enable({ emitEvent: false });
      this.form.controls.aiModel.enable({ emitEvent: false });
      this.form.controls.aiPrompt.enable({ emitEvent: false });
    } else {
      this.form.controls.aiProviderKey.disable({ emitEvent: false });
      this.form.controls.aiModel.disable({ emitEvent: false });
      this.form.controls.aiPrompt.disable({ emitEvent: false });
    }
    this.selectedTags.set(note.tags?.map((tag) => tag.tag) ?? []);
    this.showDelimiters.set(!!(note.variablePrefix || note.variableSuffix));
    this.reconcileVariableForm();
    this.generatedMarkdown.set(null);
    this.generateError.set(null);
    this.resetDirtySnapshot();
  }

  private buildDto() {
    const prefix = this.form.controls.variablePrefix.value.trim();
    const suffix = this.form.controls.variableSuffix.value.trim();
    const aiEnabled = this.form.controls.aiEnabled.value;

    return {
      title: this.form.controls.title.value.trim(),
      body: this.form.controls.body.value,
      tags: this.selectedTags(),
      variablePrefix: prefix || null,
      variableSuffix: suffix || null,
      aiEnabled,
      aiProviderKey: aiEnabled ? this.form.controls.aiProviderKey.value || null : null,
      aiModel: aiEnabled ? this.form.controls.aiModel.value.trim() || null : null,
      aiPrompt: aiEnabled ? this.form.controls.aiPrompt.value.trim() || null : null,
    };
  }

  private resetDirtySnapshot(): void {
    this.formRawValue.set(this.form.getRawValue());
    this.initialSnapshot.set(this.createSnapshot(this.formRawValue(), this.selectedTags()));
  }

  private reconcileVariableForm(): void {
    const names = this.variableNames();
    const currentControls = this.variableForm.controls;

    for (const controlName of Object.keys(currentControls)) {
      if (!names.includes(controlName)) {
        this.variableForm.removeControl(controlName);
      }
    }

    for (const name of names) {
      if (!this.variableForm.contains(name)) {
        this.variableForm.addControl(name, new FormControl('', { nonNullable: true }));
      }
    }
  }

  private getVariableValues(): Record<string, string> {
    return this.variableNames().reduce<Record<string, string>>((result, name) => {
      result[name] = this.variableForm.controls[name]?.value ?? '';
      return result;
    }, {});
  }

  private createSnapshot(
    formValue: NoteEditorFormValue,
    tags: string[],
  ): NoteEditorSnapshot {
    return {
      ...formValue,
      tags: [...tags],
    };
  }

  private areSnapshotsEqual(left: NoteEditorSnapshot, right: NoteEditorSnapshot): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private normalizeTag(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
