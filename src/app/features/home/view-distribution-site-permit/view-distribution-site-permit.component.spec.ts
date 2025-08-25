import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewDistributionSitePermitComponent } from './view-distribution-site-permit.component';

describe('ViewDistributionSitePermitComponent', () => {
  let component: ViewDistributionSitePermitComponent;
  let fixture: ComponentFixture<ViewDistributionSitePermitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewDistributionSitePermitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewDistributionSitePermitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});


