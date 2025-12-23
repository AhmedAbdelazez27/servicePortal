import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { PollService } from '../../core/services/UserSetting/poll.service';
import { PollDto, GetAllPollRequestDto } from '../../core/dtos/polls/poll.dto';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-polls',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './polls.component.html',
  styleUrls: ['./polls.component.scss']
})
export class PollsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  polls: PollDto[] = [];
  loading = false;
  error: string | false = false;
  currentLanguage: 'en' | 'ar' = 'en';

  constructor(
    private pollService: PollService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadPolls();
    
    // Subscribe to language changes
    this.translationService.langChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.currentLanguage = lang;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPolls(): void {
    this.loading = true;
    this.error = false;

    const params: GetAllPollRequestDto = {
      skip: 0,
      take: 10000, // Load all polls
      searchValue: '',
      isActive: true // Only show active polls
    };

    this.pollService.getAllAsync(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Filter to ensure only active polls are displayed
          this.polls = (response.data || []).filter(poll => poll.isActive === true);
          this.loading = false;
        },
        error: (error) => {
          this.error = 'ERRORS.FAILED_LOAD_POLLS';
          this.loading = false;
        }
      });
  }

  getPollTitle(poll: PollDto): string {
    return this.currentLanguage === 'ar' ? poll.titleAr : poll.titleEn;
  }

  getPollDescription(poll: PollDto): string {
    return this.currentLanguage === 'ar' ? poll.descriptionAr : poll.descriptionEn;
  }

  getPollDate(poll: PollDto): string {
    if (!poll.pollDate) return '';
    const date = new Date(poll.pollDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  openPollLink(poll: PollDto): void {
    if (poll?.link) {
      window.open(poll.link, '_blank');
    }
  }

  retryLoad(): void {
    this.loadPolls();
  }
}
