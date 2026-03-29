import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RunListComponent } from './run-list.component';
import { InstancesApiService } from '../../../services/instances-api.service';
import { InstanceSummary } from '../../../models/api.models';

const MOCK_RUNS: InstanceSummary[] = [
  {
    id: 1,
    name: 'Deploy v2.0',
    status: 'IN_PROGRESS',
    createdAt: '',
    progress: { completed: 2, total: 5 },
    nextStep: { id: 3, title: 'Health check' },
  },
  {
    id: 2,
    name: 'Rollback v1.9',
    status: 'COMPLETED',
    createdAt: '',
    progress: { completed: 3, total: 3 },
    nextStep: null,
  },
];

describe('RunListComponent', () => {
  let fixture: ComponentFixture<RunListComponent>;
  let component: RunListComponent;
  let api: jasmine.SpyObj<InstancesApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('InstancesApiService', ['getInstances']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    api.getInstances.and.returnValue(of(MOCK_RUNS));

    await TestBed.configureTestingModule({
      imports: [RunListComponent],
      providers: [
        { provide: InstancesApiService, useValue: api },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RunListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getInstances on init', () => {
    expect(api.getInstances).toHaveBeenCalledOnceWith();
  });

  it('should populate runs signal after load', () => {
    expect(component.runs()).toEqual(MOCK_RUNS);
    expect(component.loading()).toBeFalse();
  });

  it('should render one row per run', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('li button');
    expect(buttons.length).toBe(MOCK_RUNS.length);
  });

  it('should set error signal when getInstances fails', () => {
    api.getInstances.and.returnValue(throwError(() => new Error('fail')));
    component.load();
    expect(component.error()).toBe('Failed to load runs.');
    expect(component.loading()).toBeFalse();
  });

  it('should render empty state when API returns empty array', async () => {
    api.getInstances.and.returnValue(of([]));
    component.load();
    fixture.detectChanges();
    expect(component.runs().length).toBe(0);
  });

  it('should navigate to run execution screen on row click', () => {
    component.openRun(1);
    expect(router.navigate).toHaveBeenCalledWith(['/runs', 1]);
  });

  it('should navigate to /runs/new on startRun', () => {
    component.startRun();
    expect(router.navigate).toHaveBeenCalledWith(['/runs', 'new']);
  });

  it('should return correct status classes', () => {
    expect(component.statusClass('COMPLETED')).toContain('green');
    expect(component.statusClass('ABANDONED')).toContain('red');
    expect(component.statusClass('IN_PROGRESS')).toContain('blue');
  });
});
