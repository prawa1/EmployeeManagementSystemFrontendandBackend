import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { retry, catchError, timeout, retryWhen, delayWhen, take, concatMap, map, switchMap } from 'rxjs/operators';
import { endpointurl } from '../model/backendport';

/**
 * Connection Service for handling database connectivity, retry logic, and timeout management
 * Implements exponential backoff retry strategy and network error detection
 */
@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  // Configuration constants
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second
  private readonly maxRetryDelay = 10000; // 10 seconds
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly healthCheckTimeout = 5000; // 5 seconds for health checks
  private readonly healthCheckInterval = 60000; // 1 minute

  // Connection state tracking
  private connectionHealthy = true;
  private lastHealthCheck: Date | null = null;
  private retryQueue: Array<() => Observable<any>> = [];
  private isProcessingQueue = false;

  constructor(private http: HttpClient) {
    this.startPeriodicHealthCheck();
  }

  /**
   * Retry operation with exponential backoff for failed requests
   * @param operation The operation to retry
   * @param customTimeout Custom timeout in milliseconds (optional)
   * @param customMaxRetries Custom max retries (optional)
   * @returns Observable<T> The result of the operation
   */
  retryOperation<T>(
    operation: () => Observable<T>, 
    customTimeout?: number, 
    customMaxRetries?: number
  ): Observable<T> {
    const timeoutMs = customTimeout || this.defaultTimeout;
    const maxRetries = customMaxRetries || this.maxRetries;

    return operation().pipe(
      timeout(timeoutMs),
      retryWhen(errors =>
        errors.pipe(
          concatMap((error, index) => {
            // Check if we've exceeded max retries
            if (index >= maxRetries) {
              const finalError = new Error(`Operation failed after ${maxRetries} attempts`);
              (finalError as any).type = 'max_retries_exceeded';
              (finalError as any).status = error.status || 0;
              (finalError as any).originalError = error;
              return throwError(() => finalError);
            }

            // Only retry on connection-related errors
            if (this.isRetriableError(error)) {
              const delay = this.calculateRetryDelay(index);
              console.warn(`Retry attempt ${index + 1}/${maxRetries} in ${delay}ms for error:`, error);
              
              // Update connection health status
              this.connectionHealthy = false;
              
              return timer(delay);
            }

            // Don't retry non-retriable errors
            return throwError(() => error);
          })
        )
      ),
      catchError(error => {
        console.error('Operation failed after all retry attempts:', error);
        return this.handleOperationError(error);
      })
    );
  }

  /**
   * Retry operation with user-controlled retry options
   * @param operation The operation to retry
   * @param userRetryCallback Callback to ask user if they want to retry
   * @returns Observable<T> The result of the operation
   */
  retryWithUserControl<T>(
    operation: () => Observable<T>,
    userRetryCallback?: (error: any, attemptNumber: number) => Observable<boolean>
  ): Observable<T> {
    return this.retryOperation(operation).pipe(
      catchError(error => {
        if (userRetryCallback && this.isRetriableError(error)) {
          return userRetryCallback(error, this.maxRetries).pipe(
            switchMap(shouldRetry => {
              if (shouldRetry) {
                return this.retryWithUserControl(operation, userRetryCallback);
              }
              return throwError(() => error);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Tests database connectivity by making a health check request
   * @returns Observable<boolean> True if connection is healthy, false otherwise
   */
  testConnection(): Observable<boolean> {
    const healthCheckUrl = `${endpointurl}/actuator/health`;
    
    return this.http.get(healthCheckUrl, { 
      headers: { 'Cache-Control': 'no-cache' },
      observe: 'response'
    }).pipe(
      timeout(this.healthCheckTimeout),
      map(response => {
        const isHealthy = response.status === 200;
        this.updateConnectionStatus(isHealthy);
        return isHealthy;
      }),
      catchError(error => {
        console.warn('Database health check failed:', error);
        this.updateConnectionStatus(false);
        return of(false);
      })
    );
  }

  /**
   * Gets the current connection health status
   * @returns boolean True if connection is healthy
   */
  isConnectionHealthy(): boolean {
    return this.connectionHealthy;
  }

  /**
   * Gets the timestamp of the last health check
   * @returns Date | null Last health check timestamp
   */
  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck;
  }

  /**
   * Forces a connection health check
   * @returns Observable<boolean> Health check result
   */
  forceHealthCheck(): Observable<boolean> {
    return this.testConnection();
  }

  /**
   * Queues an operation to be executed when connection is restored
   * @param operation The operation to queue
   * @returns Observable<T> The result when operation is executed
   */
  queueOperation<T>(operation: () => Observable<T>): Observable<T> {
    if (this.connectionHealthy) {
      return this.retryOperation(operation);
    }

    return new Observable<T>(subscriber => {
      this.retryQueue.push(() => {
        this.retryOperation(operation).pipe(
          catchError(error => {
            subscriber.error(error);
            return throwError(() => error);
          })
        ).subscribe({
          next: value => subscriber.next(value),
          complete: () => subscriber.complete(),
          error: error => subscriber.error(error)
        });
        
        // Return a dummy observable to satisfy the type requirement
        return this.retryOperation(operation);
      });

      this.processQueue();
    });
  }

  /**
   * Gets network connection information
   * @returns Object with connection details
   */
  getConnectionInfo(): {
    isHealthy: boolean;
    lastCheck: Date | null;
    queueSize: number;
    isOnline: boolean;
  } {
    return {
      isHealthy: this.connectionHealthy,
      lastCheck: this.lastHealthCheck,
      queueSize: this.retryQueue.length,
      isOnline: navigator.onLine
    };
  }

  /**
   * Determines if an error is retriable (connection-related)
   * @param error The error to check
   * @returns boolean True if error is retriable
   */
  private isRetriableError(error: any): boolean {
    // Network errors (no response from server)
    if (error.status === 0) {
      return true;
    }

    // Server errors that might be temporary
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return true;
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return true;
    }

    // Connection-related error messages
    if (error.message) {
      const message = error.message.toLowerCase();
      return message.includes('connection') || 
             message.includes('network') || 
             message.includes('unreachable') ||
             message.includes('refused');
    }

    return false;
  }

  /**
   * Calculates retry delay using exponential backoff with jitter
   * @param attemptNumber The current attempt number (0-based)
   * @returns number Delay in milliseconds
   */
  private calculateRetryDelay(attemptNumber: number): number {
    // Exponential backoff: baseDelay * 2^attemptNumber
    const exponentialDelay = this.baseRetryDelay * Math.pow(2, attemptNumber);
    
    // Add jitter (random factor) to prevent thundering herd
    const jitter = Math.random() * 0.3; // 0-30% jitter
    const delayWithJitter = exponentialDelay * (1 + jitter);
    
    // Cap the delay at maximum
    return Math.min(delayWithJitter, this.maxRetryDelay);
  }

  /**
   * Updates connection status and triggers queue processing if connection restored
   * @param isHealthy New connection health status
   */
  private updateConnectionStatus(isHealthy: boolean): void {
    const wasUnhealthy = !this.connectionHealthy;
    this.connectionHealthy = isHealthy;
    this.lastHealthCheck = new Date();

    // If connection was restored, process queued operations
    if (wasUnhealthy && isHealthy) {
      console.log('Connection restored, processing queued operations');
      this.processQueue();
    }
  }

  /**
   * Processes queued operations when connection is restored
   */
  private processQueue(): void {
    if (this.isProcessingQueue || !this.connectionHealthy || this.retryQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    const operations = [...this.retryQueue];
    this.retryQueue = [];

    console.log(`Processing ${operations.length} queued operations`);

    operations.forEach(operation => {
      try {
        operation();
      } catch (error) {
        console.error('Error processing queued operation:', error);
      }
    });

    this.isProcessingQueue = false;
  }

  /**
   * Starts periodic health checks for database connectivity
   */
  private startPeriodicHealthCheck(): void {
    // Perform initial health check
    this.testConnection().subscribe();
    
    // Set up periodic health checks
    timer(this.healthCheckInterval, this.healthCheckInterval).subscribe(() => {
      this.testConnection().subscribe();
    });

    // Listen to browser online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Browser came online, checking connection');
        this.testConnection().subscribe();
      });

      window.addEventListener('offline', () => {
        console.log('Browser went offline');
        this.updateConnectionStatus(false);
      });
    }
  }

  /**
   * Handles operation errors and provides enhanced error information
   * @param error The error to handle
   * @returns Observable<never> Throws enhanced error
   */
  private handleOperationError(error: any): Observable<never> {
    let errorMessage = 'Operation failed';
    let errorType = 'operation_error';

    if (error.type === 'max_retries_exceeded') {
      errorMessage = 'Unable to complete operation after multiple attempts. Please check your connection and try again.';
      errorType = 'max_retries_exceeded';
    } else if (this.isRetriableError(error)) {
      errorMessage = 'Network connection error. Please check your internet connection.';
      errorType = 'network_error';
    } else if (error.name === 'TimeoutError') {
      errorMessage = 'Request timed out. The server may be busy, please try again.';
      errorType = 'timeout';
    }

    const enhancedError = new Error(errorMessage);
    (enhancedError as any).type = errorType;
    (enhancedError as any).status = error.status || 0;
    (enhancedError as any).originalError = error;

    return throwError(() => enhancedError);
  }
}