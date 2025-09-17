export class LoginUAEPassDto {
  code?: string;
  state?: string;
  lang: string | null = null;
}
export class ReturnUAEPassDto {
  token?: string;
  message: string | null = null;
  statusCode: string | null = null;
  toastrMessage: string | null = null;
  uaePassData?: UAEPassDto[];
}

export class UAEPassDto {
  sub: string | null = null;
  fullnameAr: string | null = null;
  firstnameAR: string | null = null;
  lastnameAR: string | null = null;
  gender: string | null = null;
  mobile: string | null = null;
  firstnameEN: string | null = null;
  lastnameEN: string | null = null;
  fullnameEN: string | null = null;
  nationalityEN: string | null = null;
  email: string | null = null;
  idn: string | null = null;
  userType: string | null = null;
  nationalityAR: string | null = null;
  uuid: string | null = null;
  idexpirydate: string | null = null;
  birthdate: string | null = null;
  countryId: string | null = null;
  genderId: number | null = null;
}
