import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';

import { ContactUsComponent } from './contact-us.component';
import { ContactInformationService } from '../../../core/services/UserSetting/contact-information.service';
import { CreateContactInformationDto } from '../../../core/dtos/UserSetting/contact-information.dto';

describe('ContactUsComponent', () => {
  let component: ContactUsComponent;
  let fixture: ComponentFixture<ContactUsComponent>;
  let contactService: jasmine.SpyObj<ContactInformationService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let translate: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    const contactServiceSpy = jasmine.createSpyObj('ContactInformationService', ['createContactInformation']);
    const toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);

    await TestBed.configureTestingModule({
      imports: [
        ContactUsComponent,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        ToastrModule.forRoot()
      ],
      providers: [
        { provide: ContactInformationService, useValue: contactServiceSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: TranslateService, useValue: translateSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContactUsComponent);
    component = fixture.componentInstance;
    contactService = TestBed.inject(ContactInformationService) as jasmine.SpyObj<ContactInformationService>;
    toastr = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
    translate = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize contact form with correct validators', () => {
    expect(component.contactForm).toBeDefined();
    expect(component.contactForm.get('name')?.hasError('required')).toBeTruthy();
    expect(component.contactForm.get('email')?.hasError('required')).toBeTruthy();
    expect(component.contactForm.get('message')?.hasError('required')).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.contactForm.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should submit form successfully', () => {
    // Arrange
    const formData = {
      name: 'Test User',
      email: 'test@example.com',
      title: 'Test Title',
      message: 'Test message'
    };
    
    component.contactForm.patchValue(formData);
    contactService.createContactInformation.and.returnValue(of({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      title: 'Test Title',
      message: 'Test message',
      creationDate: new Date()
    }));
    translate.instant.and.returnValue('Success message');

    // Act
    component.onSubmitContactForm();

    // Assert
    expect(contactService.createContactInformation).toHaveBeenCalledWith(jasmine.objectContaining(formData));
    expect(toastr.success).toHaveBeenCalled();
  });

  it('should handle form submission error', () => {
    // Arrange
    const formData = {
      name: 'Test User',
      email: 'test@example.com',
      title: 'Test Title',
      message: 'Test message'
    };
    
    component.contactForm.patchValue(formData);
    contactService.createContactInformation.and.returnValue(throwError(() => new Error('API Error')));
    translate.instant.and.returnValue('Error message');

    // Act
    component.onSubmitContactForm();

    // Assert
    expect(contactService.createContactInformation).toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalled();
  });

  it('should not submit invalid form', () => {
    // Arrange
    component.contactForm.patchValue({
      name: '',
      email: 'invalid-email',
      message: ''
    });

    // Act
    component.onSubmitContactForm();

    // Assert
    expect(contactService.createContactInformation).not.toHaveBeenCalled();
    expect(component.contactForm.get('name')?.touched).toBeTruthy();
    expect(component.contactForm.get('email')?.touched).toBeTruthy();
    expect(component.contactForm.get('message')?.touched).toBeTruthy();
  });

  it('should reset form after successful submission', () => {
    // Arrange
    const formData = {
      name: 'Test User',
      email: 'test@example.com',
      title: 'Test Title',
      message: 'Test message'
    };
    
    component.contactForm.patchValue(formData);
    contactService.createContactInformation.and.returnValue(of({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      title: 'Test Title',
      message: 'Test message',
      creationDate: new Date()
    }));
    translate.instant.and.returnValue('Success message');

    // Act
    component.onSubmitContactForm();

    // Assert
    expect(component.contactForm.get('name')?.value).toBe('');
    expect(component.contactForm.get('email')?.value).toBe('');
    expect(component.contactForm.get('title')?.value).toBe('');
    expect(component.contactForm.get('message')?.value).toBe('');
  });
});
