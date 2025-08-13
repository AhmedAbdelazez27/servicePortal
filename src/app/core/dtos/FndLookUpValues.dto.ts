export class FndLookUpValuesSelect2RequestDto {
  searchValue?: string | null = null;
  skip: number = 0;
  take: number = 10;
  orderByValue?: string | null = null;
}

export class FndLookUpValuesSelect2RequestbyIdDto {
  totalCount?: number;
  entityId?: string;
  skip = 0;
  take = 10;
  searchValue?: string | null;
  orderByValue?: string | null = null;
}

export class Select2RequestDto {
  searchValue?: string | null = null;
  skip: number = 0;
  take: number = 999;
  orderByValue?: string | null = null;
}

export class Selectdropdown {
  result?: SelectdropdownResult;
  targetUrl?: string;
  success?: boolean;
  error?: string;
  unAuthorizedRequest?: boolean;
  __abp?: boolean;
}

export class SelectdropdownResult {
  total: number = 0;
  results: SelectdropdownResultResults[] = [];
}

export class SelectdropdownResultResults {
  id: number = 0;
  text?: string | null = null;
  altText?: string | null = null;
}

export class PagedResult<T> {
  items?: T[];
  totalCount?: number;
}

export class Pagination {
  totalCount: number = 0;
  currentPage: number = 1;
  itemsPerPage: number = 2;
  pages: number[] = [];
  searchValue? : string | null = null;
  take: number|number = 10;
  skip: number | number = 0;
}

export class reportField {
  label?: string | null = null;
  value: any;
}

export class reportColumn {
  label?: string | null = null;
  title?: string | null = null;
  key?: string | null = null;
}

export class reportPrintConfig {
  title?: string | null = null;
  reportTitle?: string | null = null;
  fields?: reportField[];
  columns?: reportColumn[];
  data?: any[];
  totalLabel?: string | null = null;
  totalKeys?: string[];
  fileName?: string | null = null;
}


