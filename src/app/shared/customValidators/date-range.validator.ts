
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
export const dateRangeValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const s = group.get('startDate')?.value;
  const e = group.get('endDate')?.value;
  if (!s || !e) return null;

  const start = new Date(s);
  const end = new Date(e);

  return end.getTime() >= start.getTime() ? null : { dateRange: true };
};
