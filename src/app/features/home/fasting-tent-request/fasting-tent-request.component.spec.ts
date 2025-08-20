import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FastingTentRequestComponent } from './fasting-tent-request.component';

describe('FastingTentRequestComponent', () => {
  let component: FastingTentRequestComponent;
  let fixture: ComponentFixture<FastingTentRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FastingTentRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FastingTentRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
