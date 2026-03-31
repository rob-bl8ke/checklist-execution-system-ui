import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { StartRunComponent, extractVariables } from './start-run.component';
import { TemplatesApiService } from '../../../services/templates-api.service';
import { InstancesApiService } from '../../../services/instances-api.service';
import { Template, TemplateStep, Instance } from '../../../models/api.models';

const MOCK_TEMPLATES: Template[] = [
  { id: 1, name: 'Deploy', description: null, variablePrefix: null, variableSuffix: null, createdAt: '', updatedAt: null },
  { id: 2, name: 'Rollback', description: null, variablePrefix: null, variableSuffix: null, createdAt: '', updatedAt: null },
];

const MOCK_STEPS: TemplateStep[] = [
  { id: 1, templateId: 1, position: 1, title: 'Step A', instructions: 'Deploy {{serviceName}} version {{version}}', createdAt: '' },
  { id: 2, templateId: 1, position: 2, title: 'Step B', instructions: 'Check {{serviceName}} health', createdAt: '' },
];

const MOCK_INSTANCE: Instance = {
  id: 99,
  name: 'My run',
  status: 'IN_PROGRESS',
  createdAt: '',
  templateId: 1,
  variables: { serviceName: 'api', version: '2.0' },
  nextStepId: 1,
  steps: [],
  progress: { completed: 0, total: 2 },
  nextStep: null,
};

