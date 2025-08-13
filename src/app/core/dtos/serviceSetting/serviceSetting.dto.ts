import { AttachmentsConfigDto } from '../attachments/attachments-config.dto';

export interface ServiceDto {
  serviceId: number;
  serviceName?: string;
  serviceNameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  mainServiceClassificationId?: number;
  subServiceClassificationId?: number;
  serviceRefrenceNo?: string;
  serviceType?: number;
  serviceTypeName?: string;
  active?: boolean;
  lastModified?: Date;
  attributes?: AttributeDto[];
  serviceDepartments?: ServiceDepartmentDto[];
  attachmentsConfigs?: AttachmentsConfigDto[];
}

export interface CreateServiceDto {
  serviceName?: string;
  serviceNameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  mainServiceClassificationId?: number;
  subServiceClassificationId?: number;
  serviceRefrenceNo?: string;
  serviceType?: number;
  active?: boolean;
  attributes?: AttributeDto[];
  serviceDepartments?: ServiceDepartmentDto[];
}

export interface UpdateServiceDto {
  serviceId: number;
  serviceName?: string;
  serviceNameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  mainServiceClassificationId?: number;
  subServiceClassificationId?: number;
  serviceRefrenceNo?: string;
  serviceType?: number;
  active?: boolean;
  lastModified?: Date;
  attributes?: AttributeDto[];
  serviceDepartments?: ServiceDepartmentDto[];
  attachmentsConfigs?: AttachmentsConfigDto[];
}

export interface GetAllServicesParameters {
  skip: number;
  take: number;
  searchValue?: string;
  serviceRefrenceNo?: string;
  serviceType?: number;
  active?: boolean;
}

export interface PagedResultDto<T> {
  totalCount: number;
  data: T[];
}

// Attribute related DTOs
export interface AttributeDto {
  id: number;
  nameAr?: string;
  nameEn?: string;
  referenceAttributeType?: number;
  referenceAttributeId?: number;
  viewOrder?: number;
  attributeValues?: AttributeValueDto[];
}

export interface CreateAttributeDto {
  nameAr?: string;
  nameEn?: string;
  referenceAttributeType?: number;
  referenceAttributeId?: number;
  viewOrder?: number;
  attributeValues?: CreateAttributeValueDto[];
}

export interface UpdateAttributeDto {
  id: number;
  nameAr?: string;
  nameEn?: string;
  referenceAttributeType?: number;
  referenceAttributeId?: number;
  viewOrder?: number;
  attributeValues?: AttributeValueDto[];
}

export interface AttributeValueDto {
  id: number;
  valueAr?: string;
  valueEn?: string;
  viewOrder?: number;
  attributeId?: number;
}

export interface CreateAttributeValueDto {
  valueAr?: string;
  valueEn?: string;
  viewOrder?: number;
  attributeId?: number;
}

export interface UpdateAttributeValueDto {
  id: number;
  valueAr?: string;
  valueEn?: string;
  viewOrder?: number;
  attributeId?: number;
}

// Service Department related DTOs
export interface ServiceDepartmentDto {
  serviceDeptId: number;
  serviceId?: number;
  deptId?: number;
  serviceLevel?: number;
  lastModified?: Date;
  departmentAction?: number;
  departmentActionName?: string;
  stepName?: string;
  department?: DepartmentDto;
}

export interface CreateServiceDepartmentDto {
  serviceId?: number;
  deptId?: number;
  serviceLevel?: number;
  departmentAction?: number;
  stepName?: string;
}

export interface UpdateServiceDepartmentDto {
  serviceDeptId: number;
  serviceId?: number;
  deptId?: number;
  serviceLevel?: number;
  departmentAction?: number;
  stepName?: string;
}

export interface DepartmentDto {
  dept_ID: number;
  aname?: string;
  ename?: string;
  isActive?: boolean;
  last_Modify?: Date;
}

// Service Type Enum
export enum ServiceType {
  Individual = 1,
  Organization = 2,
}

// Reference Attribute Type Enum
export enum ReferenceAttributeType {
  Service = 1,
}

export interface ServiceTypeOption {
  value: number;
  label: string;
}

export const SERVICE_TYPE_OPTIONS: ServiceTypeOption[] = [
  { value: ServiceType.Individual, label: 'Individual' },
  { value: ServiceType.Organization, label: 'Organization' },
];
