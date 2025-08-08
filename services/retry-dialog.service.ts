import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { ConnectionService } from './connection.service';

/**
 * Interface for retry dialog configuration
 */
export interface RetryDialogConfig {
  operation: string;
  error: any;
  attemptNumber: number;
  message?: string;
  showConnectionTest?: boolean;
  autoRetryDelay?: number;
}

/**
 * Service for managing retry dialogs and user retry interactions
 * Provides methods to show retry dialogs and handle user responses
 */
@Injectable({
  providedIn: 'root'
})
export class RetryDialogService {
  private dialogSubject = new Subject<RetryDialogConfig>();
  private responseSubject = new Subject<boolean>();

  constructor(private connectionService: ConnectionService) {}

  /**
   * Shows a retry dialog to the user
   * @param config Retry dialog configuration
   * @returns Observable<boolean> True if user wants to retry, false otherwise
   */
  showRetryDialog(config: RetryDialogConfig): Observable<boolean> {
    return new Observable<boolean>(subscriber => {
      // For now, use a simple confirm dialog
      // In a real implementation, this would show a proper modal dialog
      const message = this.buildDialogMessage(config);
      
      setTimeout(() => {
        const shouldRetry = confirm(message);
        subscriber.next(shouldRetry);
        subscriber.complete();
      }, 100);
    });
  }

  /**
   * Shows a retry dialog with connection testing capability
   * @param config Retry dialog configuration
   * @returns Observable<boolean> True if user wants to retry, false otherwise
   */
  showRetryDialogWithConnectionTest(config: RetryDialogConfig): Observable<boolean> {
    return new Observable<boolean>(subscriber => {
      const message = this.buildDialogMessage(config);
      const connectionInfo = this.connectionService.getConnectionInfo();
      
      const fullMessage = `${message}

Connection Status:
- Healthy: ${connectionInfo.isHealthy ? 'Yes' : 'No'}
- Browser Online: ${connectionInfo.isOnline ? 'Yes' : 'No'}
- Queued Operations: ${connectionInfo.queueSize}

Options:
- OK: Retry the operation
- Cancel: Cancel the operation

Would you like to test the connection first?`;

      const testConnection = confirm(fullMessage);
      
      if (testConnection) {
        this.connectionService.testConnection().subscribe({
          next: (isHealthy) => {
            if (isHealthy) {
              const retryAfterTest = confirm('Connection test successful! Would you like to retry the operation now?');
              subscriber.next(retryAfterTest);
            } else {
              const retryAnyway = confirm('Connection test failed. Would you like to retry the operation anyway?');
              subscriber.next(retryAnyway);
            }
            subscriber.complete();
          },
          error: () => {
            const retryAnyway = confirm('Connection test failed. Would you like to retry the operation anyway?');
            subscriber.next(retryAnyway);
            subscriber.complete();
          }
        });
      } else {
        const shouldRetry = confirm('Would you like to retry the operation without testing the connection?');
        subscriber.next(shouldRetry);
        subscriber.complete();
      }
    });
  }

  /**
   * Creates a user retry callback function for use with ConnectionService
   * @param operationName Name of the operation being retried
   * @param showConnectionTest Whether to show connection test option
   * @returns Function that can be used as userRetryCallback
   */
  createUserRetryCallback(
    operationName: string, 
    showConnectionTest: boolean = true
  ): (error: any, attemptNumber: number) => Observable<boolean> {
    return (error: any, attemptNumber: number) => {
      const config: RetryDialogConfig = {
        operation: operationName,
        error: error,
        attemptNumber: attemptNumber,
        showConnectionTest: showConnectionTest
      };

      if (showConnectionTest) {
        return this.showRetryDialogWithConnectionTest(config);
      } else {
        return this.showRetryDialog(config);
      }
    };
  }

