export interface RequestPlaintDto {
  id?: number;
  userId?: string;
  requestMainApplyServiceId: number;
  requestNo: number;
  requestDate: string;
  details: string;
  notes?: string | null;
  mainApplyServiceId?: number;
  attachments?: RequestPlaintAttachmentDto[];
  requestPlaintEvidences?: RequestPlaintEvidenceDto[];
  requestPlaintJustifications?: RequestPlaintJustificationDto[];
  requestPlaintReasons?: RequestPlaintReasonDto[];
}

export interface CreateRequestPlaintDto {
  userId: string;
  requestMainApplyServiceId: number;
  requestNo: number;
  requestDate: string;
  details: string;
  notes?: string | null;
  attachments: RequestPlaintAttachmentDto[];
  requestPlaintEvidences: RequestPlaintEvidenceDto[];
  requestPlaintJustifications: RequestPlaintJustificationDto[];
  requestPlaintReasons: RequestPlaintReasonDto[];
}

export interface RequestPlaintAttachmentDto {
  fileBase64: string;
  fileName: string;
  masterId: number;
  attConfigID: number;
}

export interface RequestPlaintEvidenceDto {
  id?: number;
  mainApplyServiceId: number;
  evidence: string;
}

export interface RequestPlaintJustificationDto {
  id?: number;
  mainApplyServiceId: number;
  justification: string;
}

export interface RequestPlaintReasonDto {
  id?: number;
  mainApplyServiceId: number;
  lkpPlaintReasonsId: number;
}

export interface MainApplyServiceSelect2RequestDto {
  skip: number;
  take: number;
  searchTerm?: string;
  orderByValue?: string;
  userId?: string;
}

export interface Select2Result {
  results: Select2Item[];
  totalCount: number;
}

export interface Select2Item {
  id: string;
  text: string;
}

export interface PlaintReasonsDto {
  id: number;
  reasonText: string;
  reasonTextEn: string;
  isActive: boolean;
}

export interface UserEntityDto {
  id: string;
  entityId: string;
  userId: string;
  roleId?: string | null;
  userName: string;
  roleName?: string | null;
  entityName: string;
  entityNameEn: string;
}
