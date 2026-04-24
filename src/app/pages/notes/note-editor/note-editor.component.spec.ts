import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideMarkdown } from 'ngx-markdown';

import { NoteEditorComponent } from './note-editor.component';
import { NotesApiService } from '../../../services/notes-api.service';
import { Note } from '../../../models/api.models';

const MOCK_NOTE: Note = {
  id: 3,
  title: 'Release checklist',
  body: '## Ship it',
  variablePrefix: '{{',
  variableSuffix: '}}',
  aiEnabled: true,
  aiProviderKey: 'openai-api',
  aiModel: 'gpt-4.1',
  aiPrompt: 'Focus on release readiness.',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-02T00:00:00.000Z',
  tags: [
    { id: 1, noteId: 3, tag: 'ops' },
    { id: 2, noteId: 3, tag: 'release' },
  ],
};

function makeRoute(id: string | null) {
  return {
    snapshot: { paramMap: convertToParamMap(id ? { id } : {}) },
  };
}

describe('NoteEditorComponent - create mode', () => {
  let fixture: ComponentFixture<NoteEditorComponent>;
  let component: NoteEditorComponent;
  let api: jasmine.SpyObj<NotesApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('NotesApiService', [
      'getNote',
      'getTags',
      'createNote',
      'updateNote',
      'createVersion',
      'deleteNote',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    api.getTags.and.returnValue(of(['ops', 'release', 'research']));

    await TestBed.configureTestingModule({
      imports: [NoteEditorComponent],
      providers: [
        { provide: NotesApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: makeRoute(null) },
        provideMarkdown(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NoteEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in create mode', () => {
    expect(component.isCreateMode()).toBeTrue();
    expect(component.noteId()).toBeNull();
  });

  it('should load tag suggestions', () => {
    expect(api.getTags).toHaveBeenCalled();
    expect(component.availableTags()).toEqual(['ops', 'release', 'research']);
  });

  it('should not save when title is empty', () => {
    component.form.controls.title.setValue('');
    component.save();
    expect(api.createNote).not.toHaveBeenCalled();
  });

  it('should show validation error when only one delimiter is provided', () => {
    component.form.controls.title.setValue('Note title');
    component.form.controls.variablePrefix.setValue('{{');
    component.form.controls.variableSuffix.setValue('');
    component.save();
    expect(component.showDelimiterError()).toBeTrue();
    expect(api.createNote).not.toHaveBeenCalled();
  });

  it('should add and remove tags', () => {
    component.tagInput.setValue('release');
    component.addTagFromInput();
    expect(component.selectedTags()).toEqual(['release']);
    component.removeTag('release');
    expect(component.selectedTags()).toEqual([]);
  });

  it('should filter autocomplete suggestions based on tag input and selected tags', () => {
    component.selectedTags.set(['ops']);
    component.tagInput.setValue('re');
    expect(component.filteredTagSuggestions()).toEqual(['release', 'research']);
  });

  it('should update the markdown preview when the body changes', () => {
    component.form.controls.body.setValue('## Preview');
    expect(component.markdownPreview()).toBe('## Preview');
  });

  it('should create a note and navigate to edit mode', () => {
    api.createNote.and.returnValue(of(MOCK_NOTE));
    component.form.patchValue({
      title: 'Release checklist',
      body: '## Ship it',
      aiEnabled: true,
      aiProviderKey: 'openai-api',
      aiModel: 'gpt-4.1',
      aiPrompt: 'Focus on release readiness.',
    });
    component.selectedTags.set(['ops']);

    component.save();

    expect(api.createNote).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'Release checklist',
      tags: ['ops'],
      aiProviderKey: 'openai-api',
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/notes', MOCK_NOTE.id, 'edit'], { replaceUrl: true });
  });
});

describe('NoteEditorComponent - edit mode', () => {
  let fixture: ComponentFixture<NoteEditorComponent>;
  let component: NoteEditorComponent;
  let api: jasmine.SpyObj<NotesApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('NotesApiService', [
      'getNote',
      'getTags',
      'createNote',
      'updateNote',
      'createVersion',
      'deleteNote',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    api.getTags.and.returnValue(of(['ops', 'release', 'research']));
    api.getNote.and.returnValue(of(MOCK_NOTE));

    await TestBed.configureTestingModule({
      imports: [NoteEditorComponent],
      providers: [
        { provide: NotesApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: makeRoute('3') },
        provideMarkdown(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NoteEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load the note into the form', () => {
    expect(api.getNote).toHaveBeenCalledWith(3);
    expect(component.form.controls.title.value).toBe(MOCK_NOTE.title);
    expect(component.selectedTags()).toEqual(['ops', 'release']);
    expect(component.showDelimiters()).toBeTrue();
  });

  it('should call updateNote when saving an existing note', () => {
    api.updateNote.and.returnValue(of({ ...MOCK_NOTE, title: 'Updated title' }));
    component.form.controls.title.setValue('Updated title');

    component.save();

    expect(api.updateNote).toHaveBeenCalledWith(3, jasmine.objectContaining({
      title: 'Updated title',
      tags: ['ops', 'release'],
    }));
  });

  it('should clear AI config values when AI is disabled', () => {
    api.updateNote.and.returnValue(of({
      ...MOCK_NOTE,
      aiEnabled: false,
      aiProviderKey: null,
      aiModel: null,
      aiPrompt: null,
    }));
    component.form.controls.aiEnabled.setValue(false);
    component.save();
    expect(api.updateNote).toHaveBeenCalledWith(3, jasmine.objectContaining({
      aiProviderKey: null,
      aiModel: null,
      aiPrompt: null,
    }));
  });

  it('should save a version and show a success notification', () => {
    api.createVersion.and.returnValue(of({
      id: 9,
      noteId: 3,
      title: MOCK_NOTE.title,
      body: MOCK_NOTE.body,
      versionNumber: 4,
      createdAt: '2026-04-03T00:00:00.000Z',
    }));

    component.saveVersion();

    expect(api.createVersion).toHaveBeenCalledWith(3);
    expect(component.versionMessage()).toBe('Version saved successfully.');
  });

  it('should open the delete dialog and delete the note after confirmation', () => {
    api.deleteNote.and.returnValue(of(undefined));
    component.confirmDelete();
    expect(component.deleteDialogOpen()).toBeTrue();

    component.deleteNote();

    expect(api.deleteNote).toHaveBeenCalledWith(3);
    expect(router.navigate).toHaveBeenCalledWith(['/notes']);
  });

  it('should set saveError when updateNote fails', () => {
    api.updateNote.and.returnValue(throwError(() => new Error('fail')));
    component.save();
    expect(component.saveError()).toBe('Failed to save note.');
  });
});