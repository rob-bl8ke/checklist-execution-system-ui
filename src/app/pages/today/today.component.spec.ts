import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TodayComponent } from './today.component';
import { DashboardApiService } from '../../services/dashboard-api.service';
import { InstancesApiService } from '../../services/instances-api.service';
import { TodosApiService } from '../../services/todos-api.service';
import { RemindersApiService } from '../../services/reminders-api.service';
import { DashboardResponse, InstanceStep, ReminderAgendaItem } from '../../models/api.models';

const MOCK_STEP_RESULT: InstanceStep = {
  id: 11,
  instanceId: 1,
  stepOrder: 1,
  title: 'Health check',
  instructionsTemplate: null,
  renderedInstructions: null,
  completed: true,
  completedAt: null,
  notes: null,
};

const MOCK_DASHBOARD: DashboardResponse = {
  runs: [
    {
      id: 1,
      name: 'Deploy v2.0',
      progress: { completed: 2, total: 5 },
      nextStep: { id: 11, title: 'Health check', renderedInstructions: null },
    },
    {
      id: 2,
      name: 'Rollback v1.9',
      progress: { completed: 3, total: 3 },
      nextStep: null,
    },
  ],
  todos: [
    { id: 1, title: 'Buy groceries', completed: false, description: null, dueDate: null,         priority: 'NORMAL'   as const, createdAt: '', completedAt: null },
    { id: 2, title: 'Write tests',   completed: true,  description: null, dueDate: null,         priority: 'HIGH'     as const, createdAt: '', completedAt: null },
    { id: 3, title: 'Review PR',     completed: false, description: null, dueDate: '2000-01-01', priority: 'CRITICAL' as const, createdAt: '', completedAt: null },
  ],
  reminders: { dueNow: [], upcoming: [] },
};

