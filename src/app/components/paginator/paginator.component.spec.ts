import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent', () => {
  let fixture: ComponentFixture<PaginatorComponent>;
  let component: PaginatorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginatorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 5);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render navigation when totalPages > 1', () => {
    const nav = fixture.nativeElement.querySelector('nav');
    expect(nav).toBeTruthy();
  });

  it('should NOT render navigation when totalPages is 1', () => {
    fixture.componentRef.setInput('totalPages', 1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeFalsy();
  });

  it('should disable Prev button on first page', () => {
    fixture.componentRef.setInput('page', 1);
    fixture.detectChanges();
    const prev = fixture.nativeElement.querySelector('button[aria-label="Previous page"]');
    expect(prev.disabled).toBeTrue();
  });

  it('should NOT disable Prev button on page > 1', () => {
    fixture.componentRef.setInput('page', 2);
    fixture.detectChanges();
    const prev = fixture.nativeElement.querySelector('button[aria-label="Previous page"]');
    expect(prev.disabled).toBeFalse();
  });

  it('should disable Next button on last page', () => {
    fixture.componentRef.setInput('page', 5);
    fixture.detectChanges();
    const next = fixture.nativeElement.querySelector('button[aria-label="Next page"]');
    expect(next.disabled).toBeTrue();
  });

  it('should NOT disable Next button on page < totalPages', () => {
    fixture.componentRef.setInput('page', 4);
    fixture.detectChanges();
    const next = fixture.nativeElement.querySelector('button[aria-label="Next page"]');
    expect(next.disabled).toBeFalse();
  });

  it('should emit page - 1 when Prev is clicked', () => {
    fixture.componentRef.setInput('page', 3);
    fixture.detectChanges();
    spyOn(component.pageChange, 'emit');
    fixture.nativeElement.querySelector('button[aria-label="Previous page"]').click();
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });

  it('should emit page + 1 when Next is clicked', () => {
    fixture.componentRef.setInput('page', 3);
    fixture.detectChanges();
    spyOn(component.pageChange, 'emit');
    fixture.nativeElement.querySelector('button[aria-label="Next page"]').click();
    expect(component.pageChange.emit).toHaveBeenCalledWith(4);
  });

  it('should emit the page number when a page button is clicked', () => {
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 5);
    fixture.detectChanges();
    spyOn(component.pageChange, 'emit');
    const pageButtons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button[aria-label^="Page"]'),
    );
    pageButtons[1].click(); // second page button (page 2)
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });

  it('should mark only the current page as aria-current', () => {
    fixture.componentRef.setInput('page', 3);
    fixture.detectChanges();
    const current: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button[aria-current="page"]'),
    );
    expect(current.length).toBe(1);
    expect(current[0].getAttribute('aria-label')).toBe('Page 3');
  });

  it('should show at most 5 page buttons (2 delta each side)', () => {
    fixture.componentRef.setInput('page', 5);
    fixture.componentRef.setInput('totalPages', 20);
    fixture.detectChanges();
    const pageButtons = fixture.nativeElement.querySelectorAll('button[aria-label^="Page"]');
    expect(pageButtons.length).toBeLessThanOrEqual(5);
  });

  it('should show fewer page buttons near the start', () => {
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 10);
    fixture.detectChanges();
    const pageButtons = fixture.nativeElement.querySelectorAll('button[aria-label^="Page"]');
    // Pages 1–3 visible (page 1, +2 delta)
    expect(pageButtons.length).toBe(3);
  });
});
