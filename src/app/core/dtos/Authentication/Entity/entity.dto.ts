export interface EntityDto {
  entitY_ID: string;
  entitY_NAME: string;
  entitY_NAME_EN: string;
  entitY_LOCALTION: string;
  entitY_PHONE: string;
  entitY_WEBSITE: string;
  entitY_MAIL: string;
  acC_DETAILS_ID: string;
}

export interface CreateEntityDto {
  entitY_ID: string;
  entitY_NAME: string;
  entitY_NAME_EN: string;
  entitY_LOCALTION: string;
  entitY_PHONE: string;
  entitY_WEBSITE: string;
  entitY_MAIL: string;
  acC_DETAILS_ID: string;
}

export interface UpdateEntityDto {
  entitY_ID: string;
  entitY_NAME: string;
  entitY_NAME_EN: string;
  entitY_LOCALTION: string;
  entitY_PHONE: string;
  entitY_WEBSITE: string;
  entitY_MAIL: string;
  acC_DETAILS_ID: string;
}

export interface GetEntityByIdDto {
  entitY_ID: string;
  entitY_NAME: string;
  entitY_NAME_EN: string;
  entitY_LOCALTION: string;
  entitY_PHONE: string;
  entitY_WEBSITE: string;
  entitY_MAIL: string;
  acC_DETAILS_ID: string;
}

export interface GetAllEntitiesResponseDto {
  totalCount: number;
  data: EntityDto[];
}

export interface EntityParameter {
  searchValue?: string;
  entityId?: string;
  skip: number;
  take: number;
}

export interface PagedResultDto<T> {
  totalCount: number;
  items: T[];
}

export interface Select2RequestDto {
  searchValue?: string;
  skip: number;
  take: number;
  orderByValue?: string;
}

export interface Select2Result {
  total: number;
  results: Select2ResultItem[];
}

export interface Select2ResultItem {
  id: string;
  text: string;
  altText?: string;
}
