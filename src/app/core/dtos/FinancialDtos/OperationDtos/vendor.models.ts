export class filterVendorHeaderDto {
  entityId?: string | null = null;
  VendorName?: string | null=null;
  status?: string | null;
  OrderbyValue: string ="VENDOR_ID";

  entityIdstr: string | null = null;
  benificaryNamestr: string | null = null;
  VendorNameStr: string | null = null;
  statusStr: string | null = null;
  take: number = 10;
  skip: number = 0;
}
export interface vendorHeaderData {
  composeKey?: string;
  vendoR_ID: string;
  entitY_ID: string;
  vendoR_NUMBER?: string;
  vendoR_NAME?: string;
  statuS_DESC?: string;
  categorY_DESC?: string;
  address?: string;
}
export class vendorHeaderDto {
  vendoR_ID?: string;
entitY_ID?: string ;
vendoR_NUMBER?: string;
vendoR_NAME?: string;
categorY_DESC?: string;
status?: string;
statuS_DESC?: string;
evaL_NOTES?: string;
address?: string;
fax?: string;
email?: string;
website?: string;
mobilE_AREA_CODE?: string;
mobile?: string;
worK_TEL?: string;
composeKey?: string;
}
export class loadVendorNameDto {
  totalCount?: number;
  entityId!: string;
  skip=0;
  take= 500;
   searchValue?: string|null;
}
export class filtervendorHeaderByIDDto {
  vendorId!: string | null;
  entityId!: string;  
}



