export interface RegionDto {
  id: number;
  regionArabicName: string;
  regionEnglishName?: string;
  maxCountOfLocations?: number;
  isActive?: boolean;
  lastModified?: Date;
  currenLocationCount?: number;
}

export interface CreateRegionsDto {
  regionArabicName: string;
  regionEnglishName?: string;
  maxCountOfLocations?: number;
  isActive?: boolean;
}

export interface UpdateRegionDto {
  id: number;
  regionArabicName: string;
  regionEnglishName?: string;
  maxCountOfLocations?: number;
  isActive?: boolean;
}

export interface GetAllRegionParmeters {
  skip: number;
  take: number;
  searchValue?: string;
  isActive?: boolean;
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
