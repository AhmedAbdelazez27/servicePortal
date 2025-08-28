export interface PollDto {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  pollDate: Date;
  isActive: boolean;
  link: string;
}

export interface CreatePollDto {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isActive: boolean;
  link: string;
}

export interface UpdatePollDto {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isActive: boolean;
  link: string;
}

export interface GetAllPollRequestDto {
  skip: number;
  take: number;
  searchValue?: string;
  isActive?: boolean;
}

export interface PagedResultDto<T> {
  totalCount: number;
  data: T[];
}
