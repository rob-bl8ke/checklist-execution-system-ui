import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RemindersComponent } from './reminders.component';
import { RemindersApiService } from '../../services/reminders-api.service';
import { ReminderDefinition } from '../../models/api.models';

const ACTIVE_REMINDER: ReminderDefinition = {
  id: 1,
  title: 'Sprint Retro',
  description: null,
  category: 'Team',
  cadence: 'WEEKLY',
  interval: 2,
  anchorDate: '2026-01-02',
  weekdays: [5],
  timeOfDay: null,
  leadTimeDays: 2,
  linkedTemplateId: null,
  active: true,
  createdAt: '',
  updatedAt: null,
};

const INACTIVE_REMINDER: ReminderDefinition = { ...ACTIVE_REMINDER, id: 2, active: false };

describe('RemindersComponent', () => {
  let fixture: ComponentFixture<RemindersComponent>;
  let component: RemindersComponent;
  let api: jasmine.SpyObj<RemindersApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('RemindersApiService', [
      'getReminders',
      'updateReminder',
      'deleteReminder',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    api.getReminders.and.returnValue(of([ACTIVE_REMINDER, INACTIVE_REMINDER]));

    await TestBed.configureTestingModule({
      imports: [RemindersComponent],
      providers: [
        { provide: RemindersApiService, useValue: api },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RemindersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load reminders on init', () => {
    expect(api.getReminders).toHaveBeenCalledOnceWith();
    expect(component.reminders().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  // -------------------------------------------------------------------------
  // toggleActive — deactivate an active reminder (issue #43)
  // -------------------------------------------------------------------------

  describe('toggleActive', () => {
    it('should call updateReminder with active=false when deactivating', () => {
      api.updateReminder.and.returnValue(of({ ...ACTIVE_REMINDER, active: false }));
      component.toggleActive(ACTIVE_REMINDER);
      expect(api.updateReminder).toHaveBeenCalledWith(1, { active: false });
    });

    it('should call updateReminder with active=true when reactivating', () => {
      api.updateReminder.and.returnValue(of({ ...INACTIVE_REMINDER, active: true }));
      component.toggleActive(INACTIVE_REMINDER);
      expect(api.updateReminder).toHaveBeenCalledWith(2, { active: true });
    });

    it('should update the reminder in the list after deactivation', () => {
      const deactivated = { ...ACTIVE_REMINDER, active: false };
      api.updateReminder.and.returnValue(of(deactivated));
      component.toggleActive(ACTIVE_REMINDER);
      const updated = component.reminders().find((r) => r.id === 1);
      expect(updated?.active).toBeFalse();
    });

    it('should update the reminder in the list after reactivation', () => {
      const reactivated = { ...INACTIVE_REMINDER, active: true };
      api.updateReminder.and.returnValue(of(reactivated));
      component.toggleActive(INACTIVE_REMINDER);
      const updated = component.reminders().find((r) => r.id === 2);
      expect(updated?.active).toBeTrue();
    });

    it('should set togglingId during the API call', () => {
      let captured: number | null = null;
      api.updateReminder.and.callFake(() => {
        captured = component.togglingId() as number | null;
        return of({ ...ACTIVE_REMINDER, active: false });
      });
      component.toggleActive(ACTIVE_REMINDER);
      expect(captured as number | null).toBe(1);
    });

    it('should clear togglingId after success', () => {
      api.updateReminder.and.returnValue(of({ ...ACTIVE_REMINDER, active: false }));
      component.toggleActive(ACTIVE_REMINDER);
      expect(component.togglingId()).toBeNull();
    });

    it('should clear togglingId on API error', () => {
      api.updateReminder.and.returnValue(throwError(() => new Error('fail')));
      component.toggleActive(ACTIVE_REMINDER);
      expect(component.togglingId()).toBeNull();
    });

    it('should not modify other reminders in the list', () => {
      const deactivated = { ...ACTIVE_REMINDER, active: false };
      api.updateReminder.and.returnValue(of(deactivated));
      component.toggleActive(ACTIVE_REMINDER);
      const other = component.reminders().find((r) => r.id === 2);
      expect(other?.active).toBeFalse(); // INACTIVE_REMINDER was already inactive
    });
  });
});
