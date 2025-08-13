export interface DepartmentDto {
  dept_ID: number;
  aname: string;
  ename: string;
  isActive: boolean;
  last_Modify: Date;
}

export interface CreateDepartmentDto {
  aname: string;
  ename: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  dept_ID: number;
  aname: string;
  ename: string;
  isActive?: boolean;
}

export interface DepartmentParameter {
  searchValue?: string;
  isActive?: boolean;
  skip?: number;
  take?: number;
}

export interface PagedResultDto<T> {
  totalCount: number;
  items: T[];
}
