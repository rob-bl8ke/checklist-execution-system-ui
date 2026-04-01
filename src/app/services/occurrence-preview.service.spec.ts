import { TestBed } from '@angular/core/testing';
import { OccurrencePreviewService } from './occurrence-preview.service';

function utcDay(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

describe('OccurrencePreviewService', () => {
  let service: OccurrencePreviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OccurrencePreviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // computePreviewDates — ONCE
  // -------------------------------------------------------------------------

  describe('computePreviewDates — ONCE', () => {
    it('should return empty array', () => {
      expect(
        service.computePreviewDates({ cadence: 'ONCE', interval: 1, anchorDate: '2026-12-25', weekdays: [] }),
      ).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // computePreviewDates — WEEKLY (issue #40)
  // -------------------------------------------------------------------------

  describe('computePreviewDates — WEEKLY', () => {
    const BASE = { cadence: 'WEEKLY' as const, interval: 1, anchorDate: '2026-01-02', weekdays: [5] };

    it('should return 5 dates', () => {
      expect(service.computePreviewDates(BASE).length).toBe(5);
    });

    it('should return only Fridays for weekdays=[5]', () => {
      for (const d of service.computePreviewDates(BASE)) {
        expect(utcDay(d)).toBe(5);
      }
    });

    it('should return dates in ascending order', () => {
      const dates = service.computePreviewDates(BASE);
      for (let i = 1; i < dates.length; i++) expect(dates[i] > dates[i - 1]).toBeTrue();
    });

    it('should only return dates on or after today', () => {
      const today = new Date().toISOString().slice(0, 10);
      for (const d of service.computePreviewDates(BASE)) expect(d >= today).toBeTrue();
    });

    it('should return consecutive Fridays 7 days apart for interval=1', () => {
      const dates = service.computePreviewDates(BASE);
      const DAY_MS = 86_400_000;
      for (let i = 1; i < dates.length; i++) {
        const diff = new Date(`${dates[i]}T00:00:00Z`).getTime() - new Date(`${dates[i - 1]}T00:00:00Z`).getTime();
        expect(diff).toBe(7 * DAY_MS);
      }
    });

    it('should return every-other Friday 14 days apart for interval=2', () => {
      const dates = service.computePreviewDates({ ...BASE, interval: 2 });
      expect(dates.length).toBe(5);
      const DAY_MS = 86_400_000;
      for (const d of dates) expect(utcDay(d)).toBe(5);
      for (let i = 1; i < dates.length; i++) {
        const diff = new Date(`${dates[i]}T00:00:00Z`).getTime() - new Date(`${dates[i - 1]}T00:00:00Z`).getTime();
        expect(diff).toBe(14 * DAY_MS);
      }
    });

    it('should return empty when no weekdays are selected', () => {
      expect(service.computePreviewDates({ ...BASE, weekdays: [] })).toEqual([]);
    });

    it('should include occurrences for both selected weekdays (Wed+Fri)', () => {
      const dates = service.computePreviewDates({ ...BASE, weekdays: [3, 5] });
      expect(dates.length).toBe(5);
      for (const d of dates) expect([3, 5]).toContain(utcDay(d));
    });

    it('should return empty when anchorDate is empty', () => {
      expect(service.computePreviewDates({ ...BASE, anchorDate: '' })).toEqual([]);
    });

    it('should respect maxCount parameter', () => {
      expect(service.computePreviewDates(BASE, 3).length).toBe(3);
    });

    describe('exact dates when today is 2026-04-01 (issue #40)', () => {
      beforeEach(() => {
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date('2026-04-01T00:00:00Z'));
      });

      afterEach(() => jasmine.clock().uninstall());

      it('should return the next 5 Fridays starting 2026-04-03', () => {
        expect(service.computePreviewDates(BASE)).toEqual([
          '2026-04-03',
          '2026-04-10',
          '2026-04-17',
          '2026-04-24',
          '2026-05-01',
        ]);
      });
    });
  });

  // -------------------------------------------------------------------------
  // computePreviewDates — DAILY
  // -------------------------------------------------------------------------

  describe('computePreviewDates — DAILY', () => {
    const BASE = { cadence: 'DAILY' as const, interval: 1, anchorDate: '2026-01-01', weekdays: [] };

    it('should return 5 dates for interval=1', () => {
      expect(service.computePreviewDates(BASE).length).toBe(5);
    });

    it('should return dates spaced by interval days', () => {
      const dates = service.computePreviewDates({ ...BASE, interval: 3 });
      const DAY_MS = 86_400_000;
      for (let i = 1; i < dates.length; i++) {
        const diff = new Date(`${dates[i]}T00:00:00Z`).getTime() - new Date(`${dates[i - 1]}T00:00:00Z`).getTime();
        expect(diff).toBe(3 * DAY_MS);
      }
    });

    it('should return dates in ascending order', () => {
      const dates = service.computePreviewDates(BASE);
      for (let i = 1; i < dates.length; i++) expect(dates[i] > dates[i - 1]).toBeTrue();
    });

    it('should only return dates on or after today', () => {
      const today = new Date().toISOString().slice(0, 10);
      for (const d of service.computePreviewDates(BASE)) expect(d >= today).toBeTrue();
    });

    describe('exact dates when today is 2026-04-01', () => {
      beforeEach(() => {
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date('2026-04-01T00:00:00Z'));
      });

      afterEach(() => jasmine.clock().uninstall());

      it('should start from today for interval=1 with past anchor', () => {
        expect(service.computePreviewDates(BASE)).toEqual([
          '2026-04-01',
          '2026-04-02',
          '2026-04-03',
          '2026-04-04',
          '2026-04-05',
        ]);
      });

      it('should advance by 2 days for interval=2 with past anchor', () => {
        expect(service.computePreviewDates({ ...BASE, interval: 2 })).toEqual([
          '2026-04-01',
          '2026-04-03',
          '2026-04-05',
          '2026-04-07',
          '2026-04-09',
        ]);
      });
    });
  });

  // -------------------------------------------------------------------------
  // prepStartDateFor
  // -------------------------------------------------------------------------

  describe('prepStartDateFor', () => {
    it('should subtract leadTimeDays from the occurrence date', () => {
      expect(service.prepStartDateFor('2026-04-10', 2)).toBe('2026-04-08');
    });

    it('should return the same date when leadTimeDays is 0', () => {
      expect(service.prepStartDateFor('2026-04-10', 0)).toBe('2026-04-10');
    });

    it('should cross month boundaries correctly', () => {
      expect(service.prepStartDateFor('2026-05-02', 5)).toBe('2026-04-27');
    });
  });

  // -------------------------------------------------------------------------
  // formatPreviewDate
  // -------------------------------------------------------------------------

  describe('formatPreviewDate', () => {
    it('should return a non-empty string', () => {
      expect(service.formatPreviewDate('2026-04-03').length).toBeGreaterThan(0);
    });

    it('should include the weekday name for a Friday', () => {
      expect(service.formatPreviewDate('2026-04-03')).toContain('Fri');
    });

    it('should include the year', () => {
      expect(service.formatPreviewDate('2026-04-03')).toContain('2026');
    });
  });
});
