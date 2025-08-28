import { AttachmentBase64Dto, AttachmentDto } from '../attachments/attachment.dto';

export interface HeroSectionSettingDto {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  link?: string;
  isActive: boolean;
  viewOrder: number;
  attachment?: AttachmentDto;
}

export interface CreateHeroSectionSettingDto {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  link?: string;
  isActive: boolean;
  viewOrder: number;
  attachment?: AttachmentBase64Dto;
}

export interface UpdateHeroSectionSettingDto {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  link?: string;
  isActive: boolean;
  viewOrder: number;
}

export interface GetAllHeroSectionSettingRequestDto {
  skip: number;
  take: number;
  searchValue?: string;
  isActive?: boolean;
}
