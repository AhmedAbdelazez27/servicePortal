import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewFastingTentRequestComponent } from './view-fasting-tent-request.component';

describe('ViewFastingTentRequestComponent', () => {
  let component: ViewFastingTentRequestComponent;
  let fixture: ComponentFixture<ViewFastingTentRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewFastingTentRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewFastingTentRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
