import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndividualregistrationComponent } from './individualregistration.component';

describe('IndividualregistrationComponent', () => {
  let component: IndividualregistrationComponent;
  let fixture: ComponentFixture<IndividualregistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndividualregistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndividualregistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
