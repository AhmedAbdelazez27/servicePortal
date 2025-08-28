import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { InitiativeDetailsComponent } from './initiative-details.component';
import { InitiativeService } from '../../../core/services/initiative.service';
import { TranslationService } from '../../../core/services/translation.service';

describe('InitiativeDetailsComponent', () => {
  let component: InitiativeDetailsComponent;
  let fixture: ComponentFixture<InitiativeDetailsComponent>;
  let mockInitiativeService: jasmine.SpyObj<InitiativeService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;

  beforeEach(async () => {
    const initiativeServiceSpy = jasmine.createSpyObj('InitiativeService', ['getById']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('1')
        }
      }
    });
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    const translationServiceSpy = jasmine.createSpyObj('TranslationService', [], {
      currentLang: 'en'
    });

    await TestBed.configureTestingModule({
      imports: [InitiativeDetailsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: InitiativeService, useValue: initiativeServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy }
      ]
    }).compileComponents();

    mockInitiativeService = TestBed.inject(InitiativeService) as jasmine.SpyObj<InitiativeService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockActivatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
    mockTranslateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
    mockTranslationService = TestBed.inject(TranslationService) as jasmine.SpyObj<TranslationService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InitiativeDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initiative details on init', () => {
    const mockInitiative = {
      id: 1,
      nameAr: 'مبادرة تجريبية',
      nameEn: 'Test Initiative',
      descriptionAr: 'وصف المبادرة',
      descriptionEn: 'Initiative description',
      initiativeDate: new Date(),
      isActive: true,
      targetGroup: 'General Public',
      initiativeDetails: []
    };

    mockInitiativeService.getById.and.returnValue(of(mockInitiative));

    fixture.detectChanges();

    expect(mockInitiativeService.getById).toHaveBeenCalledWith(1);
    expect(component.initiative).toEqual(mockInitiative);
    expect(component.loading).toBeFalse();
  });

  it('should handle error when initiative not found', () => {
    mockInitiativeService.getById.and.returnValue(of(null));

    fixture.detectChanges();

    expect(component.initiative).toBeNull();
    expect(component.loading).toBeFalse();
  });

  it('should handle service error', () => {
    mockInitiativeService.getById.and.throwError('Service error');

    fixture.detectChanges();

    expect(component.error).toBe('ERRORS.FAILED_LOAD_INITIATIVE_DETAILS');
    expect(component.loading).toBeFalse();
  });

  it('should navigate back to initiatives', () => {
    component.onBackToInitiatives();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/initiatives']);
  });

  it('should navigate back to home', () => {
    component.onBackToHome();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to services on request service', () => {
    component.onRequestService();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/services']);
  });
});
