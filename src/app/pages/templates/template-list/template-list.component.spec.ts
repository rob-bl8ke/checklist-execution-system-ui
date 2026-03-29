import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TemplateListComponent } from './template-list.component';
import { TemplatesApiService } from '../../../services/templates-api.service';
import { Template } from '../../../models/api.models';

const MOCK: Template[] = [
  { id: 1, name: 'Alpha', description: null, createdAt: '', updatedAt: null, stepCount: 2 },
  { id: 2, name: 'Beta',  description: null, createdAt: '', updatedAt: null, stepCount: 0 },
];

describe('TemplateListComponent', () => {
  let fixture: ComponentFixture<TemplateListComponent>;
  let component: TemplateListComponent;
  let api: jasmine.SpyObj<TemplatesApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('TemplatesApiService', ['getTemplates', 'deleteTemplate']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    api.getTemplates.and.returnValue(of(MOCK));

    await TestBed.configureTestingModule({
      imports: [TemplateListComponent],
      providers: [
        { provide: TemplatesApiService, useValue: api },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getTemplates on init', () => {
    expect(api.getTemplates).toHaveBeenCalledOnceWith();
  });

  it('should populate templates signal after load', () => {
    expect(component.templates()).toEqual(MOCK);
    expect(component.loading()).toBeFalse();
  });

  it('should render one li per template', () => {
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(2);
  });

  it('should set error signal when getTemplates fails', () => {
    api.getTemplates.and.returnValue(throwError(() => new Error('fail')));
    (component as any).load();
    expect(component.error()).toBe('Failed to load templates.');
    expect(component.loading()).toBeFalse();
  });

  it('should navigate to template editor when row clicked', () => {
    component.openTemplate(1);
    expect(router.navigate).toHaveBeenCalledWith(['/templates', 1]);
  });

  it('should navigate to /templates/new when create clicked', () => {
    component.createTemplate();
    expect(router.navigate).toHaveBeenCalledWith(['/templates', 'new']);
  });

  it('should set pendingDelete on confirmDelete', () => {
    component.confirmDelete(MOCK[0]);
    expect(component.pendingDelete()).toEqual(MOCK[0]);
  });

  it('should not call deleteTemplate on cancel', () => {
    component.confirmDelete(MOCK[0]);
    component.pendingDelete.set(null);
    expect(api.deleteTemplate).not.toHaveBeenCalled();
  });

  it('should remove template from list after executeDelete', () => {
    api.deleteTemplate.and.returnValue(of(undefined as void));
    component.confirmDelete(MOCK[0]);
    component.executeDelete();
    expect(component.templates().length).toBe(1);
    expect(component.templates()[0].id).toBe(2);
    expect(component.pendingDelete()).toBeNull();
  });

  it('should call deleteTemplate with correct id', () => {
    api.deleteTemplate.and.returnValue(of(undefined as void));
    component.confirmDelete(MOCK[1]);
    component.executeDelete();
    expect(api.deleteTemplate).toHaveBeenCalledWith(2);
  });
});
