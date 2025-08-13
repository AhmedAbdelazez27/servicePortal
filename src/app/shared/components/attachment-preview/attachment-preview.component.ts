import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafePipe } from '../../pipes/safe.pipe';

export interface AttachmentPreviewData {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  attachmentTitle?: string;
}

@Component({
  selector: 'app-attachment-preview',
  standalone: true,
  imports: [CommonModule, SafePipe],
  template: `
    <div class="attachment-preview-modal" (click)="onBackdropClick($event)">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ attachment?.attachmentTitle || attachment?.fileName }}</h5>
          <button type="button" class="btn-close" (click)="close()" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="attachment-info">
            <p><strong>File Name:</strong> {{ attachment?.fileName }}</p>
            <p><strong>File Size:</strong> {{ formatFileSize(attachment?.fileSize) }}</p>
            <p><strong>File Type:</strong> {{ attachment?.fileType }}</p>
          </div>
          
          <div class="attachment-content">
            <!-- Image Preview -->
            <div *ngIf="isImageFile(attachment?.fileType)" class="image-preview">
              <img [src]="attachment?.fileUrl" [alt]="attachment?.fileName" class="preview-image" />
            </div>
            
                         <!-- PDF Preview -->
             <div *ngIf="isPdfFile(attachment?.fileType)" class="pdf-preview">
               <iframe [src]="(attachment?.fileUrl || '') | safe" width="100%" height="500px"></iframe>
             </div>
            
            <!-- Other File Types -->
            <div *ngIf="!isImageFile(attachment?.fileType) && !isPdfFile(attachment?.fileType)" class="file-preview">
              <div class="file-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#8D734D"/>
                  <path d="M14 2V8H20" fill="#8D734D"/>
                </svg>
              </div>
              <p class="file-name">{{ attachment?.fileName }}</p>
              <p class="file-type">{{ attachment?.fileType }}</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="close()">Close</button>
          <button type="button" class="btn btn-primary" (click)="download()">Download</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .attachment-preview-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1050;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 90%;
      max-height: 90%;
      width: 800px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e9ecef;
      border-radius: 12px 12px 0 0;
      background-color: #f8f9fa;

      .modal-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #333;
      }

      .btn-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6c757d;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;

        &:hover {
          background-color: #e9ecef;
          color: #333;
        }
      }
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;

      .attachment-info {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background-color: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #8D734D;

        p {
          margin: 0.5rem 0;
          color: #495057;

          strong {
            color: #333;
            min-width: 100px;
            display: inline-block;
          }
        }
      }

      .attachment-content {
        .image-preview {
          text-align: center;

          .preview-image {
            max-width: 100%;
            max-height: 500px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
        }

        .pdf-preview {
          border: 1px solid #e9ecef;
          border-radius: 8px;
          overflow: hidden;
        }

        .file-preview {
          text-align: center;
          padding: 2rem;

          .file-icon {
            margin-bottom: 1rem;
          }

          .file-name {
            font-size: 1.1rem;
            font-weight: 500;
            color: #333;
            margin: 0.5rem 0;
          }

          .file-type {
            color: #6c757d;
            margin: 0;
          }
        }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e9ecef;
      border-radius: 0 0 12px 12px;
      background-color: #f8f9fa;

      .btn {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;

        &.btn-secondary {
          background-color: #6c757d;
          color: white;

          &:hover {
            background-color: #5a6268;
          }
        }

        &.btn-primary {
          background-color: #8D734D;
          color: white;

          &:hover {
            background-color: #7a6340;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .modal-content {
        width: 95%;
        max-height: 95%;
      }

      .modal-header {
        padding: 1rem;

        .modal-title {
          font-size: 1.1rem;
        }
      }

      .modal-body {
        padding: 1rem;

        .attachment-content {
          .image-preview .preview-image {
            max-height: 300px;
          }

          .pdf-preview iframe {
            height: 300px;
          }
        }
      }

      .modal-footer {
        padding: 1rem;
        flex-direction: column;

        .btn {
          width: 100%;
        }
      }
    }
  `]
})
export class AttachmentPreviewComponent {
  @Input() attachment: AttachmentPreviewData | null = null;
  @Output() closeModal = new EventEmitter<void>();

  close(): void {
    this.closeModal.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  download(): void {
    if (this.attachment?.fileUrl) {
      const link = document.createElement('a');
      link.href = this.attachment.fileUrl;
      link.download = this.attachment.fileName;
      link.click();
    }
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isImageFile(fileType: string | undefined): boolean {
    return fileType?.startsWith('image/') || false;
  }

  isPdfFile(fileType: string | undefined): boolean {
    return fileType === 'application/pdf';
  }
}
