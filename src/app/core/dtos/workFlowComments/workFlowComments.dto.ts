import { AttachmentDto } from '../attachments/attachment.dto';

export class CreateWorkFlowCommentDto {
  empId?: string | null = null;
  workFlowStepsId: number = 0;
  comment?: string | null = null;
  lastModified?: Date | null = null;
  commentTypeId?: number | null = null;
  attachments?: AttachmentBase64Dto[] | null = null;
}

export class UpdateWorkFlowCommentDto {
  id: number = 0;
  empId?: string | null = null;
  workFlowStepsId: number = 0;
  comment?: string | null = null;
  lastModified?: Date | null = null;
  commentTypeId?: number | null = null;
}

export class GetAllWorkFlowCommentParameter {
  skip: number = 0;
  take: number = 10;
  workFlowStepsId?: number | null = null;
  commentTypeId?: number | null = null;
  empId?: string | null = null;
}

export class AttachmentBase64Dto {
  attachmentTitle?: string | null = null;
  fileBase64?: string | null = null;
  fileName?: string | null = null;
  fileExtension?: string | null = null;
  attConfigID?: number | null = null;
}

export enum WorkflowCommentsType {
  Internal = 1,
  External = 2
}

export class PagedResultDto<T> {
  totalCount: number = 0;
  items: T[] = [];

  constructor(totalCount: number, items: T[]) {
    this.totalCount = totalCount;
    this.items = items;
  }
}
