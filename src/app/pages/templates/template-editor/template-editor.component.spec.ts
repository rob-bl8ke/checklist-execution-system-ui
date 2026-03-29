import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TemplateEditorComponent } from './template-editor.component';
import { TemplatesApiService } from '../../../services/templates-api.service';
import { Template, TemplateStep } from '../../../models/api.models';

const MOCK_TEMPLATE: Template = {
  id: 7,
  name: 'My Template',
  description: 'A description',
  createdAt: '',
  updatedAt: null,
};

const MOCK_STEPS: TemplateStep[] = [
  { id: 1, templateId: 7, position: 1, title: 'Step One', instructions: null, createdAt: '' },
  { id: 2, templateId: 7, position: 2, title: 'Step Two', instructions: null, createdAt: '' },
];

function makeRoute(id: string) {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) },
  };
}

describe('TemplateEditorComponent — edit mode', () => {
  let fixture: ComponentFixture<TemplateEditorComponent>;
  let component: TemplateEditorComponent;
  let api: jasmine.SpyObj<TemplatesApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('TemplatesApiService', [
      'getTemplate', 'getSteps', 'createTemplate', 'updateTemplate', 'moveStep',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    api.getTemplate.and.returnValue(of(MOCK_TEMPLATE));
    api.getSteps.and.returnValue(of(MOCK_STEPS));

    await TestBed.configureTestingModule({
      imports: [TemplateEditorComponent],
      providers: [
        { provide: TemplatesApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: makeRoute('7') },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be in edit mode when id param is numeric', () => {
    expect(component.isNew()).toBeFalse();
    expect(component.templateId()).toBe(7);
  });

  it('should load template and populate name/description', () => {
    expect(api.getTemplate).toHaveBeenCalledWith(7);
    expect(component.name).toBe('My Template');
    expect(component.description).toBe('A description');
  });

  it('should load steps after template loads', () => {
    expect(api.getSteps).toHaveBeenCalledWith(7);
    expect(component.steps()).toEqual(MOCK_STEPS);
  });

  it('should call updateTemplate on saveTemplate', () => {
    api.updateTemplate.and.returnValue(of(MOCK_TEMPLATE));
    component.name = 'Updated';
    component.saveTemplate();
    expect(api.updateTemplate).toHaveBeenCalledWith(7, jasmine.objectContaining({ name: 'Updated' }));
  });

  it('should set saveError if updateTemplate fails', () => {
    api.updateTemplate.and.returnValue(throwError(() => new Error('fail')));
    component.name = 'Test';
    component.saveTemplate();
    expect(component.saveError()).toBe('Failed to save template.');
    expect(component.saving()).toBeFalse();
  });

  it('should open step editor with null for new step', () => {
    component.openStepEditor(null);
    expect(component.editingStep()).toBeNull();
  });

  it('should open step editor with step for edit', () => {
    component.openStepEditor(MOCK_STEPS[0]);
    expect(component.editingStep()).toEqual(MOCK_STEPS[0]);
  });

  it('should append new step when onStepSaved with unknown id', () => {
    const newStep: TemplateStep = { id: 99, templateId: 7, position: 3, title: 'New', instructions: null, createdAt: '' };
    component.onStepSaved(newStep);
    expect(component.steps().length).toBe(3);
    expect(component.steps()[2]).toEqual(newStep);
    expect(component.editingStep()).toBeUndefined();
  });

  it('should update existing step when onStepSaved with known id', () => {
    const updated: TemplateStep = { ...MOCK_STEPS[0], title: 'Updated Step One' };
    component.onStepSaved(updated);
    expect(component.steps().length).toBe(2);
    expect(component.steps()[0].title).toBe('Updated Step One');
  });

  it('should navigate to /templates on goBack', () => {
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/templates']);
  });
});

describe('TemplateEditorComponent — create mode', () => {
  let fixture: ComponentFixture<TemplateEditorComponent>;
  let component: TemplateEditorComponent;
  let api: jasmine.SpyObj<TemplatesApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('TemplatesApiService', [
      'getTemplate', 'getSteps', 'createTemplate', 'updateTemplate', 'moveStep',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TemplateEditorComponent],
      providers: [
        { provide: TemplatesApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: makeRoute('new') },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be in create mode when id param is "new"', () => {
    expect(component.isNew()).toBeTrue();
    expect(component.templateId()).toBeNull();
  });

  it('should not call getTemplate in create mode', () => {
    expect(api.getTemplate).not.toHaveBeenCalled();
  });

  it('should call createTemplate on saveTemplate', () => {
    api.createTemplate.and.returnValue(of({ ...MOCK_TEMPLATE, id: 42 }));
    api.getSteps.and.returnValue(of([]));
    component.name = 'Brand New';
    component.saveTemplate();
    expect(api.createTemplate).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Brand New' }));
  });

  it('should navigate to new template id after create', () => {
    api.createTemplate.and.returnValue(of({ ...MOCK_TEMPLATE, id: 42 }));
    api.getSteps.and.returnValue(of([]));
    component.name = 'Brand New';
    component.saveTemplate();
    expect(router.navigate).toHaveBeenCalledWith(['/templates', 42], jasmine.objectContaining({ replaceUrl: true }));
  });

  it('should not call saveTemplate when name is empty', () => {
    component.name = '';
    component.saveTemplate();
    expect(api.createTemplate).not.toHaveBeenCalled();
  });
});
