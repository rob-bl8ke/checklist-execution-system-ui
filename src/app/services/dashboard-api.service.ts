import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/dashboard`;

  getDashboard(upcomingDays?: number): Observable<DashboardResponse> {
    const params = upcomingDays != null
      ? new HttpParams().set('upcomingDays', String(upcomingDays))
      : undefined;
    return this.http.get<DashboardResponse>(this.base, { params });
  }
}