// ---------------------------------------------------------------------------
// Pure function tests
// ---------------------------------------------------------------------------
describe('extractVariables', () => {
  it('should extract unique variable names', () => {
    expect(extractVariables('Hello {{name}}, deploy {{version}}')).toEqual(['name', 'version']);
  });

  it('should deduplicate repeated placeholders', () => {
    expect(extractVariables('{{foo}} and {{foo}} again')).toEqual(['foo']);
  });

  it('should return empty array when no placeholders present', () => {
    expect(extractVariables('No placeholders here')).toEqual([]);
  });

  it('should handle whitespace inside braces', () => {
    expect(extractVariables('{{ service }}')).toEqual(['service']);
  });

  it('should strip pipe expression and return the variable name only', () => {
    expect(extractVariables('{{title | upper}}')).toEqual(['title']);
  });

  it('should strip chained pipes and return the variable name only', () => {
    expect(extractVariables('{{value | trim | lower}}')).toEqual(['value']);
  });

  it('should strip parameterized pipes', () => {
    expect(extractVariables('{{text | truncate:50}}')).toEqual(['text']);
  });

  it('should deduplicate the same variable used with and without a pipe', () => {
    expect(extractVariables('{{name}} and {{name | upper}}')).toEqual(['name']);
  });

  it('should extract variables with custom prefix and suffix', () => {
    expect(extractVariables('Deploy @{serviceName} version @{version}', '@{', '}')).toEqual(['serviceName', 'version']);
  });

  it('should return empty array when using custom delimiters with no matches', () => {
    expect(extractVariables('Deploy {{serviceName}}', '@{', '}')).toEqual([]);
  });

  it('should strip pipes with custom delimiters', () => {
    expect(extractVariables('@{title | upper}', '@{', '}')).toEqual(['title']);
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('StartRunComponent', () => {
  let fixture: ComponentFixture<StartRunComponent>;
  let component: StartRunComponent;
  let templatesApi: jasmine.SpyObj<TemplatesApiService>;
  let instancesApi: jasmine.SpyObj<InstancesApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    templatesApi = jasmine.createSpyObj('TemplatesApiService', ['getTemplates', 'getSteps']);
    instancesApi = jasmine.createSpyObj('InstancesApiService', ['createInstance']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    templatesApi.getTemplates.and.returnValue(of(MOCK_TEMPLATES));

    await TestBed.configureTestingModule({
      imports: [StartRunComponent],
      providers: [
        { provide: TemplatesApiService, useValue: templatesApi },
        { provide: InstancesApiService, useValue: instancesApi },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StartRunComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load templates on init', () => {
    expect(templatesApi.getTemplates).toHaveBeenCalledOnceWith();
    expect(component.templates()).toEqual(MOCK_TEMPLATES);
    expect(component.loadingTemplates()).toBeFalse();
  });

  it('should start on the select step', () => {
    expect(component.flowStep()).toBe('select');
  });

  describe('after selecting a template', () => {
    beforeEach(() => {
      templatesApi.getSteps.and.returnValue(of(MOCK_STEPS));
      component.selectTemplate(MOCK_TEMPLATES[0]);
    });

    it('should load steps for the selected template', () => {
      expect(templatesApi.getSteps).toHaveBeenCalledWith(1);
    });

    it('should advance to the form step', () => {
      expect(component.flowStep()).toBe('form');
    });

    it('should extract unique variable names from step instructions', () => {
      expect(component.variableNames()).toEqual(['serviceName', 'version']);
    });

    it('should build a form with __name + extracted variable controls', () => {
      expect(component.form.contains('__name')).toBeTrue();
      expect(component.form.contains('serviceName')).toBeTrue();
      expect(component.form.contains('version')).toBeTrue();
    });

    it('should mark form invalid when fields are empty', () => {
      expect(component.form.invalid).toBeTrue();
    });

    it('should call createInstance with correct payload on submit', () => {
      instancesApi.createInstance.and.returnValue(of(MOCK_INSTANCE));
      component.form.setValue({ __name: 'My Run', serviceName: 'api', version: '2.0' });
      component.submit();
      expect(instancesApi.createInstance).toHaveBeenCalledWith({
        templateId: 1,
        name: 'My Run',
        variables: { serviceName: 'api', version: '2.0' },
      });
    });

    it('should navigate to /runs/:id after successful create', () => {
      instancesApi.createInstance.and.returnValue(of(MOCK_INSTANCE));
      component.form.setValue({ __name: 'My Run', serviceName: 'api', version: '2.0' });
      component.submit();
      expect(router.navigate).toHaveBeenCalledWith(['/runs', 99]);
    });

    it('should set error and reset submitting on API failure', () => {
      instancesApi.createInstance.and.returnValue(throwError(() => new Error('fail')));
      component.form.setValue({ __name: 'My Run', serviceName: 'api', version: '2.0' });
      component.submit();
      expect(component.error()).toBeTruthy();
      expect(component.submitting()).toBeFalse();
    });

    it('should not call createInstance when form is invalid', () => {
      component.submit();
      expect(instancesApi.createInstance).not.toHaveBeenCalled();
    });
  });

  describe('template with no variables', () => {
    it('should build a form with only __name when steps have no placeholders', () => {
      const noVarSteps: TemplateStep[] = [
        { id: 3, templateId: 1, position: 1, title: 'Plain step', instructions: 'No vars here', createdAt: '' },
      ];
      templatesApi.getSteps.and.returnValue(of(noVarSteps));
      component.selectTemplate(MOCK_TEMPLATES[0]);
      expect(component.variableNames()).toEqual([]);
      expect(component.form.contains('__name')).toBeTrue();
    });
  });

  describe('template with custom delimiters', () => {
    const CUSTOM_TEMPLATE: Template = {
      id: 3, name: 'Custom', description: null,
      variablePrefix: '@{', variableSuffix: '}',
      createdAt: '', updatedAt: null,
    };
    const CUSTOM_STEPS: TemplateStep[] = [
      { id: 10, templateId: 3, position: 1, title: 'Step X', instructions: 'Deploy @{serviceName} at @{version}', createdAt: '' },
    ];

    beforeEach(() => {
      templatesApi.getSteps.and.returnValue(of(CUSTOM_STEPS));
      component.selectTemplate(CUSTOM_TEMPLATE);
    });

    it('should extract variables using custom delimiters', () => {
      expect(component.variableNames()).toEqual(['serviceName', 'version']);
    });

    it('should build form controls for custom-delimited variables', () => {
      expect(component.form.contains('serviceName')).toBeTrue();
      expect(component.form.contains('version')).toBeTrue();
    });

    it('should not extract default {{ }} variables when custom delimiters are set', () => {
      const mixedSteps: TemplateStep[] = [
        { id: 11, templateId: 3, position: 1, title: 'Mix', instructions: '@{myVar} and {{ignored}}', createdAt: '' },
      ];
      templatesApi.getSteps.and.returnValue(of(mixedSteps));
      component.selectTemplate(CUSTOM_TEMPLATE);
      expect(component.variableNames()).toEqual(['myVar']);
      expect(component.form.contains('ignored')).toBeFalse();
    });
  });

  it('should navigate back to /runs on goBack', () => {
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/runs']);
  });
});
