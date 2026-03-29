import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { provideMarkdown } from 'ngx-markdown';

import { StepEditorComponent } from './step-editor.component';
import { TemplatesApiService } from '../../../services/templates-api.service';
import { TemplateStep } from '../../../models/api.models';

const MOCK_STEP: TemplateStep = {
  id: 5,
  templateId: 1,
  position: 1,
  title: 'Existing Step',
  instructions: '**Bold**',
  createdAt: '',
};

describe('StepEditorComponent', () => {
  let fixture: ComponentFixture<StepEditorComponent>;
  let component: StepEditorComponent;
  let api: jasmine.SpyObj<TemplatesApiService>;

  async function create(step: TemplateStep | null = null) {
    fixture = TestBed.createComponent(StepEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('templateId', 1);
    fixture.componentRef.setInput('step', step);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    api = jasmine.createSpyObj('TemplatesApiService', ['createStep', 'updateStep']);

    await TestBed.configureTestingModule({
      imports: [StepEditorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMarkdown(),
        { provide: TemplatesApiService, useValue: api },
      ],
    }).compileComponents();
  });

  describe('create mode (step = null)', () => {
    beforeEach(async () => {
      await create(null);
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with empty title and instructions', () => {
      expect(component.title).toBe('');
      expect(component.instructions).toBe('');
    });

    it('should call createStep on save', () => {
      const result: TemplateStep = { ...MOCK_STEP, id: 99 };
      api.createStep.and.returnValue(of(result));
      component.title = 'New Step';
      component.instructions = 'Instructions here';
      component.save();
      expect(api.createStep).toHaveBeenCalledWith(1, { title: 'New Step', instructions: 'Instructions here' });
    });

    it('should emit saved with the returned step', () => {
      const result: TemplateStep = { ...MOCK_STEP, id: 99 };
      api.createStep.and.returnValue(of(result));
      let emitted: TemplateStep | undefined;
      component.saved.subscribe((s) => (emitted = s));
      component.title = 'New Step';
      component.save();
      expect(emitted).toEqual(result);
    });

    it('should set saving to false after success', () => {
      api.createStep.and.returnValue(of(MOCK_STEP));
      component.title = 'New Step';
      component.save();
      expect(component.saving()).toBeFalse();
    });

    it('should set saving to false after error', () => {
      api.createStep.and.returnValue(throwError(() => new Error('fail')));
      component.title = 'New Step';
      component.save();
      expect(component.saving()).toBeFalse();
    });

    it('should not call createStep when title is empty', () => {
      component.title = '';
      component.save();
      expect(api.createStep).not.toHaveBeenCalled();
    });

    it('should emit cancel when cancel output triggers', () => {
      let cancelled = false;
      component.cancel.subscribe(() => (cancelled = true));
      component.cancel.emit();
      expect(cancelled).toBeTrue();
    });
  });

  describe('edit mode (step has value)', () => {
    beforeEach(async () => {
      await create(MOCK_STEP);
    });

    it('should populate title and instructions from step input', () => {
      expect(component.title).toBe('Existing Step');
      expect(component.instructions).toBe('**Bold**');
    });

    it('should call updateStep on save', () => {
      const updated: TemplateStep = { ...MOCK_STEP, title: 'Updated' };
      api.updateStep.and.returnValue(of(updated));
      component.title = 'Updated';
      component.save();
      expect(api.updateStep).toHaveBeenCalledWith(1, 5, jasmine.objectContaining({ title: 'Updated' }));
    });

    it('should emit saved with the updated step', () => {
      const updated: TemplateStep = { ...MOCK_STEP, title: 'Updated' };
      api.updateStep.and.returnValue(of(updated));
      let emitted: TemplateStep | undefined;
      component.saved.subscribe((s) => (emitted = s));
      component.title = 'Updated';
      component.save();
      expect(emitted).toEqual(updated);
    });

    it('should not call createStep in edit mode', () => {
      api.updateStep.and.returnValue(of(MOCK_STEP));
      component.title = 'Updated';
      component.save();
      expect(api.createStep).not.toHaveBeenCalled();
    });

    it('should update fields when step input changes', () => {
      const newStep: TemplateStep = { ...MOCK_STEP, id: 9, title: 'Another', instructions: 'Other' };
      fixture.componentRef.setInput('step', newStep);
      fixture.detectChanges();
      expect(component.title).toBe('Another');
      expect(component.instructions).toBe('Other');
    });
  });
});
