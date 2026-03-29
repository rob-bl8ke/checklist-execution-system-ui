import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMarkdown } from 'ngx-markdown';
import { of, throwError } from 'rxjs';

import { RunExecutionComponent } from './run-execution.component';
import { InstancesApiService } from '../../../services/instances-api.service';
import { Instance, InstanceStep } from '../../../models/api.models';

function makeStep(overrides: Partial<InstanceStep> = {}): InstanceStep {
  return {
    id: 1,
    instanceId: 10,
    stepOrder: 1,
    title: 'Step One',
    instructionsTemplate: null,
    renderedInstructions: '**Hello**',
    completed: false,
    completedAt: null,
    notes: null,
    ...overrides,
  };
}

const STEP_1 = makeStep({ id: 1, stepOrder: 1, completed: false });
const STEP_2 = makeStep({ id: 2, stepOrder: 2, title: 'Step Two', completed: false });
const STEP_3 = makeStep({ id: 3, stepOrder: 3, title: 'Step Three', completed: true });

const MOCK_INSTANCE: Instance = {
  id: 10,
  name: 'Deploy v2',
  status: 'IN_PROGRESS',
  templateId: 1,
  variables: null,
  nextStepId: 1,
  createdAt: '',
  steps: [STEP_1, STEP_2, STEP_3],
  progress: { completed: 1, total: 3 },
  nextStep: { id: 1, title: 'Step One' },
};

