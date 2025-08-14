
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
export function arrayMinLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    const len = Array.isArray(v) ? v.length : 0;
    return len >= min ? null : { minArrayLength: { requiredLength: min, actualLength: len } };
  };
}
