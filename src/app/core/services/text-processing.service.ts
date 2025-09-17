// text-processing.service.ts
import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface TextProcessingOptions {
  maxLength?: number;
  preserveLineBreaks?: boolean;
  replaceHtmlWith?: string;
  customUnicodeMap?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class TextProcessingService {
  private sanitizer = inject(DomSanitizer);
  
  private readonly defaultUnicodeMap: { [key: string]: string } = {
    '\\u00A0': ' ',    // Non-breaking space
    '\\u00A9': '©',    // Copyright
    '\\u00AE': '®',    // Registered trademark
    '\\u2013': '–',    // En dash
    '\\u2014': '—',    // Em dash
    '\\u2018': '\'',   
    '\\u2019': '\'',    
    '\\u201C': '\"',    // Left double quotation mark
    '\\u201D': '"',    // Right double quotation mark
    '\\u2022': '•',    // Bullet
    '\\u2026': '…',    // Horizontal ellipsis
  };


  toSafeHtml(htmlContent: string): SafeHtml {
    const decoded = this.decodeUnicode(htmlContent);
    return this.sanitizer.bypassSecurityTrustHtml(decoded);
  }


  cleanText(htmlContent: string, options: TextProcessingOptions = {}): string {
    if (!htmlContent || typeof htmlContent !== 'string') return '';

    let cleaned = htmlContent;

    //  Unicode
    cleaned = this.decodeUnicode(cleaned, options.customUnicodeMap);

    //  line breaks
    if (options.preserveLineBreaks) {
      cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n')
                      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
                      .replace(/<\/div>\s*<div[^>]*>/gi, '\n');
    }

    //  HTML tags
    cleaned = this.stripHtml(cleaned, options.replaceHtmlWith);

   
    cleaned = this.normalizeWhitespace(cleaned);

    // cut text 
    if (options.maxLength) {
      cleaned = this.truncateText(cleaned, options.maxLength);
    }

    return cleaned;
  }

  /**
   *  Unicode escape sequences
   */
  decodeUnicode(text: string, customMap?: { [key: string]: string }): string {
    const unicodeMap = { ...this.defaultUnicodeMap, ...customMap };
    
    let decoded = text;


    Object.keys(unicodeMap).forEach(unicode => {
      const regex = new RegExp(unicode.replace(/\\/g, '\\\\'), 'g');
      decoded = decoded.replace(regex, unicodeMap[unicode]);
    });


    decoded = decoded.replace(/\\u([0-9A-Fa-f]{4})/g, (match, code) => {
      return String.fromCharCode(parseInt(code, 16));
    });

    return decoded;
  }

  /**
   * remove HTML tags
   */
  stripHtml(html: string, replaceWith: string = ''): string {
    return html.replace(/<[^>]*>/g, replaceWith);
  }


  normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }


  truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    // prevent cut word
    if (lastSpace > 0 && lastSpace > maxLength - 50) {
      return text.substring(0, lastSpace).trim() + suffix;
    }
    
    return truncated.trim() + suffix;
  }

  /**
   * HTML tags
   */
  containsHtml(text: string): boolean {
    return /<[^>]*>/g.test(text);
  }

  /**
   * Unicode escape sequences
   */
  containsUnicode(text: string): boolean {
    return /\\u[0-9A-Fa-f]{4}/g.test(text);
  }

  getWordCount(text: string): number {
    const cleaned = this.cleanText(text);
    return cleaned ? cleaned.split(/\s+/).length : 0;
  }


  getFirstParagraph(htmlContent: string): string {
    const paragraphs = htmlContent.match(/<p[^>]*>(.*?)<\/p>/gi);
    if (paragraphs && paragraphs.length > 0) {
      return this.cleanText(paragraphs[0]);
    }
    
    return this.truncateText(this.cleanText(htmlContent), 200);
  }


  formatPreview(htmlContent: string, maxLength: number = 150): string {
    return this.cleanText(htmlContent, {
      maxLength,
      preserveLineBreaks: false
    });
  }


  processApiText(apiResponse: any, field: string, options: TextProcessingOptions = {}): string {
    try {
      const rawText = apiResponse[field];
      if (!rawText) return '';
      
      return this.cleanText(rawText, {
        maxLength: 500,
        preserveLineBreaks: false,
        ...options
      });
    } catch (error) {
      console.error('Error processing API text:', error);
      return '';
    }
  }
}