describe('TodayComponent', () => {
  let fixture: ComponentFixture<TodayComponent>;
  let component: TodayComponent;
  let dashboardApi: jasmine.SpyObj<DashboardApiService>;
  let instancesApi: jasmine.SpyObj<InstancesApiService>;
  let todosApi: jasmine.SpyObj<TodosApiService>;
  let remindersApi: jasmine.SpyObj<RemindersApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    dashboardApi = jasmine.createSpyObj('DashboardApiService', ['getDashboard']);
    instancesApi = jasmine.createSpyObj('InstancesApiService', ['completeStep']);
    todosApi = jasmine.createSpyObj('TodosApiService', ['updateTodo']);
    remindersApi = jasmine.createSpyObj('RemindersApiService', ['updateOccurrence']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    dashboardApi.getDashboard.and.returnValue(of(MOCK_DASHBOARD));

    await TestBed.configureTestingModule({
      imports: [TodayComponent],
      providers: [
        { provide: DashboardApiService, useValue: dashboardApi },
        { provide: InstancesApiService, useValue: instancesApi },
        { provide: TodosApiService, useValue: todosApi },
        { provide: RemindersApiService, useValue: remindersApi },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TodayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getDashboard on init', () => {
    expect(dashboardApi.getDashboard).toHaveBeenCalledOnceWith();
  });

  it('should populate runs signal after load', () => {
    expect(component.runs()).toEqual(MOCK_DASHBOARD.runs);
    expect(component.loading()).toBeFalse();
  });

  it('should only include incomplete todos', () => {
    // 3 todos: 2 incomplete, 1 complete
    expect(component.todos().length).toBe(2);
  });

  it('should set loading to false after load completes', () => {
    expect(component.loading()).toBeFalse();
  });

  it('should set loading to false on getDashboard error', () => {
    dashboardApi.getDashboard.and.returnValue(throwError(() => new Error()));
    component.loadDashboard();
    expect(component.loading()).toBeFalse();
  });

  describe('run cards', () => {
    it('should show empty runs when dashboard returns no active runs', () => {
      dashboardApi.getDashboard.and.returnValue(of({ ...MOCK_DASHBOARD, runs: [] }));
      component.loadDashboard();
      expect(component.runs().length).toBe(0);
    });

    it('should expose step position as completed+1', () => {
      const run = component.runs()[0];
      expect(run.progress.completed + 1).toBe(3);
    });
  });

  describe('quick-open run (10.3)', () => {
    it('should navigate to /runs/:id when openRun is called', () => {
      component.openRun(1);
      expect(router.navigate).toHaveBeenCalledWith(['/runs', 1]);
    });

    it('should navigate to the correct id for each run', () => {
      component.openRun(2);
      expect(router.navigate).toHaveBeenCalledWith(['/runs', 2]);
    });
  });

  describe('inline step completion (10.2)', () => {
    it('should call completeStep with correct args when Complete is clicked', () => {
      instancesApi.completeStep.and.returnValue(of(MOCK_STEP_RESULT));
      component.completeStep(MOCK_DASHBOARD.runs[0]);
      expect(instancesApi.completeStep).toHaveBeenCalledWith(1, 11, { completed: true });
    });

    it('should set completingStepId during the API call', () => {
      let captured: number | null = null;
      instancesApi.completeStep.and.callFake(() => {
        captured = component.completingStepId() as number | null;
        return of(MOCK_STEP_RESULT);
      });
      component.completeStep(MOCK_DASHBOARD.runs[0]);
      expect(captured as number | null).toEqual(11);
    });

    it('should clear completingStepId after success', () => {
      instancesApi.completeStep.and.returnValue(of(MOCK_STEP_RESULT));
      component.completeStep(MOCK_DASHBOARD.runs[0]);
      expect(component.completingStepId()).toBeNull();
    });

    it('should refresh dashboard after success', () => {
      instancesApi.completeStep.and.returnValue(of(MOCK_STEP_RESULT));
      const callsBefore = dashboardApi.getDashboard.calls.count();
      component.completeStep(MOCK_DASHBOARD.runs[0]);
      expect(dashboardApi.getDashboard.calls.count()).toBeGreaterThan(callsBefore);
    });

    it('should set stepError for the run on API failure', () => {
      instancesApi.completeStep.and.returnValue(throwError(() => new Error('fail')));
      component.completeStep(MOCK_DASHBOARD.runs[0]);
      expect(component.stepError()[1]).toBeTruthy();
    });

    it('should clear completingStepId on failure', () => {
      instancesApi.completeStep.and.returnValue(throwError(() => new Error('fail')));
      component.completeStep(MOCK_DASHBOARD.runs[0]);
      expect(component.completingStepId()).toBeNull();
    });

    it('should not call completeStep when run has no nextStep', () => {
      component.completeStep(MOCK_DASHBOARD.runs[1]); // nextStep: null
      expect(instancesApi.completeStep).not.toHaveBeenCalled();
    });

    it('should update cards when dashboard refreshes after complete', () => {
      const updatedDashboard: DashboardResponse = {
        ...MOCK_DASHBOARD,
        runs: [MOCK_DASHBOARD.runs[1]], // run 1 removed after completing
      };
      instancesApi.completeStep.and.returnValue(of(MOCK_STEP_RESULT));
      dashboardApi.getDashboard.and.returnValues(
        of(MOCK_DASHBOARD),
        of(updatedDashboard),
      );

      fixture = TestBed.createComponent(TodayComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      component.completeStep(MOCK_DASHBOARD.runs[0]);
      expect(component.runs().length).toBe(1);
      expect(component.runs()[0].id).toBe(2);
    });
  });

  describe('startRun navigation (issue #41)', () => {
    const MOCK_REMINDER_ITEM: ReminderAgendaItem = {
      reminderId: 5,
      title: 'Sprint Retro',
      description: null,
      category: 'Team',
      occurrenceDate: '2026-04-01',
      prepStartDate: '2026-03-28',
      timeOfDay: null,
      status: 'OPEN',
      isInPrepWindow: false,
      isOverdue: false,
      daysUntilOccurrence: 0,
      linkedTemplate: { id: 7, name: 'Retro Template' },
      canStartRun: true,
    };

    it('should navigate to /runs/new with the correct templateId query param', () => {
      component.startRun(MOCK_REMINDER_ITEM);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/runs/new'],
        { queryParams: { templateId: 7 } },
      );
    });

    it('should use the linkedTemplate id from the agenda item', () => {
      const otherItem: ReminderAgendaItem = {
        ...MOCK_REMINDER_ITEM,
        reminderId: 9,
        linkedTemplate: { id: 42, name: 'Other Template' },
      };
      component.startRun(otherItem);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/runs/new'],
        { queryParams: { templateId: 42 } },
      );
    });
  });

  describe('priorityClass', () => {
    it('should return red classes for CRITICAL', () => {
      expect(component.priorityClass('CRITICAL')).toContain('red');
    });

    it('should return orange classes for HIGH', () => {
      expect(component.priorityClass('HIGH')).toContain('orange');
    });

    it('should return blue classes for NORMAL', () => {
      expect(component.priorityClass('NORMAL')).toContain('blue');
    });

    it('should return gray classes for LOW', () => {
      expect(component.priorityClass('LOW')).toContain('gray');
    });
  });

  describe('isOverdue', () => {
    it('should return true for a past date', () => {
      expect(component.isOverdue('2000-01-01')).toBeTrue();
    });

    it('should return false for a future date', () => {
      expect(component.isOverdue('2099-12-31')).toBeFalse();
    });
  });
});
