import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstitutionregistrationComponent } from './institutionregistration.component';

describe('InstitutionregistrationComponent', () => {
  let component: InstitutionregistrationComponent;
  let fixture: ComponentFixture<InstitutionregistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionregistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstitutionregistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
