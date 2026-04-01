import { Injectable } from '@angular/core';
import { ReminderCadence } from '../models/api.models';

export interface OccurrencePreviewDefinition {
  cadence: ReminderCadence;
  interval: number;
  anchorDate: string;
  weekdays: number[];
}

@Injectable({ providedIn: 'root' })
export class OccurrencePreviewService {
  private readonly DAY_MS = 86_400_000;
  private readonly WEEK_MS = 7 * 86_400_000;

  private dateToMs(date: string): number {
    return new Date(`${date}T00:00:00Z`).getTime();
  }

  private msToDateStr(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
  }

  private weekdayOf(date: string): number {
    return new Date(`${date}T00:00:00Z`).getUTCDay();
  }

  /**
   * Compute up to `maxCount` upcoming occurrence dates (YYYY-MM-DD) starting
   * from today, within a 90-day window.  Mirrors the backend recurrence algorithm.
   */
  computePreviewDates(
    definition: OccurrencePreviewDefinition,
    maxCount = 5,
  ): string[] {
    if (!definition.anchorDate || definition.cadence === 'ONCE') return [];

    const today = new Date().toISOString().slice(0, 10);
    const fromMs = this.dateToMs(today);
    const toMs = fromMs + 90 * this.DAY_MS;
    const anchorMs = this.dateToMs(definition.anchorDate);

    if (definition.cadence === 'DAILY') {
      const results: string[] = [];
      const intervalMs = definition.interval * this.DAY_MS;
      let current = anchorMs;
      if (current < fromMs) {
        const steps = Math.ceil((fromMs - current) / intervalMs);
        current += steps * intervalMs;
      }
      while (current <= toMs && results.length < maxCount) {
        results.push(this.msToDateStr(current));
        current += intervalMs;
      }
      return results;
    }

    if (definition.cadence === 'WEEKLY') {
      const weekdays = [...definition.weekdays].sort((a, b) => a - b);
      if (weekdays.length === 0) return [];

      const results: string[] = [];
      const intervalWeeks = definition.interval;
      const anchorDow = this.weekdayOf(definition.anchorDate);
      const anchorWeekStartMs = anchorMs - anchorDow * this.DAY_MS;

      let weekStartMs = anchorWeekStartMs;
      if (fromMs > anchorMs) {
        const weeksDiff = Math.floor((fromMs - anchorWeekStartMs) / this.WEEK_MS);
        weekStartMs =
          anchorWeekStartMs +
          Math.floor(weeksDiff / intervalWeeks) * intervalWeeks * this.WEEK_MS;
      }

      outer: while (true) {
        for (const wd of weekdays) {
          const candidateMs = weekStartMs + wd * this.DAY_MS;
          if (candidateMs > toMs) break outer;
          if (candidateMs >= fromMs) {
            results.push(this.msToDateStr(candidateMs));
            if (results.length >= maxCount) break outer;
          }
        }
        weekStartMs += intervalWeeks * this.WEEK_MS;
      }

      return results;
    }

    return [];
  }

  /** Return the prep-start date for an occurrence given a lead time in days. */
  prepStartDateFor(occurrenceDate: string, leadTimeDays: number): string {
    return this.msToDateStr(this.dateToMs(occurrenceDate) - leadTimeDays * this.DAY_MS);
  }

  /** Format a YYYY-MM-DD string for display (e.g. "Fri, 3 Apr 2026"). */
  formatPreviewDate(dateStr: string): string {
    return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
}
