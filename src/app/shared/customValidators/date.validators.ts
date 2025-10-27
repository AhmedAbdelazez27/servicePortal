// shared/customValidators/date.validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const RFC3339 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})$/;

/** بداية اليوم بالتوقيت المحلي */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** يحاول تحويل أي قيمة تاريخ لـ Date صحيحة */
function toDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'string') {
    // بنقبل RFC3339 أو أي string يقدر new Date يفهمه
    if (!RFC3339.test(val) && isNaN(Date.parse(val))) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * كنترول-ليفِل: يتحقق إن القيمة (تاريخ/وقت) ليست قبل اليوم.
 * - لو acceptEmpty=true: القيم الفارغة تعدي (سيبه مع required منفصل).
 * - بيقبل RFC3339 أو Date أو سترنج مفهوم.
 */
export function notBeforeToday(acceptEmpty = true): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || raw === '') return acceptEmpty ? null : { startBeforeToday: true };

    const d = toDate(raw);
    if (!d) return { startBeforeToday: true }; // قيمة مش تاريخ صالح

    return d >= startOfToday() ? null : { startBeforeToday: true };
  };
}

/**
 * جروب-ليفِل: نفس التحقق لكن على كنترول داخل الجروب عن طريق مسار (path) بدون تثبيت اسم.
 * مثال path: 'startDate' أو 'nested.group.startDate'
 */
export function notBeforeTodayFor(path: string, acceptEmpty = true): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const control = group.get(path);
    if (!control) return null; // مسار غير موجود: ما نكسرش الجروب

    const raw = control.value;
    if (raw == null || raw === '') {
      if (acceptEmpty) return null;
      // نرفع الغلط على الكنترول نفسه علشان UI
      control.setErrors({ ...(control.errors || {}), startBeforeToday: true });
      return { startBeforeToday: true };
    }

    const d = toDate(raw);
    const invalid = !d || d < startOfToday();
    if (invalid) {
      control.setErrors({ ...(control.errors || {}), startBeforeToday: true });
      return { startBeforeToday: true };
    } else {
      // نشيل الغلط ده فقط (لو موجود) ونسيب باقي الأخطاء
      if (control.errors?.['startBeforeToday']) {
        const { startBeforeToday, ...rest } = control.errors;
        control.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }
  };
}
