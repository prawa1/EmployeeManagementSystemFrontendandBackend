import { Component, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * Interface for retry dialog data
 */
export interface RetryDialogData {
  error: any;
  attemptNumber: number;
  operation: string;
  message?: string;
}

/**
 * Retry Dialog Component for user-controlled retry operations
 * Provides user with options to retry failed operations or cancel
 */
@Component({
  selector: 'app-retry-dialog',
  standalone: false,
  template: `
    <div class="retry-dialog-overlay" (click)="onCancel()">
      <div class="retry-dialog" (click)="$event.stopPropagation()">
        <div class="retry-dialog-header">
          <h3>Connection Error</h3>
          <button class="close-btn" (click)="onCancel()" aria-label="Close">&times;</button>
        </div>
        
        <div class="retry-dialog-content">
          <div class="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          
          <div class="error-details">
            <p class="error-message">{{ getErrorMessage() }}</p>
            <p class="operation-info">Operation: {{ data.operation }}</p>
            <p class="attempt-info">Attempt {{ data.attemptNumber }} failed</p>
            
            <div class="connection-status" *ngIf="connectionInfo">
              <p><strong>Connection Status:</strong> 
                <span [class]="connectionInfo.isHealthy ? 'status-healthy' : 'status-unhealthy'">
                  {{ connectionInfo.isHealthy ? 'Healthy' : 'Unhealthy' }}
                </span>
              </p>
              <p><strong>Browser Online:</strong> 
                <span [class]="connectionInfo.isOnline ? 'status-healthy' : 'status-unhealthy'">
                  {{ connectionInfo.isOnline ? 'Yes' : 'No' }}
                </span>
              </p>
              <p *ngIf="connectionInfo.lastCheck">
                <strong>Last Check:</strong> {{ formatDate(connectionInfo.lastCheck) }}
              </p>
              <p *ngIf="connectionInfo.queueSize > 0">
                <strong>Queued Operations:</strong> {{ connectionInfo.queueSize }}
              </p>
            </div>
          </div>
        </div>
        
        <div class="retry-dialog-actions">
          <button class="btn btn-secondary" (click)="onCancel()">
            Cancel
          </button>
          <button class="btn btn-primary" (click)="onRetry()" [disabled]="isRetrying">
            <span *ngIf="isRetrying" class="spinner"></span>
            {{ isRetrying ? 'Retrying...' : 'Retry Now' }}
          </button>
          <button class="btn btn-info" (click)="onTestConnection()" [disabled]="isTestingConnection">
            <span *ngIf="isTestingConnection" class="spinner"></span>
            {{ isTestingConnection ? 'Testing...' : 'Test Connection' }}
          </button>
        </div>
        
        <div class="retry-tips">
          <h4>Troubleshooting Tips:</h4>
          <ul>
            <li>Check your internet connection</li>
            <li>Verify the server is running and accessible</li>
            <li>Try refreshing the page if the problem persists</li>
            <li>Contact support if the issue continues</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./retry-dialog.component.css']
})
export class RetryDialogComponent {
  isRetrying = false;
  isTestingConnection = false;
  connectionInfo: any = null;
  
  // Mock data for demonstration - in real implementation this would be injected
  data: RetryDialogData = {
    error: null,
    attemptNumber: 1,
    operation: 'Database Operation'
  };

  // Callback functions that would be set by the parent component
  onRetryCallback: (() => Observable<boolean>) | null = null;
  onCancelCallback: (() => void) | null = null;
  onTestConnectionCallback: (() => Observable<boolean>) | null = null;

  constructor() {
    // In a real implementation, this would get connection info from the connection service
    this.updateConnectionInfo();
  }

  /**
   * Gets user-friendly error message from the error object
   */
  getErrorMessage(): string {
    if (this.data.message) {
      return this.data.message;
    }

    if (this.data.error) {
      if (this.data.error.message) {
        return this.data.error.message;
      }
      
      if (this.data.error.status === 0) {
        return 'Unable to connect to the server. Please check your internet connection.';
      }
      
      if (this.data.error.status >= 500) {
        return 'Server error occurred. The server may be temporarily unavailable.';
      }
      
      if (this.data.error.status === 408 || this.data.error.name === 'TimeoutError') {
        return 'Request timed out. The server is taking too long to respond.';
      }
    }

    return 'An unexpected error occurred while connecting to the server.';
  }

  /**
   * Handles retry button click
   */
  onRetry(): void {
    if (this.onRetryCallback && !this.isRetrying) {
      this.isRetrying = true;
      
      this.onRetryCallback().subscribe({
        next: (shouldRetry) => {
          this.isRetrying = false;
          // The callback will handle the actual retry logic
        },
        error: (error) => {
          this.isRetrying = false;
          console.error('Retry callback failed:', error);
        }
      });
    }
  }

  /**
   * Handles cancel button click
   */
  onCancel(): void {
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
  }

  /**
   * Handles test connection button click
   */
  onTestConnection(): void {
    if (this.onTestConnectionCallback && !this.isTestingConnection) {
      this.isTestingConnection = true;
      
      this.onTestConnectionCallback().subscribe({
        next: (isHealthy) => {
          this.isTestingConnection = false;
          this.updateConnectionInfo();
          
          if (isHealthy) {
            // Connection is healthy, user might want to retry now
            this.showConnectionRestoredMessage();
          }
        },
        error: (error) => {
          this.isTestingConnection = false;
          console.error('Connection test failed:', error);
        }
      });
    }
  }

  /**
   * Updates connection information display
   */
  private updateConnectionInfo(): void {
    // In a real implementation, this would get info from ConnectionService
    this.connectionInfo = {
      isHealthy: false,
      isOnline: navigator.onLine,
      lastCheck: new Date(),
      queueSize: 0
    };
  }

  /**
   * Shows a message when connection is restored
   */
  private showConnectionRestoredMessage(): void {
    // This could show a toast notification or update the dialog
    console.log('Connection restored! You can now retry the operation.');
  }

  /**
   * Formats date for display
   */
  formatDate(date: Date): string {
    return date.toLocaleTimeString();
  }

  /**
   * Static method to create and show retry dialog
   * This would typically be implemented using Angular Material Dialog or similar
   */
  static showRetryDialog(
    data: RetryDialogData,
    onRetry: () => Observable<boolean>,
    onCancel: () => void,
    onTestConnection?: () => Observable<boolean>
  ): Observable<boolean> {
    // In a real implementation, this would open a modal dialog
    // For now, we'll return a simple confirmation
    return new Observable<boolean>(subscriber => {
      const shouldRetry = confirm(
        `${data.operation} failed (Attempt ${data.attemptNumber}). 
        Error: ${data.error?.message || 'Connection error'}
        
        Would you like to retry?`
      );
      
      subscriber.next(shouldRetry);
      subscriber.complete();
    });
  }
}