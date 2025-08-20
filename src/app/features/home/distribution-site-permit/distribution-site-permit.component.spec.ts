import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DistributionSitePermitComponent } from './distribution-site-permit.component';

describe('DistributionSitePermitComponent', () => {
  let component: DistributionSitePermitComponent;
  let fixture: ComponentFixture<DistributionSitePermitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistributionSitePermitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DistributionSitePermitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
