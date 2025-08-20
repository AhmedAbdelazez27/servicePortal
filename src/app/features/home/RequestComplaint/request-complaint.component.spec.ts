import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestComplaintComponent } from './request-complaint.component';

describe('RequestComplaintComponent', () => {
  let component: RequestComplaintComponent;
  let fixture: ComponentFixture<RequestComplaintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestComplaintComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestComplaintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
