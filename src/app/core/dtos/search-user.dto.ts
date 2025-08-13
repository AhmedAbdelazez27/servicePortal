export class FilterUserDto {
  name: string | null = null;
  idNumber: string | null = null;
  foundationName: string | null = null;
  licenseNumber: string | null = null;
  entityInfoId: string | null = null;
  entityId: string | null = null;
  userType: number = 1;
  userStatus: number = 1;
  applyDate: Date | null = null;
  searchValue: string | null = null;
  skip: number = 1;
  take: number = 1;
  orderByValue: string | null = null;
}