  /**
   * Shows a simple retry confirmation dialog
   * @param operationName Name of the operation
   * @param error The error that occurred
   * @returns Observable<boolean> True if user wants to retry
   */
  showSimpleRetryDialog(operationName: string, error: any): Observable<boolean> {
    const config: RetryDialogConfig = {
      operation: operationName,
      error: error,
      attemptNumber: 1
    };

    return this.showRetryDialog(config);
  }

  /**
   * Shows a timeout retry dialog with specific timeout handling
   * @param operationName Name of the operation
   * @param timeoutMs Timeout duration in milliseconds
   * @returns Observable<boolean> True if user wants to retry
   */
  showTimeoutRetryDialog(operationName: string, timeoutMs: number): Observable<boolean> {
    const config: RetryDialogConfig = {
      operation: operationName,
      error: { message: `Operation timed out after ${timeoutMs / 1000} seconds` },
      attemptNumber: 1,
      message: `The ${operationName} operation timed out. This might be due to a slow connection or server issues.`
    };

    return this.showRetryDialogWithConnectionTest(config);
  }

  /**
   * Shows a network error retry dialog
   * @param operationName Name of the operation
   * @param error Network error
   * @returns Observable<boolean> True if user wants to retry
   */
  showNetworkErrorDialog(operationName: string, error: any): Observable<boolean> {
    const config: RetryDialogConfig = {
      operation: operationName,
      error: error,
      attemptNumber: 1,
      message: `Network error occurred during ${operationName}. Please check your internet connection.`
    };

    return this.showRetryDialogWithConnectionTest(config);
  }

  /**
   * Builds the dialog message based on configuration
   * @param config Retry dialog configuration
   * @returns string Dialog message
   */
  private buildDialogMessage(config: RetryDialogConfig): string {
    let message = `${config.operation} Failed`;
    
    if (config.attemptNumber > 1) {
      message += ` (Attempt ${config.attemptNumber})`;
    }

    message += '\n\n';

    if (config.message) {
      message += config.message;
    } else if (config.error) {
      if (config.error.message) {
        message += `Error: ${config.error.message}`;
      } else if (config.error.status === 0) {
        message += 'Unable to connect to the server. Please check your internet connection.';
      } else if (config.error.status >= 500) {
        message += 'Server error occurred. The server may be temporarily unavailable.';
      } else if (config.error.status === 408 || config.error.name === 'TimeoutError') {
        message += 'Request timed out. The server is taking too long to respond.';
      } else {
        message += 'An unexpected error occurred.';
      }
    } else {
      message += 'An unexpected error occurred.';
    }

    message += '\n\nWould you like to retry this operation?';

    return message;
  }

  /**
   * Gets user-friendly error type description
   * @param error The error object
   * @returns string Error type description
   */
  private getErrorTypeDescription(error: any): string {
    if (error.status === 0) {
      return 'Network Connection Error';
    } else if (error.status === 408 || error.name === 'TimeoutError') {
      return 'Request Timeout';
    } else if (error.status >= 500) {
      return 'Server Error';
    } else if (error.status >= 400) {
      return 'Client Error';
    } else {
      return 'Unknown Error';
    }
  }

  /**
   * Gets troubleshooting tips based on error type
   * @param error The error object
   * @returns string[] Array of troubleshooting tips
   */
  getTroubleshootingTips(error: any): string[] {
    const tips: string[] = [];

    if (error.status === 0) {
      tips.push('Check your internet connection');
      tips.push('Verify the server URL is correct');
      tips.push('Check if a firewall is blocking the connection');
    } else if (error.status === 408 || error.name === 'TimeoutError') {
      tips.push('Check your internet connection speed');
      tips.push('The server may be experiencing high load');
      tips.push('Try again in a few moments');
    } else if (error.status >= 500) {
      tips.push('The server is experiencing issues');
      tips.push('Try again in a few minutes');
      tips.push('Contact support if the problem persists');
    } else {
      tips.push('Check your input data');
      tips.push('Verify you have the necessary permissions');
      tips.push('Try refreshing the page');
    }

    tips.push('Contact support if the issue continues');

    return tips;
  }
}