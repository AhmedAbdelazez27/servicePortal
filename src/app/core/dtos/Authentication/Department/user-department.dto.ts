export interface UserDepartmentDto {
  id: number;
  departmentId: number;
  userId: string;
  userName: string;
  departmentNameAr: string;
  departmentNameEn: string;
}

export interface UserDepartmentParameter {
  userId?: string | null;
  departmentId?: number | null;
  searchTerm?: string | null;
  searchValue?: string | null;
  skip: number;
  take: number;
  orderByValue?: string | null;
}

export interface PagedResultDto<T> {
  totalCount: number;
  items: T[];
}
