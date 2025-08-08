import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of, throwError, Subject, EMPTY } from 'rxjs';
import { 
  retry, 
  catchError, 
  timeout, 
  retryWhen, 
  delayWhen, 
  take, 
  concatMap, 
  map, 
  switchMap, 
  tap, 
  mergeMap,
  share,
  startWith
} from 'rxjs/operators';
import { ConnectionService } from './connection.service';
import { DatabaseConfigService } from './database-config.service';

/**
 * Interface for queued operations
 */
export interface QueuedOperation<T> {
  id: string;
  operation: () => Observable<T>;
  priority: 'high' | 'medium' | 'low';
  maxRetries: number;
  currentRetries: number;
  createdAt: Date;
  timeout: number;
  onSuccess?: (result: T) => void;
  onError?: (error: any) => void;
  onProgress?: (status: string) => void;
}

/**
 * Interface for connection recovery status
 */
export interface ConnectionRecoveryStatus {
  isRecovering: boolean;
  recoveryAttempt: number;
  maxRecoveryAttempts: number;
  nextRetryIn: number;
  queueSize: number;
  lastRecoveryAttempt: Date | null;
  recoveryStrategy: 'exponential' | 'linear' | 'immediate';
  degradationLevel: 'none' | 'partial' | 'full';
}

/**
 * Interface for degradation configuration
 */
export interface DegradationConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  enableOfflineMode: boolean;
  enableMockData: boolean;
  enableUserNotification: boolean;
  maxQueueSize: number;
  queueTimeout: number;
}

/**
 * Connection Error Recovery Service
 * Implements automatic retry with exponential backoff, connection queuing, and graceful degradation
 */
@Injectable({
  providedIn: 'root'
})
export class ConnectionRecoveryService {
  // Recovery configuration
  private readonly maxRecoveryAttempts = 10;
  private readonly baseRecoveryDelay = 2000; // 2 seconds
  private readonly maxRecoveryDelay = 300000; // 5 minutes
  private readonly queueProcessingInterval = 5000; // 5 seconds

  // Recovery state
  private recoveryStatusSubject = new BehaviorSubject<ConnectionRecoveryStatus>({
    isRecovering: false,
    recoveryAttempt: 0,
    maxRecoveryAttempts: this.maxRecoveryAttempts,
    nextRetryIn: 0,
    queueSize: 0,
    lastRecoveryAttempt: null,
    recoveryStrategy: 'exponential',
    degradationLevel: 'none'
  });
  public recoveryStatus$ = this.recoveryStatusSubject.asObservable();

  // Operation queue
  private operationQueue: Map<string, QueuedOperation<any>> = new Map();
  private queueSubject = new Subject<QueuedOperation<any>>();
  private isProcessingQueue = false;

  // Degradation configuration
  private degradationConfig: DegradationConfig = {
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    enableOfflineMode: true,
    enableMockData: false,
    enableUserNotification: true,
    maxQueueSize: 100,
    queueTimeout: 600000 // 10 minutes
  };

  // Cache for degraded operations
  private operationCache = new Map<string, { data: any; timestamp: Date; ttl: number }>();

  // Recovery timer
  private recoveryTimer: any;
  private queueProcessingTimer: any;

  constructor(
    private http: HttpClient,
    private connectionService: ConnectionService,
    private databaseConfigService: DatabaseConfigService
  ) {
    this.initializeRecoveryMechanisms();
  }

  /**
   * Initialize recovery mechanisms and monitoring
   */
  private initializeRecoveryMechanisms(): void {
    // Monitor connection health changes
    this.connectionService.getConnectionInfo();
    
    // Start queue processing
    this.startQueueProcessing();

    // Monitor database health for recovery triggers
    this.databaseConfigService.health$.subscribe(health => {
      if (!health.isConnected && !this.recoveryStatusSubject.value.isRecovering) {
        this.startRecoveryProcess();
      } else if (health.isConnected && this.recoveryStatusSubject.value.isRecovering) {
        this.completeRecoveryProcess();
      }
    });

    // Clean up expired cache entries periodically
    timer(60000, 60000).subscribe(() => {
      this.cleanupCache();
    });
  }

