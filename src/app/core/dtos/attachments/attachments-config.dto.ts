export interface AttachmentsConfigDto {
  id: number;
  attachmentsConfigType?: number;
  name: string;
  nameEn?: string;
  active?: boolean;
  mendatory?: boolean;
  lastModified?: string;
  attachments?: AttachmentDto[];
}

export interface CreateAttachmentsConfigDto {
  name: string;
  nameEn?: string;
  attachmentsConfigType: number;
  active?: boolean;
  mendatory?: boolean;
}

export interface UpdateAttachmentsConfigDto {
  id: number;
  attachmentsConfigType: number;
  name: string;
  nameEn?: string;
  active: boolean;
  mendatory: boolean;
}

export interface GetAllAttachmentsConfigParamters {
  skip: number;
  take: number;
  attachmentConfigType?: number;
  mendatory?: boolean | null;
  active?: boolean | null;
  ids?: number[];
}

export interface AttachmentsConfigPagedResponse {
  totalCount: number;
  data: AttachmentsConfigDto[];
}

export interface AttachmentDto {
  id: number;
  masterId?: number;
  imgPath?: string;
  masterType?: number;
  attachmentTitle?: string;
  lastModified?: string;
  attConfigID?: number;
}

export interface CreateAttachmentDto {
  masterId?: number;
  imgPath?: string;
  masterType?: number;
  attachmentTitle?: string;
  lastModified?: string;
  attConfigID?: number;
}

export enum AttachmentsConfigType {
  PermissionForFastingPerson = 1,
  DeclarationOfCharityEffectiveness = 2,
  RecruitmentOfEmployeesOrVolunteers = 3,
  RenewOrCancelReligiousInstitution = 4,
  FillOutPublicLoginData = 5,
  FillInstitutionRegistrationData = 6,
  RequestAnEventAnnouncementOrDonationCampaign = 7,
  RequestAnEventOrDonationCampaignPermit = 8,
  RequestAGrievance = 9,
  RequestADistributionSitePermit = 1001,
  LocationImage = 1002,
  Comment = 1003,
}
