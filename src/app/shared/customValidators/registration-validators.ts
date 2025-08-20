import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Email validation regex pattern
 * This pattern validates:
 * - Local part (before @) can contain letters, numbers, dots, underscores, hyphens, and plus signs
 * - Domain part (after @) must be valid domain format
 * - TLD must be at least 2 characters
 * - No consecutive dots allowed
 * - No leading/trailing dots in local part
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Custom email validator function
 * Returns validation error if email doesn't match the regex pattern
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Allow empty values (handled by required validator if needed)
    }
    
    const isValid = EMAIL_REGEX.test(control.value);
    return isValid ? null : { invalidEmail: true };
  };
}

/**
 * Enhanced email validator with additional checks
 * - Checks regex pattern
 * - Ensures no consecutive dots
 * - Validates domain structure
 */
export function enhancedEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    
    const email = control.value.toString().trim();
    
    // Basic regex check
    if (!EMAIL_REGEX.test(email)) {
      return { invalidEmail: true };
    }
    
    // Check for consecutive dots
    if (email.includes('..')) {
      return { consecutiveDots: true };
    }
    
    // Check for leading/trailing dots in local part
    const [localPart] = email.split('@');
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return { leadingTrailingDots: true };
    }
    
    // Check domain structure
    const domainPart = email.split('@')[1];
    if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
      return { invalidDomain: true };
    }
    
    return null;
  };
} 