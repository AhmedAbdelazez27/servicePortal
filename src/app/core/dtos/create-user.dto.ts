export interface CreateUserDto {
  userName: string;
  password: string;
  confirmPassword: string;
  userType: number;
  name?: string;
  nameEn?: string;
  telNumber?: string;
  address?: string;
  gender?: number;
  cityId?: string;
  countryId?: string;
  entityIdInfo?: string;
  phoneNumber?: string;
  email?: string;
  foundationType?: string;
  foundationName?: string;
  licenseNumber?: string;
  licenseEndDate?: Date;
  civilId?: string;
  fax?: string;
  boxNo?: string;
  entityId?: string;
  applyDate?: Date;
  userStatus?: number;
  serviceType?: number;
  roles?: string[];
  attachments?: AttachmentBase64Dto[];
}

export interface UpdateUserDto {
  id: string;
  userName: string;
  phoneNumber: string;
  roles: string[];
}

export interface AttachmentBase64Dto {
  fileBase64: string;
  fileName: string;
  masterId: number;
  attConfigID: number;
}