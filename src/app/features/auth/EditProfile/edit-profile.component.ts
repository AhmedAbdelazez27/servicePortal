import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
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
  
  // Edit mode states for different sections
  isBasicInfoEditMode: boolean = false;
  isContactAddressEditMode: boolean = false;
  isAttachmentsEditMode: boolean = false;
  showPasswordModal: boolean = false;
  
  // Profile photo
  selectedProfilePhoto: File | null = null;
  profilePhotoPreview: string | null = null;
  
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
  attachmentConfigsProfileImage: AttachmentsConfigDto[] = [];
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
      idNumberIssueDate: [null],
      idNumberExpiryDate: [null],
      dateOfBirth: [null],
      
      // Institution specific fields
      foundationType: [''],
      foundationName: [''],
      licenseNumber: [''],
      licenseEndDate: [null],
      entityId: [null],
      
      // Contact Information
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [this.uaeMobileValidator.bind(this)]], // Optional field
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
      const userResponse = await this.userService.getUserProfileById().toPromise();
      this.loadDropdownData();
      
      if (userResponse) {
        this.userData = userResponse;
        this.userType = userResponse.userType || 1;
        this.userMasterId = userResponse.masterId || null; // Extract master ID from response

        this.populateForm(userResponse);
        
        // Load attachment configs based on user type (for attachments section)
        await this.loadAttachmentConfigs();
        
        // Load profile image configs (for profile photo)
        await this.loadAttachmentConfigsProfileImage();
        
        // Check if attachments are included in user data
        if (userResponse.attachments && userResponse.attachments.length > 0) {
          this.loadAttachmentsFromUserData(userResponse.attachments);
        } else {
          // await this.loadExistingAttachments();
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
      idNumberIssueDate: userData.idNumberIssueDate ? new Date(userData.idNumberIssueDate).toISOString().split('T')[0] : null,
      idNumberExpiryDate: userData.idNumberExpiryDate ? new Date(userData.idNumberExpiryDate).toISOString().split('T')[0] : null,
      dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split('T')[0] : null,
      foundationType: userData.foundationType || '',
      foundationName: userData.foundationName || '',
      licenseNumber: userData.licenseNumber || '',
      licenseEndDate: userData.licenseEndDate ? new Date(userData.licenseEndDate).toISOString().split('T')[0] : null,
      entityId: userData.entityId || null,
      email: userData.email || '',
      phoneNumber: this.stripCountryCode(userData.phoneNumber || ''),
      telNumber: userData.telNumber || '',
      countryId: userData.countryId || null,
      cityId: userData.cityId || null,
      address: userData.address || '',
      poBox: userData.boxNo || '',
      userType: userData.userType || 1,
      serviceType: userData.serviceType || 1,
      userStatus: userData.userStatus || 1,
    });

    // Disable all form fields initially (view mode)
    this.setAllFieldsDisabled();
  }

  private setAllFieldsDisabled(): void {
    // Disable basic info fields (gender is now read-only)
    this.setFormFieldsEnabled(['nameEn', 'name', 'userName', 'civilId', 'foundationType', 'foundationName', 'licenseNumber', 'licenseEndDate', 'entityId'], false);
    
    // Disable contact and address fields (including email and date fields)
    this.setFormFieldsEnabled(['email', 'phoneNumber', 'telNumber', 'countryId', 'cityId', 'address', 'poBox', 'idNumberIssueDate', 'idNumberExpiryDate', 'dateOfBirth'], false);
  }

  private updateFormValidators(userType: number): void {
    const isInstitution = userType === 2; // Institution type
    
    // Get form controls
    const foundationTypeControl = this.profileForm.get('foundationType');
    const foundationNameControl = this.profileForm.get('foundationName');
    const licenseNumberControl = this.profileForm.get('licenseNumber');
    const licenseEndDateControl = this.profileForm.get('licenseEndDate');
    const entityIdControl = this.profileForm.get('entityId');

    if (isInstitution) {
      // Institution validators
      foundationTypeControl?.setValidators([Validators.required, Validators.minLength(2)]);
      foundationNameControl?.setValidators([Validators.required, Validators.minLength(2)]);
      licenseNumberControl?.setValidators([Validators.required, Validators.minLength(5)]);
      licenseEndDateControl?.setValidators([Validators.required]);
      entityIdControl?.setValidators([Validators.required]);
    } else {
      // Individual validators - gender is now read-only, so no validators needed
      foundationTypeControl?.clearValidators();
      foundationNameControl?.clearValidators();
      licenseNumberControl?.clearValidators();
      licenseEndDateControl?.clearValidators();
      entityIdControl?.clearValidators();
    }

    // Update validity
    [foundationTypeControl, foundationNameControl, 
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
        const newGenderOptions = (response || []).map((opt: any) => ({
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
    const configType = (this.userType === 2 || this.userType === 3)
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

  private async loadAttachmentConfigsProfileImage(): Promise<void> {
    try {
      const configs = await this.attachmentService.getAttachmentsConfigByType(
        AttachmentsConfigType.ProfileImage,
        true,  // active: true
        null   // mandatory: null
      ).toPromise();
      this.attachmentConfigsProfileImage = configs || [];
    } catch (error) {
      this.attachmentConfigsProfileImage = [];
    }
  }

  /**
   * Load attachments directly from user data response
   */
  private loadAttachmentsFromUserData(attachments: any[]): void {
    
    // Map attachments by config ID
    // Note: Backend provides full URLs in imgPath like "https://localhost:7156/Uploads/5/47/filename.jpg"
    const profileConfig = this.getPreferredProfileImageConfig();
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
          
          // Special handling for profile photo (use profile config id)
          const isProfileAttachment = !!profileConfig && attachment.attConfigID === profileConfig.id;
          if (isProfileAttachment) {
            this.profilePhotoPreview = imageUrl;
          }
        }
      }
    });


    // Sync profile photo display after loading attachments
    this.syncProfilePhotoFromAttachments();
  }

  /**
   * Trigger file input click programmatically
   */
  triggerFileInput(configId: number): void {
    // Only allow file selection in edit mode
    if (!this.isAttachmentsEditMode) {
      this.toastr.warning(
        this.translate.instant('EDIT_PROFILE.ENTER_EDIT_MODE_FIRST'), 
        this.translate.instant('TOAST.TITLE.WARNING')
      );
      return;
    }
    
    const fileInput = document.getElementById(`file-${configId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any, configId: number): void {
    // Only allow file selection in edit mode
    if (!this.isAttachmentsEditMode) {
      this.toastr.warning(
        this.translate.instant('EDIT_PROFILE.ENTER_EDIT_MODE_FIRST'), 
        this.translate.instant('TOAST.TITLE.WARNING')
      );
      return;
    }
    
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
    
    // Show confirmation dialog for all attachments (mandatory and optional)
    const confirmMessage = this.translate.instant('EDIT_PROFILE.CONFIRM_DELETE_ATTACHMENT');
    if (confirm(confirmMessage)) {
      // Mark for deletion (will be processed during form submission)
      this.attachmentsToDelete[configId] = existingAttachment.id;
      
      // Remove from UI - this will show the upload area
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
   * View attachment in new window/tab
   */
  viewAttachment(configId: number): void {
    const attachment = this.existingAttachments[configId];
    if (attachment && attachment.imgPath) {
      const imageUrl = this.constructImageUrl(attachment.imgPath);
      window.open(imageUrl, '_blank');
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
  async handleAttachmentOperations(): Promise<void> {
    const attachmentPromises: Promise<any>[] = [];
    
    // First handle deletions
    if (Object.keys(this.attachmentsToDelete).length > 0) {
      try {
        await this.deleteAttachments();
      } catch (error) {
        this.toastr.error(
          this.translate.instant('EDIT_PROFILE.ATTACHMENT_DELETE_ERROR'), 
          this.translate.instant('TOAST.TITLE.ERROR')
        );
        throw error;
      }
    }
    
    // Then handle new file uploads and updates
    for (const [configId, file] of Object.entries(this.selectedFiles)) {
      const configIdNum = parseInt(configId);
      const existingAttachment = this.existingAttachments[configIdNum];
      
      if (existingAttachment) {
        // Update existing attachment - always use userMasterId from current user data
        const updateAttachmentDto = {
          id: existingAttachment.id,
          fileBase64: await this.fileToBase64(file as File),
          fileName: (file as File).name,
          masterId: this.userMasterId || existingAttachment.masterId || 0, // Prioritize current userMasterId
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
    
    // Clear deletion tracking after successful operations
    this.attachmentsToDelete = {};
  }

  async onSubmit(isChangePassword:boolean = false): Promise<void> {
    this.submitted = true;

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      
      this.toastr.error(this.translate.instant('EDIT_PROFILE.VALIDATION_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    // Validate required attachments (consider selectedProfilePhoto too)
    if (!this.validateRequiredAttachments() && !isChangePassword) {
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
      // Get form values using getRawValue() to include disabled fields
      const formData = this.profileForm.getRawValue();
      
      // Prepare update payload
      const updatePayload: any = {
        id: this.userId,
        userName: formData.userName,
        name: formData.name,
        nameEn: formData.nameEn,
        email: formData.email,
        phoneNumber: `971${formData.phoneNumber}`, // Add 971 prefix
        telNumber: formData.telNumber,
        address: formData.address,
        cityId: formData.cityId,
        countryId: formData.countryId,
        boxNo: formData.poBox,
        civilId: formData.civilId,
        idNumberIssueDate: formData.idNumberIssueDate,
        idNumberExpiryDate: formData.idNumberExpiryDate,
        dateOfBirth: formData.dateOfBirth,
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
        // Individual fields - gender is read-only, so we don't update it
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

      // Handle profile photo if selected (ensure config and save/update)
      if (this.selectedProfilePhoto) {
        try {
          await this.ensureProfileImageConfigLoaded();
          await this.handleProfilePhotoAttachmentUpdate();
        } catch (error: any) {
          const errorMessage = error?.message || this.translate.instant('EDIT_PROFILE.PROFILE_PHOTO_UPDATE_ERROR');
          this.toastr.error(errorMessage, this.translate.instant('TOAST.TITLE.ERROR'));
          throw error;
        }
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
      if (field.errors['invalidUaeMobile']) return this.translate.instant('CONTACT.MOBILE_INVALID');
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
      return attachment.imgPath.split('/').pop() || this.translate.instant('EDIT_PROFILE.FILE');
    }
    return this.translate.instant('EDIT_PROFILE.FILE');
  }

  getExistingFileDate(configId: number): string {
    const attachment = this.existingAttachments[configId];
    if (attachment && attachment.lastModified) {
      return attachment.lastModified.toString();
    }
    return new Date().toISOString();
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '-';
    }
  }

  getExistingAttachments(): any[] {
    // Return configs that have existing files OR new files selected
    // This ensures newly uploaded files are visible
    return this.attachmentConfigs.filter(config => 
      this.hasExistingFile(config.id) || this.hasNewFile(config.id)
    );
  }

  getAttachmentConfigsNeedingUpload(): any[] {
    // Only show upload areas for configs that:
    // 1. Don't have existing files from backend
    // 2. Are in edit mode
    // 3. Don't have new files selected (they will appear in existing attachments section)
    return this.attachmentConfigs.filter(config => 
      !this.hasExistingFile(config.id) && 
      this.isAttachmentsEditMode && 
      !this.hasNewFile(config.id)
    );
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
      return this.hasExistingFile(configId) ? this.translate.instant('EDIT_PROFILE.ATTACHMENT_STATUS.UPDATED') : this.translate.instant('EDIT_PROFILE.ATTACHMENT_STATUS.NEW');
    }
    if (this.hasExistingFile(configId)) {
      return this.translate.instant('EDIT_PROFILE.ATTACHMENT_STATUS.EXISTING');
    }
    return this.translate.instant('EDIT_PROFILE.ATTACHMENT_STATUS.NONE');
  }

  /**
   * Validate if all required attachments are present
   */
  validateRequiredAttachments(): boolean {
    const profileConfig = this.getPreferredProfileImageConfig();
    for (const config of this.attachmentConfigs) {
      const hasExisting = this.hasExistingFile(config.id);
      const hasNew = this.hasNewFile(config.id);
      const isProfileConfig = profileConfig ? config.id === profileConfig.id : false;
      const hasSelectedProfile = isProfileConfig ? !!this.selectedProfilePhoto : false;
      if (this.isAttachmentRequired(config) && !hasExisting && !hasNew && !hasSelectedProfile) {
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

  // Edit mode management methods
  toggleBasicInfoEditMode(): void {
    this.isBasicInfoEditMode = !this.isBasicInfoEditMode;
    // Exclude the always-disabled fields from being enabled
    this.setFormFieldsEnabled(['foundationType', 'foundationName', 'licenseNumber', 'licenseEndDate', 'entityId'], this.isBasicInfoEditMode);
  }

  toggleContactAddressEditMode(): void {
    this.isContactAddressEditMode = !this.isContactAddressEditMode;
    this.setFormFieldsEnabled(['email', 'phoneNumber', 'telNumber', 'countryId', 'cityId', 'address', 'poBox', 'idNumberIssueDate', 'idNumberExpiryDate', 'dateOfBirth'], this.isContactAddressEditMode);
  }

  toggleAttachmentsEditMode(): void {
    this.isAttachmentsEditMode = !this.isAttachmentsEditMode;
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    // Clear password fields
    this.profileForm.patchValue({
      currentPassword: '',
      password: '',
      confirmPassword: ''
    });
  }

  async saveBasicInfo(): Promise<void> {
    if (this.validateSection(['nameEn', 'name', 'userName', 'civilId',  'entityId'])) {
      
      this.isLoading = true;
      this.spinnerService.show();

      try {
        // Get form values using getRawValue() to include disabled fields
        const formData = this.profileForm.getRawValue();
        
        // Prepare update payload with ALL fields from both sections
        const updatePayload: any = {
          id: this.userId,
          // Basic Information fields
          userName: formData.userName,
          name: formData.name,
          nameEn: formData.nameEn,
          civilId: formData.civilId,
          idNumberIssueDate: formData.idNumberIssueDate,
          idNumberExpiryDate: formData.idNumberExpiryDate,
          dateOfBirth: formData.dateOfBirth,
          userType: formData.userType,
          serviceType: formData.serviceType,
          userStatus: formData.userStatus,
          
          // Contact & Address Information fields
          email: formData.email,
          phoneNumber: `971${formData.phoneNumber}`, // Add 971 prefix
          telNumber: formData.telNumber,
          address: formData.address,
          cityId: formData.cityId,
          countryId: formData.countryId,
          boxNo: formData.poBox,
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
          // Individual fields - gender is read-only, so we don't update it
        }

        // Handle profile photo attachment update if there's a new photo
        if (this.selectedProfilePhoto) {
          try {
            await this.handleProfilePhotoAttachmentUpdate();
          } catch (error: any) {
            const errorMessage = error?.message || this.translate.instant('EDIT_PROFILE.PROFILE_PHOTO_UPDATE_ERROR');
            this.toastr.error(errorMessage, this.translate.instant('TOAST.TITLE.ERROR'));
            throw error;
          }
        }

        // Update user data
        await this.userService.updateUser(updatePayload).toPromise();
        
        this.isBasicInfoEditMode = false;
        this.setFormFieldsEnabled(['nameEn', 'name', 'userName', 'civilId', 'foundationType', 'foundationName', 'licenseNumber', 'licenseEndDate', 'entityId'], false);
        
        // Reload user data to reflect changes
        await this.loadUserData();
        
        this.toastr.success(this.translate.instant('EDIT_PROFILE.BASIC_INFO_SAVED'), this.translate.instant('TOAST.TITLE.SUCCESS'));
      } catch (error) {
        this.toastr.error(this.translate.instant('EDIT_PROFILE.UPDATE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      } finally {
        this.isLoading = false;
        this.spinnerService.hide();
      }
    }
  }

  async saveContactAddress(): Promise<void> {
    if (this.validateSection(['email', 'phoneNumber', 'telNumber', 'countryId', 'cityId', 'address', 'poBox', 'idNumberIssueDate', 'idNumberExpiryDate', 'dateOfBirth'])) {
      this.isLoading = true;
      this.spinnerService.show();

      try {
        // Get form values using getRawValue() to include disabled fields
        const formData = this.profileForm.getRawValue();
        
        // Prepare update payload with ALL fields from both sections
        const updatePayload: any = {
          id: this.userId,
          // Basic Information fields
          userName: formData.userName,
          name: formData.name,
          nameEn: formData.nameEn,
          civilId: formData.civilId,
          idNumberIssueDate: formData.idNumberIssueDate,
          idNumberExpiryDate: formData.idNumberExpiryDate,
          dateOfBirth: formData.dateOfBirth,
          userType: formData.userType,
          serviceType: formData.serviceType,
          userStatus: formData.userStatus,
          
          // Contact & Address Information fields
          email: formData.email,
          phoneNumber: `971${formData.phoneNumber}`, // Add 971 prefix
          telNumber: formData.telNumber,
          address: formData.address,
          cityId: formData.cityId,
          countryId: formData.countryId,
          boxNo: formData.poBox,
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
          // Individual fields - gender is read-only, so we don't update it
        }

        // Update user data
        await this.userService.updateUser(updatePayload).toPromise();
        
        this.isContactAddressEditMode = false;
        this.setFormFieldsEnabled(['email', 'phoneNumber', 'telNumber', 'countryId', 'cityId', 'address', 'poBox'], false);
        
        // Reload user data to reflect changes
        await this.loadUserData();
        
        this.toastr.success(this.translate.instant('EDIT_PROFILE.CONTACT_ADDRESS_SAVED'), this.translate.instant('TOAST.TITLE.SUCCESS'));
      } catch (error) {
        this.toastr.error(this.translate.instant('EDIT_PROFILE.UPDATE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      } finally {
        this.isLoading = false;
        this.spinnerService.hide();
      }
    }
  }

  cancelBasicInfo(): void {
    this.isBasicInfoEditMode = false;
    this.setFormFieldsEnabled(['foundationType', 'foundationName', 'licenseNumber', 'licenseEndDate', 'entityId'], false);
    
    // Restore original profile photo if user cancelled
    if (this.selectedProfilePhoto) {
      this.selectedProfilePhoto = null;
      this.profilePhotoPreview = null;
    }
    
    // Restore original values
    this.populateForm(this.userData);
  }

  cancelContactAddress(): void {
    this.isContactAddressEditMode = false;
    this.setFormFieldsEnabled(['email', 'phoneNumber', 'telNumber', 'countryId', 'cityId', 'address', 'poBox', 'idNumberIssueDate', 'idNumberExpiryDate', 'dateOfBirth'], false);
    // Restore original values
    this.populateForm(this.userData);
  }

  private setFormFieldsEnabled(fieldNames: string[], enabled: boolean): void {
    fieldNames.forEach(fieldName => {
      const control = this.profileForm.get(fieldName);
      if (control) {
        // Always keep these fields disabled regardless of edit mode
        if (['nameEn', 'name', 'userName', 'civilId', 'gender', 'entityId'].includes(fieldName)) {
          control.disable();
        } else {
          if (enabled) {
            control.enable();
          } else {
            control.disable();
          }
        }
      }
    });
  }

  private validateSection(fieldNames: string[]): boolean {
    let isValid = true;
    fieldNames.forEach(fieldName => {
      const control = this.profileForm.get(fieldName);
      if (control) {
        control.markAsTouched();
        if (control.invalid) {
          isValid = false;
        }
      }
    });
    
    if (!isValid) {
      this.toastr.error(this.translate.instant('EDIT_PROFILE.VALIDATION_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
    }
    
    return isValid;
  }

  // Profile photo methods
  onProfilePhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.validateAndSetProfilePhoto(file);
    }
  }

  private validateAndSetProfilePhoto(file: File): void {
    // File size validation (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.FILE_SIZE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      this.toastr.error(this.translate.instant('REGISTRATION.TOASTR.IMAGE_TYPE_ERROR'), this.translate.instant('TOAST.TITLE.ERROR'));
      return;
    }

    this.selectedProfilePhoto = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.profilePhotoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Method to handle profile photo attachment update
  private async handleProfilePhotoAttachmentUpdate(): Promise<void> {
    if (!this.userMasterId) {
      throw new Error('User master ID not available');
    }

    // Ensure profile image config is available, then determine preferred config (prioritize 1009)
    await this.ensureProfileImageConfigLoaded();
    const identityPhotoConfig = this.getPreferredProfileImageConfig();
    if (!identityPhotoConfig) {
      throw new Error('Identity photo attachment configuration not found. Please ensure profile image configuration exists.');
    }

    if (!this.selectedProfilePhoto) {
      return;
    }

    try {
      // Convert file to base64
      const fileBase64 = await this.fileToBase64(this.selectedProfilePhoto);
      
      // Check if there's an existing attachment to update
      const existingAttachment = this.existingAttachments[identityPhotoConfig.id];
      
      if (existingAttachment && existingAttachment.id) {
        // Update existing attachment - always use userMasterId from current user data
        const updateAttachmentDto = {
          id: existingAttachment.id,
          fileBase64: fileBase64,
          fileName: this.selectedProfilePhoto.name,
          masterId: this.userMasterId || existingAttachment.masterId || 0, // Prioritize current userMasterId
          attConfigID: identityPhotoConfig.id,
          masterType: AttachmentsConfigType.ProfileImage // 1009 for profile image
        };
        
        await this.attachmentService.updateAsync(updateAttachmentDto).toPromise();
      } else {
        // Create new attachment
        const newAttachmentDto = {
          fileBase64: fileBase64,
          fileName: this.selectedProfilePhoto.name,
          masterId: this.userMasterId,
          attConfigID: identityPhotoConfig.id,
          masterType: AttachmentsConfigType.ProfileImage // 1009 for profile image
        };
        
        await this.attachmentService.saveAttachmentFileBase64(newAttachmentDto).toPromise();
      }

      // Update the existing attachments and file previews after successful save
      // Reload will be handled by calling loadUserData()
      this.selectedProfilePhoto = null;
      
      // Notify UserService to update profile photo in navbar
      this.userService.notifyProfilePhotoUpdated();
      
      this.toastr.success(this.translate.instant('EDIT_PROFILE.PROFILE_PHOTO_UPDATED'), this.translate.instant('TOAST.TITLE.SUCCESS'));
      
    } catch (error: any) {
      const errorMessage = error?.error?.message || error?.message || 'Failed to update profile photo';
      throw new Error(errorMessage);
    }
  }

  // Method to sync profile photo display when attachments are loaded
  private syncProfilePhotoFromAttachments(): void {
    
    // Determine preferred profile image config (by attachmentsConfigType 1009)
    const identityPhotoConfig = this.getPreferredProfileImageConfig();

    // First try to find the profile photo using the attachment configuration
    if (identityPhotoConfig && this.existingAttachments[identityPhotoConfig.id]) {
      // Only update profile photo preview if user hasn't selected a new photo
      if (!this.selectedProfilePhoto) {
        const attachment = this.existingAttachments[identityPhotoConfig.id];
        if (attachment.imgPath) {
          const isImage = attachment.imgPath.match(/\.(jpg|jpeg|png|gif)$/i);
          if (isImage) {
            this.profilePhotoPreview = this.constructImageUrl(attachment.imgPath);
            return;
          }
        }
      }
    }
    
    // Fallback: If no config found or no attachment via config, try to find attachment directly by the resolved config id
    if (identityPhotoConfig && this.existingAttachments[identityPhotoConfig.id]) {
      const attachmentProfile = this.existingAttachments[identityPhotoConfig.id];
      if (attachmentProfile.imgPath && !this.selectedProfilePhoto) {
        const isImage = attachmentProfile.imgPath.match(/\.(jpg|jpeg|png|gif)$/i);
        if (isImage) {
          this.profilePhotoPreview = this.constructImageUrl(attachmentProfile.imgPath);
          return;
        }
      }
    }

  }

  triggerProfilePhotoInput(): void {
    const fileInput = document.getElementById('profilePhotoInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Debug method to manually set profile photo for testing
  debugSetProfilePhoto(): void {
    const config = this.getPreferredProfileImageConfig();
    const direct = config ? this.existingAttachments[config.id] : undefined;
    const attachment = (config && this.existingAttachments[config.id]) || direct;
    if (attachment) {
      if (attachment.imgPath) {
        this.profilePhotoPreview = this.constructImageUrl(attachment.imgPath);
      }
    } else {
    }
  }

  // Helper methods for dropdown display values
  getGenderDisplayValue(): string {
    const genderValue = this.profileForm.get('gender')?.value;
    const gender = this.genderOptions.find(g => g.id === genderValue);
    return gender?.text || '-';
  }

  getEntityDisplayValue(): string {
    const entityValue = this.profileForm.get('entityId')?.value;
    const entity = this.entities.find(e => e.id === entityValue);
    return entity?.text || '-';
  }

  getCountryDisplayValue(): string {
    const countryValue = this.profileForm.get('countryId')?.value;
    const country = this.countries.find(c => c.id === countryValue);
    return country?.text || '-';
  }

  getCityDisplayValue(): string {
    const cityValue = this.profileForm.get('cityId')?.value;
    const city = this.cities.find(c => c.id === cityValue);
    return city?.text || '-';
  }

  async saveAttachments(): Promise<void> {
    this.isLoading = true;
    this.spinnerService.show();

    try {
      await this.handleAttachmentOperations();
      this.toggleAttachmentsEditMode();
      
      this.toastr.success(
        this.translate.instant('EDIT_PROFILE.ATTACHMENTS_SAVED'), 
        this.translate.instant('TOAST.TITLE.SUCCESS')
      );
      
      // Reload the page after successful attachment operations
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Small delay to show the success message
      
    } catch (error) {
      this.toastr.error(
        this.translate.instant('EDIT_PROFILE.ATTACHMENT_SAVE_ERROR'), 
        this.translate.instant('TOAST.TITLE.ERROR')
      );
    } finally {
      this.isLoading = false;
      this.spinnerService.hide();
    }
  }

  // Custom validator for UAE mobile number format (9 digits starting with 5)
  private uaeMobileValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    
    // Validate 9 digits starting with 5
    const uaeMobileRegex = /^5[0-9]{8}$/;
    return uaeMobileRegex.test(control.value) ? null : { invalidUaeMobile: true };
  }

  // Restrict mobile input to only numbers (no + needed since +971 is fixed)
  restrictMobileInput(event: KeyboardEvent): void {
    const allowedChars = /[0-9]/;
    const key = event.key;
    
    // Allow backspace, delete, tab, escape, enter, and arrow keys
    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Tab' || 
        event.key === 'Escape' || event.key === 'Enter' || 
        event.key === 'ArrowLeft' || event.key === 'ArrowRight' || 
        event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      return;
    }
    
    if (!allowedChars.test(key)) {
      event.preventDefault();
    }
  }

  // Handle mobile number blur event to trigger validation
  onMobileNumberBlur(): void {
    const mobileControl = this.profileForm.get('phoneNumber');
    if (mobileControl && mobileControl.value) {
      // Trigger validation on blur
      mobileControl.markAsTouched();
    }
  }

  // Handle mobile number input event for real-time validation
  onMobileNumberInput(): void {
    const mobileControl = this.profileForm.get('phoneNumber');
    if (mobileControl && mobileControl.value) {
      // Trigger validation as user types
      mobileControl.markAsTouched();
    }
  }

  // Strip country code (971) from phone number for display
  private stripCountryCode(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    // Remove 971 prefix if present
    if (phoneNumber.startsWith('971')) {
      return phoneNumber.substring(3);
    }
    
    return phoneNumber;
  }

  // Helper: ensure profile image config is loaded
  private async ensureProfileImageConfigLoaded(): Promise<void> {
    if (!this.attachmentConfigsProfileImage || this.attachmentConfigsProfileImage.length === 0) {
      await this.loadAttachmentConfigsProfileImage();
    }
  }

  // Helper: get preferred profile image config (by attachmentsConfigType 1009)
  private getPreferredProfileImageConfig(): AttachmentsConfigDto | null {
    if (!this.attachmentConfigsProfileImage || this.attachmentConfigsProfileImage.length === 0) {
      return null;
    }
    
    
    // Find by type (1009) or enum value
    let config = this.attachmentConfigsProfileImage.find(c => {
      const configType = (c as any).attachmentsConfigType || (c as any).attachmentConfigType;
      return configType === AttachmentsConfigType.ProfileImage || configType === 1009;
    }) || null;
    
    if (config) {
      return config;
    }
    
    // Find by name fallback
    config = this.attachmentConfigsProfileImage.find(c => {
      const name = this.translate.currentLang === 'ar' ? c.name : c.nameEn;
      return name?.toLowerCase().includes('profile') || 
             name?.toLowerCase().includes('صورة') ||
             c.name === 'صورة شخصية' || 
             c.nameEn === 'Profile Image';
    }) || null;
    
    if (config) {
      return config;
    }
    
    // If still not found, return the first config as fallback
    if (this.attachmentConfigsProfileImage.length > 0) {
      return this.attachmentConfigsProfileImage[0];
    }
    
    return null;
  }
}
