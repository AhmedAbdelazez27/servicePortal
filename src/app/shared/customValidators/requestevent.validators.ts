import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const RFC3339_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})$/;

export const rfc3339Required: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = (c.value ?? '') as string;

  if (!v) return { required: true }; 

  return RFC3339_REGEX.test(v) ? null : { rfc3339: true }; 
};


export const rfc3339OrEmpty: ValidatorFn = (c: AbstractControl) => {
  const v = (c.value ?? '') as string;
  if (!v) return null;
  return RFC3339_REGEX.test(v) ? null : { rfc3339: true };
};

export const valueInEnum =
  (allowed: readonly number[]): ValidatorFn =>
  (c: AbstractControl) =>
    allowed.includes(Number(c.value)) ? null : { enum: true };

export const arrayMinLength =
  (min: number): ValidatorFn =>
  (c: AbstractControl) => {
    const arr = c.value as unknown[];
    return Array.isArray(arr) && arr.length >= min ? null : { arrayMin: { min } };
  };

export const phoneRules =
  (min = 7, max = 20): ValidatorFn =>
  (c: AbstractControl) => {
    const v = (c.value ?? '') as string;
    if (!v) return null; 
    if (v.length < min || v.length > max) return { phoneLength: true };
    if (!/^[\d\s\-\+\(\)]+$/.test(v)) return { phonePattern: true };
    return null;
  };

export const timeRangesOk: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const g = group as any;

  const cmp = (a?: string, b?: string) =>
    a && b && RFC3339_REGEX.test(a) && RFC3339_REGEX.test(b) ? (a <= b ? null : { order: true }) : null;

  return (
    cmp(g.get('startDate')?.value, g.get('endDate')?.value) ??
    cmp(g.get('amStartTime')?.value, g.get('amEndTime')?.value) ??
    cmp(g.get('pmStartTime')?.value, g.get('pmEndTime')?.value)
  );
};



export const amTimeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const time = control.value as string; // time string مثل "HH:mm"
  if (!time) return null; // ممكن تخليها required بم validator منفصل

  const [hours, minutes] = time.split(':').map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { amTimeInvalid: true };
  }

  if (hours >= 0 && hours <= 11) {
    return null;
  }

  return { amTimeInvalid: true };
};

export const pmTimeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const time = control.value as string;
  if (!time) return null;

  const [hours, minutes] = time.split(':').map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { pmTimeInvalid: true };
  }

  if (hours >= 12 && hours <= 23) {
    return null;
  }

  return { pmTimeInvalid: true };
};

