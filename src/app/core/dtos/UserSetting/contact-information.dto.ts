// Base DTO for ContactInformation entity
export interface ContactInformationDto {
  id: number;
  name: string;
  email: string;
  title?: string | null;
  message?: string | null;
  creationDate: Date; // Date object
}

// DTO for creating a new contact information
export interface CreateContactInformationDto {
  name: string;
  email: string;
  title?: string | null;
  message?: string | null;
}

// DTO for updating an existing contact information
export interface UpdateContactInformationDto {
  id: number;
  name: string;
  email: string;
  title?: string | null;
  message?: string | null;
}

// DTO for getting all contact information with pagination and filtering
export interface GetAllContactInformationParameters {
  name?: string | null;
  email?: string | null;
  title?: string | null;
  skip: number;
  take: number;
  orderByValue?: string | null;
}

// Paginated result DTO
export interface PagedResultDto<T> {
  totalCount: number;
  data: T[];
}
