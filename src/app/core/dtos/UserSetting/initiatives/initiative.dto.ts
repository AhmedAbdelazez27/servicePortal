import { AttachmentDto, AttachmentBase64Dto } from '../../attachments/attachment.dto';

export interface InitiativeDto {
  id: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  initiativeDate: Date;
  isActive: boolean;
  targetGroup: string;
  attachment?: AttachmentDto;
  initiativeDetails?: InitiativeDetailsDto[];
}

export interface CreateInitiativeDto {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  initiativeDate: Date;
  isActive: boolean;
  targetGroup: string;
  attachment?: AttachmentBase64Dto;
  initiativeDetails?: CreateInitiativeDetailsDto[];
}

export interface UpdateInitiativeDto {
  id: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  initiativeDate: Date;
  isActive: boolean;
  targetGroup: string;
  attachment?: AttachmentBase64Dto;
  initiativeDetails?: CreateInitiativeDetailsDto[];
}

export interface InitiativeDetailsDto {
  id: number;
  initiativeId: number;
  locationNameAr: string;
  locationNameEn: string;
  locationCoordinates: string;
  isActive: boolean;
}

export interface CreateInitiativeDetailsDto {
  initiativeId?: number;
  locationNameAr: string;
  locationNameEn: string;
  locationCoordinates: string;
  isActive: boolean;
}

export interface UpdateInitiativeDetailsDto {
  id: number;
  initiativeId: number;
  locationNameAr: string;
  locationNameEn: string;
  locationCoordinates: string;
  isActive: boolean;
}

export interface GetAllInitiativeParameter {
  skip: number;
  take: number;
  searchValue?: string;
}

export interface InitiativePagedResponse {
  totalCount: number;
  data: InitiativeDto[];
}
