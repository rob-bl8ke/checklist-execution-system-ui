import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ReminderDefinition,
  ReminderAgendaItem,
  CreateReminderDto,
  UpdateReminderDto,
  UpdateReminderOccurrenceDto,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class RemindersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reminders`;

  getReminders(): Observable<ReminderDefinition[]> {
    return this.http.get<ReminderDefinition[]>(this.base);
  }

  getReminder(id: number): Observable<ReminderDefinition> {
    return this.http.get<ReminderDefinition>(`${this.base}/${id}`);
  }

  getAgenda(from: string, to: string): Observable<ReminderAgendaItem[]> {
    return this.http.get<ReminderAgendaItem[]>(`${this.base}/agenda`, {
      params: { from, to },
    });
  }

  createReminder(dto: CreateReminderDto): Observable<ReminderDefinition> {
    return this.http.post<ReminderDefinition>(this.base, dto);
  }

  updateReminder(id: number, dto: UpdateReminderDto): Observable<ReminderDefinition> {
    return this.http.put<ReminderDefinition>(`${this.base}/${id}`, dto);
  }

  deleteReminder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  updateOccurrence(
    id: number,
    occurrenceDate: string,
    dto: UpdateReminderOccurrenceDto,
  ): Observable<ReminderAgendaItem> {
    return this.http.patch<ReminderAgendaItem>(
      `${this.base}/${id}/occurrences/${occurrenceDate}`,
      dto,
    );
  }
}
