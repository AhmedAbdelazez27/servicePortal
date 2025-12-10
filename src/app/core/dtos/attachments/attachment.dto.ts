export interface AttachmentDto {
  id: number;
  imgPath?: string;
  masterType?: number;
  masterId?: number;
  attachmentTitle?: string;
  attConfigID?: number;
  lastModified?: Date;
}

export interface AttachmentBase64Dto {
  fileBase64: string;
  fileName: string;
  masterId: number;
  attConfigID: number;
  masterType?: number; // Optional master type (e.g., 1009 for ProfileImage)
}

export interface CreateAttachmentDto {
  imgPath: string;
  masterType: number;
  masterId: number;
  attachmentTitle: string;
  attConfigID: number;
}

export interface UpdateAttachmentBase64Dto {
  id: number;
  fileBase64: string;
  fileName: string;
  masterId: number;
  attConfigID: number;
  masterType?: number; // Optional master type (e.g., 1009 for ProfileImage)
}

export interface GetAllAttachmentsParamters {
  skip: number;
  take: number;
  masterIds?: number[];
  masterType?: number;
}