describe('RunExecutionComponent', () => {
  let fixture: ComponentFixture<RunExecutionComponent>;
  let component: RunExecutionComponent;
  let api: jasmine.SpyObj<InstancesApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('InstancesApiService', ['getInstance', 'completeStep']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    api.getInstance.and.returnValue(of(MOCK_INSTANCE));

    await TestBed.configureTestingModule({
      imports: [RunExecutionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMarkdown(),
        { provide: InstancesApiService, useValue: api },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '10' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RunExecutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load instance on init', () => {
    expect(api.getInstance).toHaveBeenCalledWith(10);
    expect(component.instance()).toEqual(MOCK_INSTANCE);
    expect(component.loading()).toBeFalse();
  });

  it('should expand next_step_id step by default', () => {
    expect(component.expandedStepId()).toBe(MOCK_INSTANCE.nextStepId);
  });

  it('should compute completedCount correctly', () => {
    expect(component.completedCount()).toBe(1); // STEP_3 is completed
  });

  it('should compute totalCount correctly', () => {
    expect(component.totalCount()).toBe(3);
  });

  it('should compute progressPercent correctly', () => {
    expect(component.progressPercent()).toBe(33); // Math.round(1/3 * 100)
  });

  it('should toggle expanded step when clicked', () => {
    component.toggleExpand(2);
    expect(component.expandedStepId()).toBe(2);
    component.toggleExpand(2);
    expect(component.expandedStepId()).toBeNull();
  });

  it('should navigate back to /runs on goBack', () => {
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/runs']);
  });

  describe('toggleComplete', () => {
    it('should call completeStep with correct args when marking complete', () => {
      api.completeStep.and.returnValue(of({ ...STEP_1, completed: true }));
      component.toggleComplete(STEP_1);
      expect(api.completeStep).toHaveBeenCalledWith(10, 1, { completed: true });
    });

    it('should call completeStep with completed: false when uncompleting', () => {
      api.completeStep.and.returnValue(of({ ...STEP_3, completed: false }));
      component.toggleComplete(STEP_3);
      expect(api.completeStep).toHaveBeenCalledWith(10, 3, { completed: false });
    });

    it('should update step completed state on success', () => {
      api.completeStep.and.returnValue(of({ ...STEP_1, completed: true }));
      component.toggleComplete(STEP_1);
      const updated = component.instance()!.steps.find((s) => s.id === 1)!;
      expect(updated.completed).toBeTrue();
    });

    it('should advance expandedStepId to next incomplete step after completing a step', () => {
      api.completeStep.and.returnValue(of({ ...STEP_1, completed: true }));
      component.toggleComplete(STEP_1);
      // Next incomplete step should be STEP_2
      expect(component.expandedStepId()).toBe(2);
    });

    it('should reflect COMPLETED status when all steps done', () => {
      const allDoneStep: InstanceStep = { ...STEP_2, completed: true };
      // Set instance with all steps completed except STEP_2
      component.instance.set({
        ...MOCK_INSTANCE,
        steps: [
          { ...STEP_1, completed: true },
          STEP_2,
          STEP_3,
        ],
      });
      api.completeStep.and.returnValue(of(allDoneStep));
      component.toggleComplete(STEP_2);
      expect(component.instance()!.status).toBe('COMPLETED');
    });

    it('should revert optimistic update on API error', () => {
      api.completeStep.and.returnValue(throwError(() => new Error('fail')));
      component.toggleComplete(STEP_1);
      const reverted = component.instance()!.steps.find((s) => s.id === 1)!;
      expect(reverted.completed).toBeFalse();
    });

    it('should set stepError on API failure', () => {
      api.completeStep.and.returnValue(throwError(() => new Error('fail')));
      component.toggleComplete(STEP_1);
      expect(component.stepError()).toBeTruthy();
    });

    it('should clear completingStepId after success', () => {
      api.completeStep.and.returnValue(of({ ...STEP_1, completed: true }));
      component.toggleComplete(STEP_1);
      expect(component.completingStepId()).toBeNull();
    });
  });

  describe('injectCopyButtons', () => {
    it('should inject a copy button into pre > code blocks', () => {
      const container = document.createElement('div');
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = 'npm install';
      pre.appendChild(code);
      container.appendChild(pre);

      component.injectCopyButtons(container);

      const btn = pre.querySelector('.copy-btn') as HTMLButtonElement;
      expect(btn).not.toBeNull();
      expect(btn.textContent).toBe('Copy');
    });

    it('should not inject a second button when called again', () => {
      const container = document.createElement('div');
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      pre.appendChild(code);
      container.appendChild(pre);

      component.injectCopyButtons(container);
      component.injectCopyButtons(container);

      const btns = pre.querySelectorAll('.copy-btn');
      expect(btns.length).toBe(1);
    });

    it('should copy text to clipboard when copy button is clicked', async () => {
      const clipboardSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
      spyOnProperty(navigator, 'clipboard', 'get').and.returnValue(
        { writeText: clipboardSpy } as unknown as Clipboard,
      );

      const container = document.createElement('div');
      const pre = document.createElement('pre');
      const code = document.createElement('code') as HTMLElement;
      code.innerText = 'echo hello';
      pre.appendChild(code);
      container.appendChild(pre);

      component.injectCopyButtons(container);
      const btn = pre.querySelector('.copy-btn') as HTMLButtonElement;
      btn.click();

      expect(clipboardSpy).toHaveBeenCalledWith('echo hello');
    });
  });

  describe('keyboard shortcuts (11.1)', () => {
    function dispatch(key: string): void {
      document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    }

    beforeEach(() => {
      component.expandedStepId.set(STEP_1.id);
      fixture.detectChanges();
    });

    it('SPACE should call toggleComplete on the currently expanded step', () => {
      api.completeStep.and.returnValue(of({ ...STEP_1, completed: true }));
      dispatch(' ');
      expect(api.completeStep).toHaveBeenCalledWith(10, STEP_1.id, { completed: true });
    });

    it('N should expand the next step', () => {
      dispatch('n');
      expect(component.expandedStepId()).toBe(STEP_2.id);
    });

    it('N (uppercase) should expand the next step', () => {
      dispatch('N');
      expect(component.expandedStepId()).toBe(STEP_2.id);
    });

    it('N should not advance past the last step', () => {
      component.expandedStepId.set(STEP_3.id);
      dispatch('n');
      expect(component.expandedStepId()).toBe(STEP_3.id);
    });

    it('P should expand the previous step', () => {
      component.expandedStepId.set(STEP_2.id);
      dispatch('p');
      expect(component.expandedStepId()).toBe(STEP_1.id);
    });

    it('P (uppercase) should expand the previous step', () => {
      component.expandedStepId.set(STEP_2.id);
      dispatch('P');
      expect(component.expandedStepId()).toBe(STEP_1.id);
    });

    it('P should not go before the first step', () => {
      dispatch('p');
      expect(component.expandedStepId()).toBe(STEP_1.id);
    });

    it('C should copy first code block text to clipboard', () => {
      const clipboardSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
      spyOnProperty(navigator, 'clipboard', 'get').and.returnValue(
        { writeText: clipboardSpy } as unknown as Clipboard,
      );

      const stepContainer = (fixture.nativeElement as HTMLElement).querySelector('[data-step-id="1"]') as HTMLElement;
      const pre = document.createElement('pre');
      const code = document.createElement('code') as HTMLElement;
      code.innerText = 'kubectl apply -f deploy.yaml';
      pre.appendChild(code);
      stepContainer.appendChild(pre);

      dispatch('c');
      expect(clipboardSpy).toHaveBeenCalledWith('kubectl apply -f deploy.yaml');
    });

    it('C (uppercase) should copy first code block text to clipboard', () => {
      const clipboardSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
      spyOnProperty(navigator, 'clipboard', 'get').and.returnValue(
        { writeText: clipboardSpy } as unknown as Clipboard,
      );

      const stepContainer = (fixture.nativeElement as HTMLElement).querySelector('[data-step-id="1"]') as HTMLElement;
      const pre = document.createElement('pre');
      const code = document.createElement('code') as HTMLElement;
      code.innerText = 'docker build .';
      pre.appendChild(code);
      stepContainer.appendChild(pre);

      dispatch('C');
      expect(clipboardSpy).toHaveBeenCalledWith('docker build .');
    });

    it('C should do nothing when no code block is present', () => {
      const clipboardSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
      spyOnProperty(navigator, 'clipboard', 'get').and.returnValue(
        { writeText: clipboardSpy } as unknown as Clipboard,
      );
      dispatch('c');
      expect(clipboardSpy).not.toHaveBeenCalled();
    });

    it('shortcuts should not fire when an input is focused', () => {
      api.completeStep.and.returnValue(of({ ...STEP_1, completed: true }));
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      dispatch(' ');
      expect(api.completeStep).not.toHaveBeenCalled();
      input.remove();
    });

    it('shortcuts should not fire when a textarea is focused', () => {
      api.completeStep.and.returnValue(of({ ...STEP_1, completed: true }));
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      dispatch(' ');
      expect(api.completeStep).not.toHaveBeenCalled();
      textarea.remove();
    });

    it('N should expand first step when no step is currently expanded', () => {
      component.expandedStepId.set(null);
      dispatch('n');
      expect(component.expandedStepId()).toBe(STEP_1.id);
    });
  });
});
