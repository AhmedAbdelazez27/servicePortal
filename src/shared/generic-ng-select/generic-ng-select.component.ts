import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  forwardRef,
  ChangeDetectorRef,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Select2Service } from '../../app/core/services/Select2.service';

@Component({
  selector: 'app-dynamic-ng-select',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GenericNgSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="form-group">
      <label class="form-label">{{ label }}</label>
      <ng-select
        class="blue-ng-select"
        [ngClass]="{ 'ng-select-disabled': isDisabled }"
        [items]="items"
        bindLabel="text"
        bindValue="id"
        [multiple]="multiple"
        [clearable]="true"
        [(ngModel)]="value"
        [loading]="loading"
        [typeahead]="searchInput"
        [placeholder]="value?.length ? '' : '-- Select --'"
        (scrollToEnd)="onScrollToEnd()"
        (search)="onSearch($event)"
        (ngModelChange)="handleModelChange($event)"
        (blur)="onTouched()"
        [disabled]="isDisabled"
      ></ng-select>
      <div *ngIf="loading" class="text-muted small mt-1">
        <i class="fa fa-spinner fa-spin me-1"></i> Loading...
      </div>
    </div>
  `,
})
export class GenericNgSelectComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() label = '';
  @Input() endpoint?: string;
  @Input() lang = 'en';
  @Input() take = 10;
  @Input() multiple = false;
  @Input() initialItem?: { id: number; text: string };
  @Input() modelValue: any;
  @Output() modelValueChange = new EventEmitter<any>();
  @Output() modelTextChange = new EventEmitter<any>();

  items: any[] = [];
  skip = 0;
  loading = false;
  value: any = null;
  isDisabled = false;
  searchInput = new Subject<string>();
  private initialItemSet = false;

  constructor(private select2Service: Select2Service, private cdr: ChangeDetectorRef) {}

onChange(event: any) {
  if (this.multiple) {
    const textList = (event || []).map((x: any) => x.text).join(', ');
    this.modelTextChange.emit(textList);
  } else {
    this.modelTextChange.emit(event?.text || '');
  }
}
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = this.multiple ? (Array.isArray(value) ? value : []) : value ?? null;
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; this.cdr.markForCheck(); }

  ngOnInit() {
    this.loadItems();
    this.searchInput.pipe(debounceTime(300), distinctUntilChanged()).subscribe(term => {
      this.skip = 0;
      this.items = [];
      this.loadItems(term);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialItem'] && this.initialItem && !this.initialItemSet) {
      this.trySetInitialValue();
    }
    
    if (changes['modelValue']) {
      const val = changes['modelValue'].currentValue;
      if (!val || (Array.isArray(val) && val.length === 0)) {
         this.value = this.multiple ? [] : null;
         this.modelTextChange.emit('');
        }
      }
    }

  private trySetInitialValue() {
    if (!this.initialItem) return;
    if (!this.items.some(i => i.id === this.initialItem!.id)) this.items.unshift(this.initialItem);
    setTimeout(() => {
      this.value = this.multiple ? [this.initialItem!.id] : this.initialItem!.id;
      this.onChange(this.value);
      this.initialItemSet = true;
    });
  }

  handleModelChange(selected: any) {
    this.value = selected;
    if (this.multiple) {
      const ids = Array.isArray(selected) ? selected : [];
      const texts = this.items.filter(i => ids.includes(i.id)).map(i => i.text);
      this.modelValueChange.emit(ids);
      this.modelTextChange.emit(texts);
      this.onChange(ids);
    } else {
      const text = this.items.find(i => i.id === selected)?.text || '';
      this.modelValueChange.emit(selected);
      this.modelTextChange.emit(text);
      this.onChange(selected);
    }
  }

  loadItems(searchValue: string = '') {
    this.loading = true;
    const finalize = () => (this.loading = false);

    if (!this.endpoint) { finalize(); return; }

    this.select2Service.getDataFromUrl(this.endpoint, searchValue, this.skip, this.take, this.lang).subscribe({
      next: (res) => {
        const data = res?.result?.results || res?.results || res || [];
        const newItems = data.map((item: any) => {
          const id = item.id ?? item.value ?? item.code;
          const text = item.name || item.text || item.description || id;
          return { id, text };
        }).sort((a: any, b: any) => a.text.localeCompare(b.text));
        const existingIds: any[] = this.items.map((i: { id: any }) => i.id);
        this.items = [...this.items, ...newItems.filter((i: { id: any }) => !existingIds.includes(i.id))];
      
        if (this.initialItem) {
          const initialId = this.initialItem.id;
          if (!this.items.some((i: { id: any }) => i.id === initialId)) {
            this.items.unshift(this.initialItem);
          }
        }

        if (this.initialItem && !this.initialItemSet) {
          this.trySetInitialValue();
        }
        finalize();
      },
      error: (err) => { console.error('API load error:', err); finalize(); }
    });
  }

  onScrollToEnd() { if (!this.loading) { this.skip += 1; this.loadItems(); } }
  onSearch(event: { term: string }) { this.skip = 0; this.items = []; this.loadItems(event.term || ''); }
}