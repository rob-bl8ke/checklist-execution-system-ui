import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Instance,
  InstanceSummary,
  CreateInstanceDto,
  CompleteStepDto,
  UpdateInstanceStatusDto,
  InstanceStep,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class InstancesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/instances`;

  getInstances(): Observable<InstanceSummary[]> {
    return this.http.get<InstanceSummary[]>(this.base);
  }

  getInstance(id: number): Observable<Instance> {
    return this.http.get<Instance>(`${this.base}/${id}`);
  }

  createInstance(dto: CreateInstanceDto): Observable<Instance> {
    return this.http.post<Instance>(this.base, dto);
  }

  completeStep(instanceId: number, stepId: number, dto: CompleteStepDto): Observable<InstanceStep> {
    return this.http.patch<InstanceStep>(
      `${this.base}/${instanceId}/steps/${stepId}`,
      dto,
    );
  }

  updateInstanceStatus(id: number, dto: UpdateInstanceStatusDto): Observable<Instance> {
    return this.http.patch<Instance>(`${this.base}/${id}`, dto);
  }
}
