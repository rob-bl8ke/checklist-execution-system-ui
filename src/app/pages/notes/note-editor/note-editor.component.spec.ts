import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
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
      'generateNote',
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

  it('should not preload a note in create mode', () => {
    expect(api.getNote).not.toHaveBeenCalled();
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

  it('should keep other form fields intact when tags change', () => {
    component.form.controls.title.setValue('Stable title');
    component.form.controls.body.setValue('Stable body');

    component.tagInput.setValue('release');
    component.addTagFromInput();
    component.removeTag('release');

    expect(component.form.controls.title.value).toBe('Stable title');
    expect(component.form.controls.body.value).toBe('Stable body');
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

  it('should mark the editor dirty when form or tag state changes and reset after save', () => {
    api.createNote.and.returnValue(of(MOCK_NOTE));
    component.form.controls.title.setValue('Release checklist');
    component.tagInput.setValue('ops');
    component.addTagFromInput();

    expect(component.isDirty()).toBeTrue();

    component.save();

    expect(component.isDirty()).toBeFalse();
  });

  it('should navigate back to the notes list', () => {
    component.goBack();

    expect(router.navigate).toHaveBeenCalledWith(['/notes']);
  });

  it('should confirm before navigating away when the editor is dirty', () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    component.form.controls.title.setValue('Unsaved change');

    component.goBack();

    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved note changes?');
    expect(router.navigate).not.toHaveBeenCalled();
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
      'generateNote',
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
    expect(component.isDirty()).toBeFalse();
  });

  it('should extract variables from the note body using the current delimiters', () => {
    component.form.controls.body.setValue('Deploy {{service}} to {{environment}} using {{service}}');

    expect(component.variableNames()).toEqual(['service', 'environment']);
  });

  it('should respect custom delimiters when extracting variables', () => {
    component.form.controls.variablePrefix.setValue('@{');
    component.form.controls.variableSuffix.setValue('}');
    component.form.controls.body.setValue('Deploy @{service} version @{version}');

    expect(component.variableNames()).toEqual(['service', 'version']);
  });

  it('should generate rendered markdown from variable values', () => {
    api.generateNote.and.returnValue(of({ rendered: 'Deploy api to prod' }));
    component.form.controls.body.setValue('Deploy {{service}} to {{environment}}');

    component['reconcileVariableForm']();
    component.variableForm.controls['service'].setValue('api');
    component.variableForm.controls['environment'].setValue('prod');

    component.generatePreview();

    expect(api.generateNote).toHaveBeenCalledWith(3, {
      service: 'api',
      environment: 'prod',
    });
    expect(component.generatedMarkdown()).toBe('Deploy api to prod');
  });

  it('should allow changing variable values and generating again', () => {
    api.generateNote.and.returnValues(
      of({ rendered: 'Deploy api to prod' }),
      of({ rendered: 'Deploy web to stage' }),
    );
    component.form.controls.body.setValue('Deploy {{service}} to {{environment}}');

    component['reconcileVariableForm']();
    component.variableForm.controls['service'].setValue('api');
    component.variableForm.controls['environment'].setValue('prod');
    component.generatePreview();

    component.variableForm.controls['service'].setValue('web');
    component.variableForm.controls['environment'].setValue('stage');
    component.generatePreview();

    expect(api.generateNote.calls.argsFor(1)).toEqual([3, {
      service: 'web',
      environment: 'stage',
    }]);
    expect(component.generatedMarkdown()).toBe('Deploy web to stage');
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

describe('NoteEditorComponent - loading signal', () => {
  let fixture: ComponentFixture<NoteEditorComponent>;
  let component: NoteEditorComponent;
  let api: jasmine.SpyObj<NotesApiService>;
  let router: jasmine.SpyObj<Router>;
  let noteSubject: Subject<Note>;

  beforeEach(async () => {
    noteSubject = new Subject<Note>();
    api = jasmine.createSpyObj('NotesApiService', [
      'getNote',
      'getTags',
      'createNote',
      'updateNote',
      'generateNote',
      'createVersion',
      'deleteNote',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    api.getTags.and.returnValue(of(['ops', 'release', 'research']));
    api.getNote.and.returnValue(noteSubject.asObservable());

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

  it('should set loading true during note fetch and false after completion', () => {
    expect(component.loading()).toBeTrue();

    noteSubject.next(MOCK_NOTE);
    noteSubject.complete();

    expect(component.loading()).toBeFalse();
  });
});

describe('NoteEditorComponent - invalid edit route', () => {
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
      'generateNote',
      'createVersion',
      'deleteNote',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    api.getTags.and.returnValue(of(['ops', 'release', 'research']));
    api.getNote.and.returnValue(throwError(() => new Error('not found')));

    await TestBed.configureTestingModule({
      imports: [NoteEditorComponent],
      providers: [
        { provide: NotesApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: makeRoute('99999') },
        provideMarkdown(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NoteEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show an error state when the note id is invalid', () => {
    expect(api.getNote).toHaveBeenCalledWith(99999);
    expect(component.loadError()).toBe('Failed to load note.');
    expect(component.loading()).toBeFalse();
  });
});
