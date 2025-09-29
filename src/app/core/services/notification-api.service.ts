import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEndpoints } from '../constants/api-endpoints';
import { 
  NotificationDto, 
  CreateNotificationDto, 
  CreateDepartmentNotificationDto,
  SendNotificationToDepartmentDto,
  GetAllNotificationRequestDto,
  UpdateFCMTokenDto,
  PagedResultDto 
} from '../dtos/notifications/notification.dto';

@Injectable({
  providedIn: 'root'
})
export class NotificationApiService {
  private readonly BASE_URL = environment.apiBaseUrl;
  private readonly NotificationBASE_URL = `${environment.apiBaseUrl}${ApiEndpoints.Notifications.Base}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all notifications for a user
   */
  getAllNotifications(request: GetAllNotificationRequestDto): Observable<PagedResultDto<NotificationDto>> {
    return this.http.post<PagedResultDto<NotificationDto>>(
      `${this.BASE_URL}${ApiEndpoints.Notifications.GetAll}`,
      request
    );
  }

  /**
   * Get notification by ID
   */
  getNotificationById(id: string): Observable<NotificationDto> {
    return this.http.get<NotificationDto>(
      `${this.BASE_URL}${ApiEndpoints.Notifications.GetById(id)}`
    );
  }

  /**
   * Create a new notification
   */
  createNotification(notification: CreateNotificationDto): Observable<NotificationDto> {
    return this.http.post<NotificationDto>(
      `${this.BASE_URL}${ApiEndpoints.Notifications.Create}`,
      notification
    );
  }

  /**
   * Mark notification as seen
   */
  markNotificationAsSeen(id: string): Observable<string> {
    return this.http.post<string>(
      `${this.BASE_URL}${ApiEndpoints.Notifications.MarkAsSeen(id)}`,
      {}
    );
  }

  /**
   * Get unseen notifications count for a user
   */
  //getUnseenNotificationsCount(userId: string): Observable<number> {
  //  return this.http.get<number>(
  //    `${this.BASE_URL}${ApiEndpoints.Notifications.GetUnseenCount(userId)}`
  //  );
  //}

  getUnseenNotificationsCount(): Observable<number>  {
    const apiUrl = `${this.NotificationBASE_URL}${ApiEndpoints.Notifications.GetUnseenCount}`;
    return this.http.get<number>(apiUrl);
  }

  /**
   * Send notification to department (Create Department Notification)
   */
  sendNotificationToDepartment(notification: CreateDepartmentNotificationDto): Observable<NotificationDto[]> {
    return this.http.post<NotificationDto[]>(
      `${this.BASE_URL}${ApiEndpoints.Notifications.SendToDepartment}`,
      notification
    );
  }

  /**
   * Send notification to department with service details
   */
  sendServiceNotificationToDepartment(notification: SendNotificationToDepartmentDto): Observable<NotificationDto[]> {
    return this.http.post<NotificationDto[]>(
      `${this.BASE_URL}${ApiEndpoints.Notifications.SendToDepartment}`,
      notification
    );
  }

  /**
   * Update FCM token for a user
   */
  updateFCMToken(tokenData: UpdateFCMTokenDto): Observable<void> {
    const url = `${this.BASE_URL}${ApiEndpoints.FCMToken.Update}`;
    
    return this.http.post<void>(url, tokenData).pipe(
      tap(() => {
        // FCM token API call successful
      }),
      catchError(error => {
        throw error;
      })
    );
  }
}
