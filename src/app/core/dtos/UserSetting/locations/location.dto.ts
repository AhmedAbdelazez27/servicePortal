export interface LocationDto {
  id: number;
  locationName: string;
  address?: string;
  street?: string;
  regionName?: string;
  entityName?: string;
  isActive?: boolean;
  regionId?: number;
  locationTypeId?: number;
  locationType?: string;
  notes?: string;
  locationPhotoPath?: string;
  locationCoordinates?: string;
  attachment?: AttachmentDto;
}

export interface CreateLocationDto {
  locationOwner?: string;
  region?: any;
  street?: string;
  locationNo?: string;
  address: string;
  locationName: string;
  entityId?: number;
  locationCoordinates?: string;
  isActive?: boolean;
  regionId: number;
  locationTypeId: number;
  notes?: string;
  locationPhotoPath?: string;
  attachment?: AttachmentBase64Dto;
}

export interface UpdateLocationDto {
  id: number;
  locationOwner?: string;
  region?: any;
  street?: string;
  locationNo?: string;
  address: string;
  locationName: string;
  entityId?: number;
  locationCoordinates?: string;
  isActive?: boolean;
  regionId: number;
  locationTypeId: number;
  notes?: string;
  locationPhotoPath?: string;
  attachment?: AttachmentBase64Dto;
}

export interface GetAllLocationParameter {
  skip: number;
  take: number;
  searchValue?: string;
  regionId?: number;
  isActive?: boolean;
}

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

export interface PagedResultDto<T> {
  totalCount: number;
  items: T[];
}

export interface Select2RequestDto {
  skip: number;
  take: number;
  searchValue?: string;
  orderByValue?: string;
}

export interface Select2Result {
  results: Array<{ id: string | number; text: string }>;
  pagination: {
    more: boolean;
  };
}
