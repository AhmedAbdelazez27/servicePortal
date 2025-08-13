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
}

export interface GetAllAttachmentsParamters {
  skip: number;
  take: number;
  masterIds?: number[];
  masterType?: number;
}
