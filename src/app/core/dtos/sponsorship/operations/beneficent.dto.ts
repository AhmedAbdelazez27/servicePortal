

export class filterBeneficentDto {
  entityId: string | null = null;
  beneficentNumber: string | null = null;
  phoneNumber: string | null = null;
  beneficentName: string | null = null;

  orderByValue: string = 'beneficenT_ID asc';
  take: number = 10;
  skip: number = 0;

  entityIdstr: string | null = null;
  beneficentNumberstr: string | null = null;
  phoneNumberstr: string | null = null;
  beneficentNamestr: string | null = null;
}




export class beneficentDto {
 composeKey: string | null = null;
beneficenT_ID: string | null = null;
donatoR_TYPE: string | null = null;
entitY_ID: string | null = null;
beneficenT_NO: string | null = null;
title: string | null = null;
beneficentname: string | null = null;
startinG_DATE: string | null = null;
joB_DESC: string | null = null;
gendeR_DESC: string | null = null;
category: string | null = null;
citY_ID: string | null = null;
citY_DESC: string | null = null;
beneficentmobile: string | null = null;
mobilE2: string | null = null;
mobilE3: string | null = null;
fax: string | null = null;
mailbox: string | null = null;
email: string | null = null;
website: string | null = null;
notes: string | null = null;
status: string | null = null;
statuS_DESC: string | null = null;
address: string | null = null;
}


export class filterBeneficentByIdDto {
  beneficenT_ID: string | null = null;
  entityId: string | null = null;
}

export class PagedResult<T> {
  items?: T[];
  totalCount?: number;
}

export class loadBeneficentNameDto {
  totalCount?: number;
  entityId!: string;
  skip=0;
  take= 500;
   searchValue?: string|null;
}

