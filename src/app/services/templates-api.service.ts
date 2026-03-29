import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Template,
  TemplateStep,
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateStepDto,
  UpdateStepDto,
  MoveStepDto,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class TemplatesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/templates`;

  getTemplates(): Observable<Template[]> {
    return this.http.get<Template[]>(this.base);
  }

  getTemplate(id: number): Observable<Template> {
    return this.http.get<Template>(`${this.base}/${id}`);
  }

  createTemplate(dto: CreateTemplateDto): Observable<Template> {
    return this.http.post<Template>(this.base, dto);
  }

  updateTemplate(id: number, dto: UpdateTemplateDto): Observable<Template> {
    return this.http.put<Template>(`${this.base}/${id}`, dto);
  }

  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getSteps(templateId: number): Observable<TemplateStep[]> {
    return this.http.get<TemplateStep[]>(`${this.base}/${templateId}/steps`);
  }

  createStep(templateId: number, dto: CreateStepDto): Observable<TemplateStep> {
    return this.http.post<TemplateStep>(`${this.base}/${templateId}/steps`, dto);
  }

  updateStep(templateId: number, stepId: number, dto: UpdateStepDto): Observable<TemplateStep> {
    return this.http.put<TemplateStep>(`${this.base}/${templateId}/steps/${stepId}`, dto);
  }

  deleteStep(templateId: number, stepId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${templateId}/steps/${stepId}`);
  }

  moveStep(templateId: number, stepId: number, dto: MoveStepDto): Observable<TemplateStep> {
    return this.http.patch<TemplateStep>(
      `${this.base}/${templateId}/steps/${stepId}/move`,
      dto,
    );
  }
}
