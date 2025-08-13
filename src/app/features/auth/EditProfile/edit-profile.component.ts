import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

// Services
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { AttachmentService } from '../../../core/services/attachments/attachment.service';
import { Select2Service } from '../../../core/services/Select2.service';
import { environment } from '../../../../environments/environment';

// DTOs
import { CreateUserDto, AttachmentBase64Dto } from '../../../core/dtos/create-user.dto';
import { AttachmentsConfigDto, AttachmentsConfigType } from '../../../core/dtos/attachments/attachments-config.dto';
import { AttachmentDto } from '../../../core/dtos/attachments/attachment.dto';
import { FndLookUpValuesSelect2RequestDto } from '../../../core/dtos/FndLookUpValuesdtos/FndLookUpValues.dto';

// Validators
import { confirmPasswordValidator } from '../../../shared/customValidators/confirmPasswordValidator';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    RouterModule,
  ],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent implements OnInit {
  profileForm!: FormGroup;
  submitted: boolean = false;
  isLoading: boolean = false;
  isLoadingUserData: boolean = true;
  // Make attachments section read-only (preview only)
  attachmentsReadOnly: boolean = true;
  
  // User data
  userId: string | null = null;
  userData: any = null;
  userType: number = 1; // Will be set from user data
  userMasterId: number | null = null; // Master ID from user response
  
  // Dropdown data
  countries: any[] = [];
  cities: any[] = [];
  genderOptions: any[] = [];
  entities: any[] = [];
  
  // Pagination for dropdowns
  countriesLoading: boolean = false;
  citiesLoading: boolean = false;
  genderLoading: boolean = false;
  entitiesLoading: boolean = false;
  countriesHasMore: boolean = true;
  citiesHasMore: boolean = true;
  genderHasMore: boolean = true;
  entitiesHasMore: boolean = true;
  
  // Attachment data
  attachmentConfigs: AttachmentsConfigDto[] = [];
  selectedFiles: { [key: number]: File } = {};
  filePreviews: { [key: number]: string } = {};
  existingAttachments: { [key: number]: AttachmentDto } = {};
  attachmentsToDelete: { [key: number]: number } = {}; // Track attachments marked for deletion
  
  // Search parameters
  searchSelect2Params = new FndLookUpValuesSelect2RequestDto();
  
  // Date properties
  today = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
    public translate: TranslateService,
    private router: Router,
    private attachmentService: AttachmentService,
    private select2Service: Select2Service,
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      // Basic Information (Individual)
      nameEn: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      userName: ['', [Validators.required, Validators.minLength(3)]],
      gender: [null],
      civilId: ['', [Validators.required, Validators.minLength(10)]],
      
      // Institution specific fields
      foundationType: [''],
      foundationName: [''],
      licenseNumber: [''],
      licenseEndDate: [null],
      entityId: [null],
      
      // Contact Information
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.minLength(8)]],
      telNumber: ['', [Validators.minLength(8)]], // Optional
      
      // Address Information
      countryId: [null], // Optional
      cityId: [null, Validators.required],
      address: ['', [Validators.required, Validators.minLength(10)]],
      poBox: ['', [Validators.minLength(3)]], // Optional
      
      // Password fields (optional for update)
      currentPassword: [''],
      password: [''],
      confirmPassword: [''],
      
      // Hidden fields for API
      userType: [1],
      serviceType: [1],
      userStatus: [1],
    });

    // Set up conditional validators for password change
    this.setupPasswordValidators();
  }

  private setupPasswordValidators(): void {
    const currentPasswordControl = this.profileForm.get('currentPassword');
    const passwordControl = this.profileForm.get('password');
    const confirmPasswordControl = this.profileForm.get('confirmPassword');

    // Add validators when user wants to change password
    passwordControl?.valueChanges.subscribe((value) => {
      if (value) {
        currentPasswordControl?.setValidators([Validators.required]);
        passwordControl.setValidators([
          Validators.required,
          Validators.minLength(6),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/)
        ]);
        confirmPasswordControl?.setValidators([Validators.required]);
        
        // Add password match validator
        this.profileForm.setValidators(confirmPasswordValidator('password', 'confirmPassword'));
      } else {
        currentPasswordControl?.clearValidators();
        passwordControl.clearValidators();
        confirmPasswordControl?.clearValidators();
        this.profileForm.clearValidators();
      }
      
      currentPasswordControl?.updateValueAndValidity();
      passwordControl.updateValueAndValidity();
      confirmPasswordControl?.updateValueAndValidity();
    });
  }

  private async loadUserData(): Promise<void> {
    try {
      this.userId = this.authService.getUserId();
      
      if (!this.userId) {
        this.toastr.error(this.translate.instant('EDIT_PROFILE.USER_NOT_FOUND'), this.translate.instant('TOAST.TITLE.ERROR'));
        this.router.navigate(['/login']);
        return;
      }

      this.isLoadingUserData = true;
      this.spinnerService.show();

      // Load user data and dropdowns
      const userResponse = await this.userService.getUserById(this.userId).toPromise();
      this.loadDropdownData();
      
      if (userResponse) {
        this.userData = userResponse;
        this.userType = userResponse.userType || 1;
        this.userMasterId = userResponse.masterId || null; // Extract master ID from response

        this.populateForm(userResponse);
        await this.loadAttachmentConfigs();
        
        // Check if attachments are included in user data
        if (userResponse.attachments && userResponse.attachments.length > 0) {
          this.loadAttachmentsFromUserData(userResponse.attachments);
        } else {
          await this.loadExistingAttachments();
        }
      }

    } catch (error) {
      this.toastr.error(this.translate.instant('EDIT_PROFILE.LOAD_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
    } finally {
      this.isLoadingUserData = false;
      this.spinnerService.hide();
    }
  }

  private populateForm(userData: any): void {
    // Update form validators based on user type
    this.updateFormValidators(userData.userType);
    
    // Populate form with user data
    this.profileForm.patchValue({
      nameEn: userData.nameEn || '',
      name: userData.name || '',
      userName: userData.userName || '',
      gender: userData.gender !== undefined && userData.gender !== null ? String(userData.gender) : null,
      civilId: userData.civilId || '',
      foundationType: userData.foundationType || '',
      foundationName: userData.foundationName || '',
      licenseNumber: userData.licenseNumber || '',
      licenseEndDate: userData.licenseEndDate ? new Date(userData.licenseEndDate).toISOString().split('T')[0] : null,
      entityId: userData.entityId || null,
      email: userData.email || '',
      phoneNumber: userData.phoneNumber || '',
      telNumber: userData.telNumber || '',
      countryId: userData.countryId || null,
      cityId: userData.cityId || null,
      address: userData.address || '',
      poBox: userData.boxNo || '',
      userType: userData.userType || 1,
      serviceType: userData.serviceType || 1,
      userStatus: userData.userStatus || 1,
    });
  }

  private updateFormValidators(userType: number): void {
    const isInstitution = userType === 2; // Institution type
    
    // Get form controls
    const genderControl = this.profileForm.get('gender');
    const foundationTypeControl = this.profileForm.get('foundationType');
    const foundationNameControl = this.profileForm.get('foundationName');
    const licenseNumberControl = this.profileForm.get('licenseNumber');
    const licenseEndDateControl = this.profileForm.get('licenseEndDate');
    const entityIdControl = this.profileForm.get('entityId');

    if (isInstitution) {
      // Institution validators
      genderControl?.clearValidators();
      foundationTypeControl?.setValidators([Validators.required, Validators.minLength(2)]);
      foundationNameControl?.setValidators([Validators.required, Validators.minLength(2)]);
      licenseNumberControl?.setValidators([Validators.required, Validators.minLength(5)]);
      licenseEndDateControl?.setValidators([Validators.required]);
      entityIdControl?.setValidators([Validators.required]);
    } else {
      // Individual validators
      genderControl?.setValidators([Validators.required]);
      foundationTypeControl?.clearValidators();
      foundationNameControl?.clearValidators();
      licenseNumberControl?.clearValidators();
      licenseEndDateControl?.clearValidators();
      entityIdControl?.clearValidators();
    }

    // Update validity
    [genderControl, foundationTypeControl, foundationNameControl, 
     licenseNumberControl, licenseEndDateControl, entityIdControl].forEach(control => {
      control?.updateValueAndValidity();
    });
  }

  private async loadDropdownData(): Promise<void> {
    return new Promise((resolve) => {
      // Load all dropdown data
      this.fetchCountries();
      this.fetchCities();
      this.fetchGenderOptions();
      this.fetchEntities();
      resolve();
    });
  }

  private fetchCountries(): void {
    if (this.countriesLoading || !this.countriesHasMore) return;
    
    this.countriesLoading = true;
    const params = new FndLookUpValuesSelect2RequestDto();
    params.searchValue = '';
    params.skip = this.countries.length;
    params.take = 20;
    
    this.select2Service.getCountrySelect2(params).subscribe({
      next: (response: any) => {
        const newCountries = response?.results || [];
        this.countries = [...this.countries, ...newCountries];
        this.countriesHasMore = newCountries.length === params.take;
        this.countriesLoading = false;
      },
      error: (err: any) => {
        this.countriesLoading = false;
      }
    });
  }

  private fetchCities(): void {
    this.cities = [];
    this.citiesHasMore = true;
    this.loadMoreCities();
  }

  private loadMoreCities(): void {
    if (this.citiesLoading || !this.citiesHasMore) return;
    
    this.citiesLoading = true;
    const cityParams = new FndLookUpValuesSelect2RequestDto();
    cityParams.searchValue = '';
    cityParams.skip = this.cities.length;
    cityParams.take = 20;
    
    this.select2Service.getCitySelect2(cityParams).subscribe({
      next: (response: any) => {
        const newCities = response?.results || [];
        this.cities = [...this.cities, ...newCities];
        this.citiesHasMore = newCities.length === cityParams.take;
        this.citiesLoading = false;
      },
      error: (err: any) => {
        this.citiesLoading = false;
      }
    });
  }

  private fetchGenderOptions(): void {
    if (this.genderLoading || !this.genderHasMore) return;
    
    this.genderLoading = true;
    const genderParams = new FndLookUpValuesSelect2RequestDto();
    genderParams.searchValue = '';
    genderParams.skip = this.genderOptions.length;
    genderParams.take = 20;
    
    this.select2Service.getGenderSelect2(genderParams).subscribe({
      next: (response: any) => {
        const newGenderOptions = (response?.results || []).map((opt: any) => ({
          ...opt,
          id: String(opt.id)
        }));
        this.genderOptions = [...this.genderOptions, ...newGenderOptions];
        this.genderHasMore = newGenderOptions.length === genderParams.take;
        this.genderLoading = false;
      },
      error: (err: any) => {
        this.genderLoading = false;
      }
    });
  }

  private fetchEntities(): void {
    if (this.entitiesLoading || !this.entitiesHasMore) return;
    
    this.entitiesLoading = true;
    const params = new FndLookUpValuesSelect2RequestDto();
    params.searchValue = '';
    params.skip = this.entities.length;
    params.take = 20;
    
    this.select2Service.getEntitySelect2(params).subscribe({
      next: (response: any) => {
        const newEntities = response?.results || [];
        this.entities = [...this.entities, ...newEntities];
        this.entitiesHasMore = newEntities.length === params.take;
        this.entitiesLoading = false;
      },
      error: (err: any) => {
        this.entitiesLoading = false;
      }
    });
  }

  private async loadAttachmentConfigs(): Promise<void> {
    const configType = this.userType === 2 
      ? AttachmentsConfigType.FillInstitutionRegistrationData 
      : AttachmentsConfigType.FillOutPublicLoginData;

    try {
      const configs = await this.attachmentService.getAttachmentsConfigByType(
        configType,
        true,  // active: true
        null   // mandatory: null
      ).toPromise();
      this.attachmentConfigs = configs || [];
    } catch (error) {
      this.attachmentConfigs = [];
    }
  }

  /**
   * Load attachments directly from user data response
   */
  private loadAttachmentsFromUserData(attachments: any[]): void {
    // Map attachments by config ID
    // Note: Backend provides full URLs in imgPath like "https://localhost:7156/Uploads/5/47/filename.jpg"
    attachments.forEach(attachment => {
      if (attachment.attConfigID) {
        this.existingAttachments[attachment.attConfigID] = attachment;
        
        // Set preview for existing attachments
        if (attachment.imgPath) {
          // If it's an image, use the path; otherwise use a default file icon
          const isImage = attachment.imgPath.match(/\.(jpg|jpeg|png|gif)$/i);
          const imageUrl = isImage 
            ? this.constructImageUrl(attachment.imgPath)
            : 'assets/images/file.png';
          
          this.filePreviews[attachment.attConfigID] = imageUrl;
        }
      }
    });
  }

  private async loadExistingAttachments(): Promise<void> {
    if (!this.userMasterId || this.attachmentConfigs.length === 0) return;

    try {
      const masterType = this.userType === 2 
        ? AttachmentsConfigType.FillInstitutionRegistrationData 
        : AttachmentsConfigType.FillOutPublicLoginData;

      const attachments = await this.attachmentService.getListByMasterId(
        this.userMasterId,
        masterType
      ).toPromise() || [];

      // Map attachments by config ID
      // Note: Backend provides full URLs in imgPath like "https://localhost:7156/Uploads/5/47/filename.jpg"
      attachments.forEach(attachment => {
        if (attachment.attConfigID) {
          this.existingAttachments[attachment.attConfigID] = attachment;
          
          // Set preview for existing attachments
          if (attachment.imgPath) {
            // If it's an image, use the path; otherwise use a default file icon
            const isImage = attachment.imgPath.match(/\.(jpg|jpeg|png|gif)$/i);
            this.filePreviews[attachment.attConfigID] = isImage 
              ? this.constructImageUrl(attachment.imgPath)
              : 'assets/images/file.png';
          }
        }
      });
    } catch (error) {
      // Error loading existing attachments
    }
  }

  /**
   * Trigger file input click programmatically
   */
  triggerFileInput(configId: number): void {
    const fileInput = document.getElementById(`file-${configId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any, configId: number): void {
    const file = event.target.files[0];
    if (file) {
      this.validateAndSetFile(file, configId);
    }
  }

  private validateAndSetFile(file: File, configId: number): void {
    // File size validation (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.FILE_SIZE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.FILE_TYPE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    this.selectedFiles[configId] = file;
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.filePreviews[configId] = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.filePreviews[configId] = 'assets/images/file.png'; // Default file icon
    }
  }

  /**
   * Remove existing file with confirmation for optional attachments
   */
  removeExistingFile(configId: number): void {
    const existingAttachment = this.existingAttachments[configId];
    const config = this.attachmentConfigs.find(c => c.id === configId);
    
    if (!existingAttachment || !config) return;
    
    // For mandatory attachments, show warning and don't allow deletion
    if (this.isAttachmentRequired(config)) {
      this.toastr.warning(
        this.translate.instant('EDIT_PROFILE.MANDATORY_ATTACHMENT_WARNING'), 
        this.translate.instant('TOAST.TITLE.WARNING')
      );
      return;
    }
    
    // For optional attachments, show confirmation dialog
    const confirmMessage = this.translate.instant('EDIT_PROFILE.CONFIRM_DELETE_ATTACHMENT');
    if (confirm(confirmMessage)) {
      // Mark for deletion (will be processed during form submission)
      this.attachmentsToDelete[configId] = existingAttachment.id;
      
      // Remove from UI
      delete this.existingAttachments[configId];
      delete this.filePreviews[configId];
      
      // Reset file input
      const fileInput = document.getElementById(`file-${configId}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      this.toastr.success(
        this.translate.instant('EDIT_PROFILE.ATTACHMENT_MARKED_FOR_DELETION'), 
        this.translate.instant('TOAST.TITLE.SUCCESS')
      );
    }
  }

  /**
   * Remove new file selection (before upload)
   */
  removeFile(configId: number): void {
    delete this.selectedFiles[configId];
    
    // Reset the file input
    const fileInput = document.getElementById(`file-${configId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    // If there was an existing attachment, restore its preview
    if (this.existingAttachments[configId]) {
      const attachment = this.existingAttachments[configId];
      if (attachment.imgPath) {
        const isImage = attachment.imgPath.match(/\.(jpg|jpeg|png|gif)$/i);
        this.filePreviews[configId] = isImage 
          ? this.constructImageUrl(attachment.imgPath)
          : 'assets/images/file.png';
      }
    } else {
      delete this.filePreviews[configId];
    }
  }

  /**
   * Delete attachments from backend
   */
  private async deleteAttachments(): Promise<void> {
    const deletePromises: Promise<void>[] = [];
    
    for (const [configId, attachmentId] of Object.entries(this.attachmentsToDelete)) {
      deletePromises.push(
        this.attachmentService.deleteAsync(attachmentId).toPromise()
      );
    }
    
    if (deletePromises.length > 0) {
      try {
        await Promise.all(deletePromises);
        this.toastr.success(
          this.translate.instant('EDIT_PROFILE.ATTACHMENTS_DELETED'), 
          this.translate.instant('TOAST.TITLE.SUCCESS')
        );
      } catch (error) {
        console.error('Error deleting attachments:', error);
        this.toastr.error(
          this.translate.instant('EDIT_PROFILE.ATTACHMENT_DELETE_ERROR'), 
          this.translate.instant('TOAST.TITLE.ERROR')
        );
        throw error;
      }
    }
  }

  /**
   * Handle all attachment operations (create, update, delete)
   */
  private async handleAttachmentOperations(): Promise<void> {
    const attachmentPromises: Promise<any>[] = [];
    

    
    // Handle new file uploads and updates
    for (const [configId, file] of Object.entries(this.selectedFiles)) {
      const configIdNum = parseInt(configId);
      const existingAttachment = this.existingAttachments[configIdNum];
      
      if (existingAttachment) {
        // Update existing attachment - use existing masterId, not user ID
        const updateAttachmentDto = {
          id: existingAttachment.id,
          fileBase64: await this.fileToBase64(file as File),
          fileName: (file as File).name,
          masterId: existingAttachment.masterId || this.userMasterId || 0, // Use existing attachment's masterId or user masterId
          attConfigID: configIdNum
        };
        

        
        attachmentPromises.push(
          this.attachmentService.updateAsync(updateAttachmentDto).toPromise()
        );
      } else {
        // Create new attachment with user masterId from response
        const newAttachmentDto = {
          fileBase64: await this.fileToBase64(file as File),
          fileName: (file as File).name,
          masterId: this.userMasterId || 0, // Use user masterId from backend response
          attConfigID: configIdNum
        };
        

        
        attachmentPromises.push(
          this.attachmentService.saveAttachmentFileBase64(newAttachmentDto).toPromise()
        );
      }
    }

    // Execute all attachment operations
    if (attachmentPromises.length > 0) {
      try {
        await Promise.all(attachmentPromises);
        this.toastr.success(
          this.translate.instant('EDIT_PROFILE.ATTACHMENTS_UPDATED'), 
          this.translate.instant('TOAST.TITLE.SUCCESS')
        );
      } catch (attachmentError) {
        this.toastr.warning(
          this.translate.instant('EDIT_PROFILE.ATTACHMENT_SAVE_WARNING'), 
          this.translate.instant('TOAST.TITLE.WARNING')
        );
        throw attachmentError;
      }
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toastr.error(this.translate.instant('EDIT_PROFILE.VALIDATION_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    // Validate required attachments
    if (!this.validateRequiredAttachments()) {
      this.toastr.error(this.translate.instant('EDIT_PROFILE.REQUIRED_ATTACHMENTS_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    // Validate that we have masterId for attachment operations
    if ((Object.keys(this.selectedFiles).length > 0 || Object.keys(this.attachmentsToDelete).length > 0) && !this.userMasterId) {
      this.toastr.error(this.translate.instant('EDIT_PROFILE.MASTER_ID_MISSING'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    this.isLoading = true;
    this.spinnerService.show();

    try {
      const formData = this.profileForm.value;
      
      // Prepare update payload
      const updatePayload: any = {
        id: this.userId,
        userName: formData.userName,
        name: formData.name,
        nameEn: formData.nameEn,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        telNumber: formData.telNumber,
        address: formData.address,
        cityId: formData.cityId,
        countryId: formData.countryId,
        boxNo: formData.poBox,
        civilId: formData.civilId,
        userType: formData.userType,
        serviceType: formData.serviceType,
        userStatus: formData.userStatus,
      };

      // Add type-specific fields
      if (this.userType === 2) {
        // Institution fields
        updatePayload.foundationType = formData.foundationType;
        updatePayload.foundationName = formData.foundationName;
        updatePayload.licenseNumber = formData.licenseNumber;
        updatePayload.licenseEndDate = formData.licenseEndDate;
        updatePayload.entityId = formData.entityId;
      } else {
        // Individual fields
        updatePayload.gender = formData.gender !== undefined && formData.gender !== null ? Number(formData.gender) : null;
      }

      // Handle password change
      if (formData.password && formData.currentPassword) {
        const passwordChangePayload = {
          userId: this.userId,
          currentPassword: formData.currentPassword,
          newPassword: formData.password,
          confirmPassword: formData.confirmPassword
        };
        
        try {
          await this.userService.changeUserPassword(passwordChangePayload).toPromise();
          this.toastr.success(this.translate.instant('EDIT_PROFILE.PASSWORD_CHANGED'), this.translate.instant('TOAST.TITLE.SUCCESS'));
        } catch (passwordError) {
          this.toastr.error(this.translate.instant('EDIT_PROFILE.PASSWORD_CHANGE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
          throw passwordError;
        }
      }

      // Handle attachments - First delete marked attachments, then handle uploads/updates
      if (Object.keys(this.attachmentsToDelete).length > 0) {
        await this.deleteAttachments();
      }

      if (Object.keys(this.selectedFiles).length > 0) {
        await this.handleAttachmentOperations();
      }

      // Update user data
      await this.userService.updateUser(updatePayload).toPromise();
      
      this.toastr.success(this.translate.instant('EDIT_PROFILE.UPDATE_SUCCESS'), this.translate.instant('TOAST.TITLE.SUCCESS'));
      
      // Clear deletion tracking
      this.attachmentsToDelete = {};
      
      // Reload user data to reflect changes
      await this.loadUserData();

    } catch (error) {
      this.toastr.error(this.translate.instant('EDIT_PROFILE.UPDATE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
    } finally {
      this.isLoading = false;
      this.spinnerService.hide();
    }
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return this.translate.instant('VALIDATION.REQUIRED');
      if (field.errors['email']) return this.translate.instant('VALIDATION.EMAIL');
      if (field.errors['minlength']) return this.translate.instant('VALIDATION.MINLENGTH', { length: field.errors['minlength'].requiredLength });
      if (field.errors['pattern']) return this.translate.instant('VALIDATION.PATTERN');
      if (field.errors['mismatch']) return this.translate.instant('VALIDATION.PASSWORD_MISMATCH');
    }
    return '';
  }

  showPasswordMatch(): boolean {
    const pass = this.profileForm.get('password')?.value;
    const confirm = this.profileForm.get('confirmPassword')?.value;
    return pass && confirm && pass === confirm && 
           !this.profileForm.get('confirmPassword')?.errors?.['mismatch'];
  }

  getAttachmentDisplayName(config: AttachmentsConfigDto): string {
    return this.translate.currentLang === 'ar' ? config.name : (config.nameEn || config.name);
  }

  isAttachmentRequired(config: AttachmentsConfigDto): boolean {
    return config.mendatory || false;
  }

  hasExistingFile(configId: number): boolean {
    return !!this.existingAttachments[configId];
  }

  hasNewFile(configId: number): boolean {
    return !!this.selectedFiles[configId];
  }

  getExistingFileName(configId: number): string {
    const attachment = this.existingAttachments[configId];
    if (attachment && attachment.imgPath) {
      return attachment.imgPath.split('/').pop() || 'file';
    }
    return 'file';
  }

  // Date validation
  isLicenseDateValid(): boolean {
    const licenseEndDate = this.profileForm.get('licenseEndDate')?.value;
    if (!licenseEndDate) return true;
    
    const today = new Date();
    const licenseDate = new Date(licenseEndDate);
    return licenseDate > today;
  }

  // Infinite scroll handlers for ng-select
  onCountriesScrollToEnd(): void {
    this.fetchCountries();
  }

  onCitiesScrollToEnd(): void {
    this.loadMoreCities();
  }

  onGenderScrollToEnd(): void {
    this.fetchGenderOptions();
  }

  onEntitiesScrollToEnd(): void {
    this.fetchEntities();
  }

  // Utility methods
  isIndividualUser(): boolean {
    return this.userType === 1 || this.userType === 3;
  }

  isInstitutionUser(): boolean {
    return this.userType === 2;
  }

  cancelEdit(): void {
    this.router.navigate(['/home']);
  }

  /**
   * Handle image loading errors by setting fallback image
   */
  onImageError(event: any): void {
    event.target.src = 'assets/images/file.png';
  }

  /**
   * Expose Object.keys to template for debugging
   */
  get Object() {
    return Object;
  }

  /**
   * Check if an attachment has been modified (new file selected or existing file removed)
   */
  isAttachmentModified(configId: number): boolean {
    return this.hasNewFile(configId) || this.hasExistingFileRemoved(configId);
  }

  /**
   * Check if an existing attachment has been removed
   */
  hasExistingFileRemoved(configId: number): boolean {
    // Check if there was an existing attachment but it's no longer in the existingAttachments object
    // This would indicate it was removed by the user
    return false; // This would need to be tracked separately if needed
  }

  /**
   * Get the current attachment status for display
   */
  getAttachmentStatus(configId: number): string {
    if (this.hasNewFile(configId)) {
      return this.hasExistingFile(configId) ? 'UPDATED' : 'NEW';
    }
    if (this.hasExistingFile(configId)) {
      return 'EXISTING';
    }
    return 'NONE';
  }

  /**
   * Validate if all required attachments are present
   */
  validateRequiredAttachments(): boolean {
    for (const config of this.attachmentConfigs) {
      if (this.isAttachmentRequired(config) && !this.hasExistingFile(config.id) && !this.hasNewFile(config.id)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if an attachment can be deleted (only optional attachments)
   */
  canDeleteAttachment(configId: number): boolean {
    const config = this.attachmentConfigs.find(c => c.id === configId);
    return config ? !this.isAttachmentRequired(config) : false;
  }

  /**
   * Check if an attachment has been marked for deletion
   */
  isAttachmentMarkedForDeletion(configId: number): boolean {
    return configId in this.attachmentsToDelete;
  }

  /**
   * Builds a full image URL with cache-busting, handling both full URLs and relative paths
   */
  private constructImageUrl(imgPath: string): string {
    if (!imgPath) return '';

    // If it's already a full URL (starts with http:// or https://), return it directly with cache buster
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      const cacheBuster = `?t=${Date.now()}`;
      return `${imgPath}${cacheBuster}`;
    }

    // Handle relative paths
    const cleanPath = imgPath.startsWith('/') ? imgPath.substring(1) : imgPath;

    let baseUrl: string;
    if (cleanPath.startsWith('Uploads/')) {
      baseUrl = environment.apiBaseUrl.replace('/api', '');
    } else {
      baseUrl = environment.apiBaseUrl;
    }

    const fullUrl = `${baseUrl}/${cleanPath}`;
    const cacheBuster = `?t=${Date.now()}`;
    return `${fullUrl}${cacheBuster}`;
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }
}
