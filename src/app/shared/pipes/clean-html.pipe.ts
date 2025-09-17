// clean-html.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cleanHtml',
  standalone: true,
  pure: true // للأداء الأفضل
})
export class CleanHtmlPipe implements PipeTransform {
  
  transform(value: string, options?: {
    maxLength?: number;
    preserveLineBreaks?: boolean;
    replaceWith?: string;
  }): string {
    
    if (!value || typeof value !== 'string') return '';
    
    let cleaned = value;
    
    // تحويل Unicode escape sequences الشائعة
    const unicodeMap: { [key: string]: string } = {
      '\\u00A0': ' ',  // Non-breaking space
      '\\u00A9': '©',  // Copyright
      '\\u00AE': '®',  // Registered trademark
      '\\u2013': '–',  // En dash
      '\\u2014': '—',  // Em dash
      '\\u2018': '\'',  // Left single quotation mark
      '\\u2019': '\'',  // Right single quotation mark
      '\\u201C': '"',  // Left double quotation mark
      '\\u201D': '"',  // Right double quotation mark
    };
    
    // استبدال Unicode escape sequences المحددة
    Object.keys(unicodeMap).forEach(unicode => {
      const regex = new RegExp(unicode.replace(/\\/g, '\\\\'), 'g');
      cleaned = cleaned.replace(regex, unicodeMap[unicode]);
    });
    
    // تحويل باقي Unicode escape sequences
    cleaned = cleaned.replace(/\\u([0-9A-Fa-f]{4})/g, (match, code) => {
      return String.fromCharCode(parseInt(code, 16));
    });
    
    // معالجة line breaks إذا كان مطلوب الاحتفاظ بها
    if (options?.preserveLineBreaks) {
      cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n')
                      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
    }
    
    // إزالة HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, options?.replaceWith || '');
    
    // تنظيف المسافات الزائدة
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // قطع النص إذا كان مطلوب
    if (options?.maxLength && cleaned.length > options.maxLength) {
      cleaned = cleaned.substring(0, options.maxLength).trim() + '...';
    }
    
    return cleaned;
  }
}

// استخدام الـ Pipe مع options
/*
في الـ template:
{{ description | cleanHtml }}
{{ description | cleanHtml:{ maxLength: 200 } }}
{{ description | cleanHtml:{ preserveLineBreaks: true, maxLength: 300 } }}
{{ description | cleanHtml:{ replaceWith: ' ' } }}
*/