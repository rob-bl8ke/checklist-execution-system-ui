import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { ReminderEditorComponent } from './reminder-editor.component';
import { RemindersApiService } from '../../services/reminders-api.service';
import { TemplatesApiService } from '../../services/templates-api.service';
import { OccurrencePreviewService } from '../../services/occurrence-preview.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActivatedRoute(id: string) {
  return { snapshot: { paramMap: { get: (_: string) => id } } };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ReminderEditorComponent', () => {
  let fixture: ComponentFixture<ReminderEditorComponent>;
  let component: ReminderEditorComponent;
  let remindersApi: jasmine.SpyObj<RemindersApiService>;
  let templatesApi: jasmine.SpyObj<TemplatesApiService>;
  let router: jasmine.SpyObj<Router>;
  let previewService: jasmine.SpyObj<OccurrencePreviewService>;

  beforeEach(async () => {
    remindersApi = jasmine.createSpyObj('RemindersApiService', [
      'getReminder',
      'createReminder',
      'updateReminder',
      'deleteReminder',
      'getReminders',
    ]);
    templatesApi = jasmine.createSpyObj('TemplatesApiService', ['getTemplates']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    previewService = jasmine.createSpyObj('OccurrencePreviewService', [
      'computePreviewDates',
      'prepStartDateFor',
      'formatPreviewDate',
    ]);
    previewService.computePreviewDates.and.returnValue([]);
    previewService.prepStartDateFor.and.returnValue('2026-04-08');
    previewService.formatPreviewDate.and.returnValue('Fri, 3 Apr 2026');

    templatesApi.getTemplates.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ReminderEditorComponent],
      providers: [
        { provide: RemindersApiService, useValue: remindersApi },
        { provide: TemplatesApiService, useValue: templatesApi },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: makeActivatedRoute('new') },
        { provide: OccurrencePreviewService, useValue: previewService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReminderEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Delegation to OccurrencePreviewService
  // -------------------------------------------------------------------------

  describe('previewDates', () => {
    it('should delegate to OccurrencePreviewService.computePreviewDates', () => {
      component.cadence = 'WEEKLY';
      component.interval = 1;
      component.anchorDate = '2026-01-02';
      component.weekdays = [5];

      const _ = component.previewDates;

      expect(previewService.computePreviewDates).toHaveBeenCalledWith({
        cadence: 'WEEKLY',
        interval: 1,
        anchorDate: '2026-01-02',
        weekdays: [5],
      });
    });

    it('should return whatever the service returns', () => {
      previewService.computePreviewDates.and.returnValue(['2026-04-03', '2026-04-10']);
      expect(component.previewDates).toEqual(['2026-04-03', '2026-04-10']);
    });
  });

  describe('prepStartDateFor', () => {
    it('should delegate to OccurrencePreviewService.prepStartDateFor with leadTimeDays', () => {
      component.leadTimeDays = 2;
      component.prepStartDateFor('2026-04-10');
      expect(previewService.prepStartDateFor).toHaveBeenCalledWith('2026-04-10', 2);
    });

    it('should return whatever the service returns', () => {
      previewService.prepStartDateFor.and.returnValue('2026-04-08');
      expect(component.prepStartDateFor('2026-04-10')).toBe('2026-04-08');
    });
  });

  describe('formatPreviewDate', () => {
    it('should delegate to OccurrencePreviewService.formatPreviewDate', () => {
      component.formatPreviewDate('2026-04-03');
      expect(previewService.formatPreviewDate).toHaveBeenCalledWith('2026-04-03');
    });

    it('should return whatever the service returns', () => {
      previewService.formatPreviewDate.and.returnValue('Fri, 3 Apr 2026');
      expect(component.formatPreviewDate('2026-04-03')).toBe('Fri, 3 Apr 2026');
    });
  });
});

