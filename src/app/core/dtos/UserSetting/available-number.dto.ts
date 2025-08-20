// Base DTO for AvailableNumber entity
export interface AvailableNumberDto {
  id: number;
  fromDate: string; // ISO 8601 date-time format
  toDate: string; // ISO 8601 date-time format
  entityId: string;
  allowedNo: number;
}

// DTO for creating a new available number
export interface CreateAvailableNumberDto {
  fromDate: string; // ISO 8601 date-time format
  toDate: string; // ISO 8601 date-time format
  entityId: string;
  allowedNo: number;
}

// DTO for updating an existing available number
export interface UpdateAvailableNumberDto {
  id: number;
  fromDate: string; // ISO 8601 date-time format
  toDate: string; // ISO 8601 date-time format
  entityId: string;
  allowedNo: number;
}

// DTO for getting all available numbers with pagination and filtering
export interface GetAllAvailableNumberParameters {
  searchValue?: string | null;
  skip: number;
  take: number;
  orderByValue?: string | null;
  entityId?: string | null;
}

// Paginated result DTO
export interface PagedResultDto<T> {
  totalCount: number;
  data: T[];
}

// Select2 request DTO for dropdown components
export interface Select2RequestDto {
  searchValue?: string;
  skip: number;
  take: number;
  orderByValue?: string;
}

// Select2 result DTO for dropdown components
export interface Select2Result {
  total: number;
  results: Select2ResultItem[];
}

// Select2 result item DTO
export interface Select2ResultItem {
  id: string;
  text: string;
  altText?: string;
}
