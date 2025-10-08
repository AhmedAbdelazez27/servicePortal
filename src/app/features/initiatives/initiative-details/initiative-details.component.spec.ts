import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { InitiativeDetailsComponent } from './initiative-details.component';
import { InitiativeService } from '../../../core/services/initiative.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { Select2Service } from '../../../core/services/Select2.service';
import { ChangeDetectorRef } from '@angular/core';

describe('InitiativeDetailsComponent', () => {
  let component: InitiativeDetailsComponent;
  let fixture: ComponentFixture<InitiativeDetailsComponent>;
  let mockInitiativeService: jasmine.SpyObj<InitiativeService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;
  let mockToastrService: jasmine.SpyObj<ToastrService>;
  let mockSelect2Service: jasmine.SpyObj<Select2Service>;
  let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;

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
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'currentLang', 'defaultLang', 'onLangChange']);
    const translationServiceSpy = jasmine.createSpyObj('TranslationService', [], {
      currentLang: 'en'
    });
    const toastrServiceSpy = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning', 'info']);
    const select2ServiceSpy = jasmine.createSpyObj('Select2Service', ['getRegions']);
    const changeDetectorRefSpy = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges', 'markForCheck']);

    await TestBed.configureTestingModule({
      imports: [InitiativeDetailsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: InitiativeService, useValue: initiativeServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy },
        { provide: ToastrService, useValue: toastrServiceSpy },
        { provide: Select2Service, useValue: select2ServiceSpy },
        { provide: ChangeDetectorRef, useValue: changeDetectorRefSpy }
      ]
    }).compileComponents();

    mockInitiativeService = TestBed.inject(InitiativeService) as jasmine.SpyObj<InitiativeService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockActivatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
    mockTranslateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
    mockTranslationService = TestBed.inject(TranslationService) as jasmine.SpyObj<TranslationService>;
    mockToastrService = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
    mockSelect2Service = TestBed.inject(Select2Service) as jasmine.SpyObj<Select2Service>;
    mockChangeDetectorRef = TestBed.inject(ChangeDetectorRef) as jasmine.SpyObj<ChangeDetectorRef>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InitiativeDetailsComponent);
    component = fixture.componentInstance;

    // Setup default mock behaviors
    mockTranslateService.currentLang = 'en';
    mockTranslateService.defaultLang = 'en';
    Object.defineProperty(mockTranslateService, 'onLangChange', {
      value: of({ lang: 'en' }),
      writable: true
    });
    mockTranslateService.instant.and.returnValue('Mocked Translation');
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
      targetGroupEn: 'General Public',
      initiativeDetails: []
    };

    mockInitiativeService.getById.and.returnValue(of(mockInitiative));

    fixture.detectChanges();

    expect(mockInitiativeService.getById).toHaveBeenCalledWith({
      id: 1,
      regionName: null
    });
    expect(component.initiative).toEqual(mockInitiative);
    expect(component.loading).toBeFalse();
  });

  it('should handle error when initiative not found', () => {
    mockInitiativeService.getById.and.returnValue(of(null as any));

    fixture.detectChanges();

    expect(mockInitiativeService.getById).toHaveBeenCalledWith({
      id: 1,
      regionName: null
    });
    expect(component.initiative).toBeNull();
    expect(component.loading).toBeFalse();
  });

  it('should handle service error', () => {
    mockInitiativeService.getById.and.returnValue(throwError(() => new Error('Service error')));

    fixture.detectChanges();

    expect(mockInitiativeService.getById).toHaveBeenCalledWith({
      id: 1,
      regionName: null
    });
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