  /**
   * Execute operation with automatic retry and recovery mechanisms
   * @param operation Operation to execute
   * @param options Execution options
   * @returns Observable<T> Operation result
   */
  executeWithRecovery<T>(
    operation: () => Observable<T>,
    options: {
      priority?: 'high' | 'medium' | 'low';
      maxRetries?: number;
      timeout?: number;
      cacheKey?: string;
      enableDegradation?: boolean;
      mockData?: T;
    } = {}
  ): Observable<T> {
    const {
      priority = 'medium',
      maxRetries = 3,
      timeout: operationTimeout = 30000,
      cacheKey,
      enableDegradation = true,
      mockData
    } = options;

    // Check if we're in recovery mode
    const recoveryStatus = this.recoveryStatusSubject.value;
    
    if (recoveryStatus.isRecovering && enableDegradation) {
      return this.handleDegradedOperation(operation, {
        cacheKey,
        mockData,
        priority,
        maxRetries,
        timeout: operationTimeout
      });
    }

    // Execute with retry logic
    return this.executeWithRetry(operation, maxRetries, operationTimeout).pipe(
      catchError(error => {
        // If operation fails and we're not in recovery, start recovery
        if (!recoveryStatus.isRecovering && this.isConnectionError(error)) {
          this.startRecoveryProcess();
          
          if (enableDegradation) {
            return this.handleDegradedOperation(operation, {
              cacheKey,
              mockData,
              priority,
              maxRetries,
              timeout: operationTimeout
            });
          }
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Execute operation with retry logic
   * @param operation Operation to execute
   * @param maxRetries Maximum retry attempts
   * @param operationTimeout Operation timeout
   * @returns Observable<T> Operation result
   */
  private executeWithRetry<T>(
    operation: () => Observable<T>,
    maxRetries: number,
    operationTimeout: number
  ): Observable<T> {
    return operation().pipe(
      timeout(operationTimeout),
      retryWhen(errors =>
        errors.pipe(
          concatMap((error, index) => {
            if (index >= maxRetries) {
              return throwError(() => error);
            }

            if (this.isRetriableError(error)) {
              const delay = this.calculateRetryDelay(index);
              console.warn(`Retry attempt ${index + 1}/${maxRetries} in ${delay}ms`);
              return timer(delay);
            }

            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Handle degraded operation execution
   * @param operation Original operation
   * @param options Degradation options
   * @returns Observable<T> Degraded operation result
   */
  private handleDegradedOperation<T>(
    operation: () => Observable<T>,
    options: {
      cacheKey?: string;
      mockData?: T;
      priority: 'high' | 'medium' | 'low';
      maxRetries: number;
      timeout: number;
    }
  ): Observable<T> {
    const { cacheKey, mockData, priority, maxRetries, timeout: operationTimeout } = options;

    // Try cache first if available
    if (cacheKey && this.degradationConfig.enableCaching) {
      const cachedResult = this.getCachedResult<T>(cacheKey);
      if (cachedResult) {
        console.log(`Returning cached result for ${cacheKey}`);
        return of(cachedResult);
      }
    }

    // Try offline mode if enabled
    if (this.degradationConfig.enableOfflineMode) {
      const offlineResult = this.getOfflineResult<T>(cacheKey);
      if (offlineResult) {
        console.log(`Returning offline result for ${cacheKey}`);
        return of(offlineResult);
      }
    }

    // Use mock data if available and enabled
    if (mockData && this.degradationConfig.enableMockData) {
      console.log(`Returning mock data for degraded operation`);
      return of(mockData);
    }

    // Queue operation for later execution
    return this.queueOperation(operation, {
      priority,
      maxRetries,
      timeout: operationTimeout
    });
  }

  /**
   * Queue operation for execution when connection is restored
   * @param operation Operation to queue
   * @param options Queue options
   * @returns Observable<T> Queued operation result
   */
  queueOperation<T>(
    operation: () => Observable<T>,
    options: {
      priority: 'high' | 'medium' | 'low';
      maxRetries: number;
      timeout: number;
    }
  ): Observable<T> {
    const { priority, maxRetries, timeout: operationTimeout } = options;
    
    // Check queue size limit
    if (this.operationQueue.size >= this.degradationConfig.maxQueueSize) {
      return throwError(() => new Error('Operation queue is full. Please try again later.'));
    }

    const operationId = this.generateOperationId();
    
    return new Observable<T>(subscriber => {
      const queuedOperation: QueuedOperation<T> = {
        id: operationId,
        operation,
        priority,
        maxRetries,
        currentRetries: 0,
        createdAt: new Date(),
        timeout: operationTimeout,
        onSuccess: (result: T) => {
          subscriber.next(result);
          subscriber.complete();
        },
        onError: (error: any) => {
          subscriber.error(error);
        },
        onProgress: (status: string) => {
          console.log(`Queued operation ${operationId}: ${status}`);
        }
      };

      this.operationQueue.set(operationId, queuedOperation);
      this.updateQueueSize();

      // Set timeout for queued operation
      const queueTimeout = timer(this.degradationConfig.queueTimeout).subscribe(() => {
        if (this.operationQueue.has(operationId)) {
          this.operationQueue.delete(operationId);
          this.updateQueueSize();
          subscriber.error(new Error('Queued operation timed out'));
        }
      });

      // Cleanup on unsubscribe
      return () => {
        queueTimeout.unsubscribe();
        if (this.operationQueue.has(operationId)) {
          this.operationQueue.delete(operationId);
          this.updateQueueSize();
        }
      };
    });
  }

  /**
   * Start the recovery process
   */
  private startRecoveryProcess(): void {
    const currentStatus = this.recoveryStatusSubject.value;
    
    if (currentStatus.isRecovering) {
      return; // Already recovering
    }

    console.log('Starting connection recovery process');
    
    this.recoveryStatusSubject.next({
      ...currentStatus,
      isRecovering: true,
      recoveryAttempt: 0,
      lastRecoveryAttempt: new Date(),
      degradationLevel: 'partial'
    });

    this.attemptRecovery();
  }

  /**
   * Attempt connection recovery
   */
  private attemptRecovery(): void {
    const currentStatus = this.recoveryStatusSubject.value;
    
    if (currentStatus.recoveryAttempt >= this.maxRecoveryAttempts) {
      this.escalateRecovery();
      return;
    }

    const attemptNumber = currentStatus.recoveryAttempt + 1;
    const delay = this.calculateRecoveryDelay(attemptNumber);

    console.log(`Recovery attempt ${attemptNumber}/${this.maxRecoveryAttempts} in ${delay}ms`);

    this.recoveryStatusSubject.next({
      ...currentStatus,
      recoveryAttempt: attemptNumber,
      nextRetryIn: delay,
      lastRecoveryAttempt: new Date()
    });

    this.recoveryTimer = timer(delay).subscribe(() => {
      this.performRecoveryAttempt().subscribe({
        next: (success) => {
          if (success) {
            this.completeRecoveryProcess();
          } else {
            this.attemptRecovery(); // Try again
          }
        },
        error: () => {
          this.attemptRecovery(); // Try again on error
        }
      });
    });
  }

  /**
   * Perform a single recovery attempt
   * @returns Observable<boolean> Recovery success status
   */
  private performRecoveryAttempt(): Observable<boolean> {
    console.log('Performing recovery attempt...');
    
    // Try multiple recovery strategies
    return this.databaseConfigService.testConnection().pipe(
      switchMap(connectionSuccess => {
        if (connectionSuccess) {
          return of(true);
        }
        
        // Try resetting connection pool
        return this.databaseConfigService.resetConnectionPool().pipe(
          switchMap(resetSuccess => {
            if (resetSuccess) {
              // Test connection again after reset
              return this.databaseConfigService.testConnection();
            }
            return of(false);
          })
        );
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Complete the recovery process
   */
  private completeRecoveryProcess(): void {
    console.log('Connection recovery completed successfully');
    
    if (this.recoveryTimer) {
      this.recoveryTimer.unsubscribe();
      this.recoveryTimer = null;
    }

    this.recoveryStatusSubject.next({
      isRecovering: false,
      recoveryAttempt: 0,
      maxRecoveryAttempts: this.maxRecoveryAttempts,
      nextRetryIn: 0,
      queueSize: this.operationQueue.size,
      lastRecoveryAttempt: new Date(),
      recoveryStrategy: 'exponential',
      degradationLevel: 'none'
    });

    // Process queued operations
    this.processQueuedOperations();
  }

  /**
   * Escalate recovery when max attempts reached
   */
  private escalateRecovery(): void {
    console.error('Connection recovery failed after maximum attempts');
    
    this.recoveryStatusSubject.next({
      ...this.recoveryStatusSubject.value,
      isRecovering: false,
      degradationLevel: 'full'
    });

    // Notify user of connection issues
    if (this.degradationConfig.enableUserNotification) {
      this.notifyUserOfConnectionIssues();
    }

    // Clear old queued operations to prevent memory leaks
    this.clearExpiredOperations();
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    this.queueProcessingTimer = timer(this.queueProcessingInterval, this.queueProcessingInterval)
      .subscribe(() => {
        if (!this.isProcessingQueue && this.operationQueue.size > 0) {
          this.processQueuedOperations();
        }
      });
  }

  /**
   * Process queued operations
   */
  private processQueuedOperations(): void {
    if (this.isProcessingQueue || this.operationQueue.size === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`Processing ${this.operationQueue.size} queued operations`);

    // Sort operations by priority and creation time
    const sortedOperations = Array.from(this.operationQueue.values())
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    // Process operations in batches to avoid overwhelming the server
    const batchSize = 5;
    const batches = this.chunkArray(sortedOperations, batchSize);

    this.processBatches(batches, 0).subscribe({
      complete: () => {
        this.isProcessingQueue = false;
        console.log('Finished processing queued operations');
      },
      error: (error) => {
        this.isProcessingQueue = false;
        console.error('Error processing queued operations:', error);
      }
    });
  }

  /**
   * Process operation batches sequentially
   * @param batches Array of operation batches
   * @param batchIndex Current batch index
   * @returns Observable<void> Processing completion
   */
  private processBatches(batches: QueuedOperation<any>[][], batchIndex: number): Observable<void> {
    if (batchIndex >= batches.length) {
      return of(void 0);
    }

    const batch = batches[batchIndex];
    const batchObservables = batch.map(queuedOp => this.executeQueuedOperation(queuedOp));

    return of(...batchObservables).pipe(
      mergeMap(obs => obs, 3), // Process max 3 operations concurrently
      take(batch.length),
      switchMap(() => {
        // Small delay between batches
        return timer(1000).pipe(
          switchMap(() => this.processBatches(batches, batchIndex + 1))
        );
      })
    );
  }

  /**
   * Execute a queued operation
   * @param queuedOperation Queued operation to execute
   * @returns Observable<void> Execution completion
   */
  private executeQueuedOperation<T>(queuedOperation: QueuedOperation<T>): Observable<void> {
    queuedOperation.onProgress?.('Executing...');

    return this.executeWithRetry(
      queuedOperation.operation,
      queuedOperation.maxRetries - queuedOperation.currentRetries,
      queuedOperation.timeout
    ).pipe(
      tap(result => {
        queuedOperation.onSuccess?.(result);
        this.operationQueue.delete(queuedOperation.id);
        this.updateQueueSize();
      }),
      catchError(error => {
        queuedOperation.currentRetries++;
        
        if (queuedOperation.currentRetries >= queuedOperation.maxRetries) {
          queuedOperation.onError?.(error);
          this.operationQueue.delete(queuedOperation.id);
          this.updateQueueSize();
        } else {
          queuedOperation.onProgress?.(`Retry ${queuedOperation.currentRetries}/${queuedOperation.maxRetries}`);
        }
        
        return EMPTY; // Don't propagate error to batch processing
      }),
      map(() => void 0)
    );
  }

  /**
   * Calculate recovery delay using exponential backoff
   * @param attemptNumber Current attempt number
   * @returns Delay in milliseconds
   */
  private calculateRecoveryDelay(attemptNumber: number): number {
    const exponentialDelay = this.baseRecoveryDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 0.3; // 0-30% jitter
    const delayWithJitter = exponentialDelay * (1 + jitter);
    return Math.min(delayWithJitter, this.maxRecoveryDelay);
  }

  /**
   * Calculate retry delay for individual operations
   * @param attemptNumber Current attempt number
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
    const jitter = Math.random() * 0.3;
    return Math.min(exponentialDelay * (1 + jitter), 10000); // Max 10 seconds
  }

  /**
   * Check if error is connection-related
   * @param error Error to check
   * @returns boolean True if connection error
   */
  private isConnectionError(error: any): boolean {
    return error.status === 0 || 
           error.status === 502 || 
           error.status === 503 || 
           error.status === 504 ||
           error.name === 'TimeoutError';
  }

  /**
   * Check if error is retriable
   * @param error Error to check
   * @returns boolean True if retriable
   */
  private isRetriableError(error: any): boolean {
    return this.isConnectionError(error) || 
           (error.message && error.message.toLowerCase().includes('network'));
  }

  /**
   * Get cached result if available and not expired
   * @param cacheKey Cache key
   * @returns Cached result or null
   */
  private getCachedResult<T>(cacheKey: string): T | null {
    const cached = this.operationCache.get(cacheKey);
    if (!cached) return null;

    const now = new Date();
    const isExpired = (now.getTime() - cached.timestamp.getTime()) > cached.ttl;
    
    if (isExpired) {
      this.operationCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache operation result
   * @param cacheKey Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds
   */
  cacheResult<T>(cacheKey: string, data: T, ttl: number = this.degradationConfig.cacheTimeout): void {
    this.operationCache.set(cacheKey, {
      data,
      timestamp: new Date(),
      ttl
    });
  }

  /**
   * Get offline result (placeholder for offline storage integration)
   * @param cacheKey Cache key
   * @returns Offline result or null
   */
  private getOfflineResult<T>(cacheKey?: string): T | null {
    // This would integrate with offline storage like IndexedDB
    // For now, return null
    return null;
  }

  /**
   * Notify user of connection issues
   */
  private notifyUserOfConnectionIssues(): void {
    // This would integrate with notification service
    console.warn('Connection issues detected. Operating in degraded mode.');
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = new Date();
    for (const [key, cached] of this.operationCache.entries()) {
      const isExpired = (now.getTime() - cached.timestamp.getTime()) > cached.ttl;
      if (isExpired) {
        this.operationCache.delete(key);
      }
    }
  }

  /**
   * Clear expired queued operations
   */
  private clearExpiredOperations(): void {
    const now = new Date();
    const expiredOperations: string[] = [];

    for (const [id, operation] of this.operationQueue.entries()) {
      const age = now.getTime() - operation.createdAt.getTime();
      if (age > this.degradationConfig.queueTimeout) {
        expiredOperations.push(id);
        operation.onError?.(new Error('Operation expired in queue'));
      }
    }

    expiredOperations.forEach(id => this.operationQueue.delete(id));
    this.updateQueueSize();
  }

  /**
   * Update queue size in recovery status
   */
  private updateQueueSize(): void {
    const currentStatus = this.recoveryStatusSubject.value;
    this.recoveryStatusSubject.next({
      ...currentStatus,
      queueSize: this.operationQueue.size
    });
  }

  /**
   * Generate unique operation ID
   * @returns Unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Split array into chunks
   * @param array Array to chunk
   * @param size Chunk size
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Update degradation configuration
   * @param config New configuration
   */
  updateDegradationConfig(config: Partial<DegradationConfig>): void {
    this.degradationConfig = { ...this.degradationConfig, ...config };
  }

  /**
   * Get current degradation configuration
   * @returns Current configuration
   */
  getDegradationConfig(): DegradationConfig {
    return { ...this.degradationConfig };
  }

  /**
   * Get current recovery status
   * @returns Current recovery status
   */
  getCurrentRecoveryStatus(): ConnectionRecoveryStatus {
    return this.recoveryStatusSubject.value;
  }

  /**
   * Force start recovery process (for testing)
   */
  forceStartRecovery(): void {
    this.startRecoveryProcess();
  }

  /**
   * Force complete recovery process (for testing)
   */
  forceCompleteRecovery(): void {
    this.completeRecoveryProcess();
  }

  /**
   * Get queue status
   * @returns Queue information
   */
  getQueueStatus(): {
    size: number;
    operations: Array<{
      id: string;
      priority: string;
      retries: number;
      age: number;
    }>;
  } {
    const now = new Date();
    return {
      size: this.operationQueue.size,
      operations: Array.from(this.operationQueue.values()).map(op => ({
        id: op.id,
        priority: op.priority,
        retries: op.currentRetries,
        age: now.getTime() - op.createdAt.getTime()
      }))
    };
  }

  /**
   * Clear all queued operations
   */
  clearQueue(): void {
    for (const operation of this.operationQueue.values()) {
      operation.onError?.(new Error('Queue cleared'));
    }
    this.operationQueue.clear();
    this.updateQueueSize();
  }

  /**
   * Cleanup resources when service is destroyed
   */
  ngOnDestroy(): void {
    if (this.recoveryTimer) {
      this.recoveryTimer.unsubscribe();
    }
    if (this.queueProcessingTimer) {
      this.queueProcessingTimer.unsubscribe();
    }
    this.clearQueue();
  }
}