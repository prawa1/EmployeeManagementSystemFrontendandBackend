import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError, timer } from 'rxjs';

import { 
  ConnectionRecoveryService, 
  ConnectionRecoveryStatus, 
  QueuedOperation,
  DegradationConfig 
} from './connection-recovery.service';
import { ConnectionService } from './connection.service';
import { DatabaseConfigService, DatabaseHealthStatus } from './database-config.service';

describe('ConnectionRecoveryService', () => {
  let service: ConnectionRecoveryService;
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let connectionService: jasmine.SpyObj<ConnectionService>;
  let databaseConfigService: jasmine.SpyObj<DatabaseConfigService>;

  const mockHealthStatus: DatabaseHealthStatus = {
    isConnected: true,
    responseTime: 100,
    lastCheck: new Date(),
    connectionPool: {
      activeConnections: 5,
      idleConnections: 3,
      totalConnections: 8,
      maxConnections: 20,
      pendingRequests: 0,
      isHealthy: true,
      lastHealthCheck: new Date()
    }
  };

  beforeEach(() => {
    const connectionServiceSpy = jasmine.createSpyObj('ConnectionService', [
      'getConnectionInfo',
      'testConnection',
      'retryOperation'
    ]);

    const databaseConfigServiceSpy = jasmine.createSpyObj('DatabaseConfigService', [
      'testConnection',
      'resetConnectionPool',
      'getCurrentHealthStatus'
    ], {
      health$: of(mockHealthStatus)
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ConnectionRecoveryService,
        { provide: ConnectionService, useValue: connectionServiceSpy },
        { provide: DatabaseConfigService, useValue: databaseConfigServiceSpy }
      ]
    });

    service = TestBed.inject(ConnectionRecoveryService);
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    connectionService = TestBed.inject(ConnectionService) as jasmine.SpyObj<ConnectionService>;
    databaseConfigService = TestBed.inject(DatabaseConfigService) as jasmine.SpyObj<DatabaseConfigService>;

    // Setup default spy returns
    connectionService.getConnectionInfo.and.returnValue({
      isHealthy: true,
      lastCheck: new Date(),
      queueSize: 0,
      isOnline: true
    });
    databaseConfigService.testConnection.and.returnValue(of(true));
    databaseConfigService.resetConnectionPool.and.returnValue(of(true));
  });

  afterEach(() => {
    httpMock.verify();
    service.ngOnDestroy();
  });

  describe('Initialization', () => {
    it('should initialize with default recovery status', () => {
      const status = service.getCurrentRecoveryStatus();
      
      expect(status.isRecovering).toBe(false);
      expect(status.recoveryAttempt).toBe(0);
      expect(status.maxRecoveryAttempts).toBe(10);
      expect(status.queueSize).toBe(0);
      expect(status.degradationLevel).toBe('none');
      expect(status.recoveryStrategy).toBe('exponential');
    });

    it('should start monitoring database health', () => {
      expect(databaseConfigService.health$).toBeDefined();
    });

    it('should initialize degradation config with defaults', () => {
      const config = service.getDegradationConfig();
      
      expect(config.enableCaching).toBe(true);
      expect(config.enableOfflineMode).toBe(true);
      expect(config.enableMockData).toBe(false);
      expect(config.maxQueueSize).toBe(100);
      expect(config.queueTimeout).toBe(600000);
    });
  });

  describe('Operation Execution with Recovery', () => {
    describe('executeWithRecovery', () => {
      it('should execute operation normally when connection is healthy', () => {
        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        
        service.executeWithRecovery(mockOperation).subscribe(result => {
          expect(result).toEqual(mockData);
        });

        const req = httpMock.expectOne('/test');
        req.flush(mockData);
      });

      it('should retry failed operations', fakeAsync(() => {
        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        
        service.executeWithRecovery(mockOperation, { maxRetries: 2 }).subscribe(result => {
          expect(result).toEqual(mockData);
        });

        // First request fails
        let req = httpMock.expectOne('/test');
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // Retry after delay succeeds
        tick(1000);
        req = httpMock.expectOne('/test');
        req.flush(mockData);
      }));

      it('should start recovery process on connection errors', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        let recoveryStatus: ConnectionRecoveryStatus | null = null;
        
        service.recoveryStatus$.subscribe(status => {
          recoveryStatus = status;
        });

        service.executeWithRecovery(mockOperation, { enableDegradation: false }).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.status).toBe(0);
          }
        );

        // Fail all retry attempts
        for (let i = 0; i < 4; i++) {
          const req = httpMock.expectOne('/test');
          req.error(new ErrorEvent('Network error'), { status: 0 });
          if (i < 3) tick(1000 * Math.pow(2, i));
        }

        tick(1000);
        expect(recoveryStatus?.isRecovering).toBe(true);
      }));

      it('should use cached results during degradation', () => {
        const mockData = { id: 1, name: 'Cached' };
        const cacheKey = 'test-operation';
        
        // Cache some data first
        service.cacheResult(cacheKey, mockData);
        
        // Force recovery mode
        service.forceStartRecovery();
        
        const mockOperation = () => httpClient.get('/test');
        
        service.executeWithRecovery(mockOperation, { 
          cacheKey,
          enableDegradation: true 
        }).subscribe(result => {
          expect(result).toEqual(mockData);
        });

        // No HTTP request should be made
        httpMock.expectNone('/test');
      });

      it('should use mock data when available during degradation', () => {
        const mockData = { id: 1, name: 'Mock' };
        
        // Force recovery mode
        service.forceStartRecovery();
        
        // Update config to enable mock data
        service.updateDegradationConfig({ enableMockData: true });
        
        const mockOperation = () => httpClient.get('/test');
        
        service.executeWithRecovery(mockOperation, { 
          mockData,
          enableDegradation: true 
        }).subscribe(result => {
          expect(result).toEqual(mockData);
        });

        httpMock.expectNone('/test');
      });

      it('should queue operations during degradation', fakeAsync(() => {
        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        
        // Force recovery mode
        service.forceStartRecovery();
        
        let operationResult: any;
        service.executeWithRecovery(mockOperation, { 
          enableDegradation: true 
        }).subscribe(result => {
          operationResult = result;
        });

        // Operation should be queued
        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(1);

        // Complete recovery
        service.forceCompleteRecovery();
        
        tick(1000); // Allow queue processing
        
        const req = httpMock.expectOne('/test');
        req.flush(mockData);

        expect(operationResult).toEqual(mockData);
      }));

      it('should respect operation timeout', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        
        service.executeWithRecovery(mockOperation, { 
          timeout: 2000 
        }).subscribe(
          () => fail('Expected timeout'),
          error => {
            expect(error.name).toBe('TimeoutError');
          }
        );

        // Don't respond to trigger timeout
        httpMock.expectOne('/test');
        tick(2000);
      }));

      it('should handle different priority levels', fakeAsync(() => {
        const highPriorityOp = () => httpClient.get('/high');
        const lowPriorityOp = () => httpClient.get('/low');
        
        // Force recovery mode
        service.forceStartRecovery();
        
        // Queue operations with different priorities
        service.executeWithRecovery(lowPriorityOp, { 
          priority: 'low',
          enableDegradation: true 
        }).subscribe();
        
        service.executeWithRecovery(highPriorityOp, { 
          priority: 'high',
          enableDegradation: true 
        }).subscribe();

        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(2);

        // Complete recovery and process queue
        service.forceCompleteRecovery();
        tick(1000);

        // High priority should be processed first
        const highReq = httpMock.expectOne('/high');
        highReq.flush({ priority: 'high' });
        
        tick(1000);
        
        const lowReq = httpMock.expectOne('/low');
        lowReq.flush({ priority: 'low' });
      }));
    });
  });

  describe('Recovery Process', () => {
    describe('Recovery Lifecycle', () => {
      it('should start recovery when database becomes unhealthy', fakeAsync(() => {
        let recoveryStatus: ConnectionRecoveryStatus | null = null;
        
        service.recoveryStatus$.subscribe(status => {
          recoveryStatus = status;
        });

        // Simulate database becoming unhealthy
        const unhealthyStatus = { ...mockHealthStatus, isConnected: false };
        (databaseConfigService as any).health$ = of(unhealthyStatus);
        
        // Trigger health status change
        service.forceStartRecovery();

        expect(recoveryStatus?.isRecovering).toBe(true);
        expect(recoveryStatus?.recoveryAttempt).toBe(0);
        expect(recoveryStatus?.degradationLevel).toBe('partial');
      }));

      it('should perform recovery attempts with exponential backoff', fakeAsync(() => {
        databaseConfigService.testConnection.and.returnValue(of(false));
        
        let recoveryStatus: ConnectionRecoveryStatus | null = null;
        service.recoveryStatus$.subscribe(status => {
          recoveryStatus = status;
        });

        service.forceStartRecovery();
        
        // First attempt should happen immediately
        expect(recoveryStatus?.recoveryAttempt).toBe(1);
        
        tick(2000); // Base delay
        expect(recoveryStatus?.recoveryAttempt).toBe(2);
        
        tick(4000); // Exponential backoff
        expect(recoveryStatus?.recoveryAttempt).toBe(3);
      }));

      it('should complete recovery when connection is restored', fakeAsync(() => {
        let recoveryStatus: ConnectionRecoveryStatus | null = null;
        service.recoveryStatus$.subscribe(status => {
          recoveryStatus = status;
        });

        // Start recovery
        service.forceStartRecovery();
        expect(recoveryStatus?.isRecovering).toBe(true);

        // Simulate successful recovery
        databaseConfigService.testConnection.and.returnValue(of(true));
        service.forceCompleteRecovery();

        expect(recoveryStatus?.isRecovering).toBe(false);
        expect(recoveryStatus?.degradationLevel).toBe('none');
      }));

      it('should escalate to full degradation after max attempts', fakeAsync(() => {
        databaseConfigService.testConnection.and.returnValue(of(false));
        databaseConfigService.resetConnectionPool.and.returnValue(of(false));
        
        let recoveryStatus: ConnectionRecoveryStatus | null = null;
        service.recoveryStatus$.subscribe(status => {
          recoveryStatus = status;
        });

        service.forceStartRecovery();
        
        // Simulate all recovery attempts failing
        for (let i = 0; i < 10; i++) {
          tick(2000 * Math.pow(2, i));
        }

        expect(recoveryStatus?.isRecovering).toBe(false);
        expect(recoveryStatus?.degradationLevel).toBe('full');
      }));

      it('should try connection pool reset during recovery', fakeAsync(() => {
        databaseConfigService.testConnection.and.returnValues(of(false), of(true));
        databaseConfigService.resetConnectionPool.and.returnValue(of(true));
        
        service.forceStartRecovery();
        tick(2000);

        expect(databaseConfigService.resetConnectionPool).toHaveBeenCalled();
        expect(databaseConfigService.testConnection).toHaveBeenCalledTimes(2);
      }));
    });
  });

  describe('Operation Queuing', () => {
    describe('queueOperation', () => {
      it('should queue operations with different priorities', () => {
        const highPriorityOp = () => httpClient.get('/high');
        const mediumPriorityOp = () => httpClient.get('/medium');
        const lowPriorityOp = () => httpClient.get('/low');
        
        service.queueOperation(lowPriorityOp, { 
          priority: 'low', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe();
        
        service.queueOperation(highPriorityOp, { 
          priority: 'high', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe();
        
        service.queueOperation(mediumPriorityOp, { 
          priority: 'medium', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe();

        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(3);
        
        const priorities = queueStatus.operations.map(op => op.priority);
        expect(priorities).toContain('high');
        expect(priorities).toContain('medium');
        expect(priorities).toContain('low');
      });

      it('should reject operations when queue is full', () => {
        service.updateDegradationConfig({ maxQueueSize: 2 });
        
        const mockOperation = () => httpClient.get('/test');
        
        // Fill queue to capacity
        service.queueOperation(mockOperation, { 
          priority: 'medium', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe();
        
        service.queueOperation(mockOperation, { 
          priority: 'medium', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe();

        // Third operation should be rejected
        service.queueOperation(mockOperation, { 
          priority: 'medium', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.message).toContain('Operation queue is full');
          }
        );
      });

      it('should timeout queued operations', fakeAsync(() => {
        service.updateDegradationConfig({ queueTimeout: 5000 });
        
        const mockOperation = () => httpClient.get('/test');
        
        service.queueOperation(mockOperation, { 
          priority: 'medium', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe(
          () => fail('Expected timeout'),
          error => {
            expect(error.message).toContain('Queued operation timed out');
          }
        );

        tick(5000);
        
        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(0);
      }));

      it('should process queued operations in priority order', fakeAsync(() => {
        const results: string[] = [];
        
        // Queue operations in reverse priority order
        service.queueOperation(() => httpClient.get('/low'), { 
          priority: 'low', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe(result => results.push('low'));
        
        service.queueOperation(() => httpClient.get('/high'), { 
          priority: 'high', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe(result => results.push('high'));
        
        service.queueOperation(() => httpClient.get('/medium'), { 
          priority: 'medium', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe(result => results.push('medium'));

        // Process queue
        service.forceCompleteRecovery();
        tick(1000);

        // Respond to requests in order they're made (which should be priority order)
        const highReq = httpMock.expectOne('/high');
        highReq.flush('high-result');
        
        tick(1000);
        
        const mediumReq = httpMock.expectOne('/medium');
        mediumReq.flush('medium-result');
        
        tick(1000);
        
        const lowReq = httpMock.expectOne('/low');
        lowReq.flush('low-result');

        expect(results).toEqual(['high', 'medium', 'low']);
      }));

      it('should retry failed queued operations', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        let operationResult: any;
        
        service.queueOperation(mockOperation, { 
          priority: 'medium', 
          maxRetries: 2, 
          timeout: 30000 
        }).subscribe(result => {
          operationResult = result;
        });

        service.forceCompleteRecovery();
        tick(1000);

        // First attempt fails
        let req = httpMock.expectOne('/test');
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        tick(1000);
        
        // Second attempt succeeds
        req = httpMock.expectOne('/test');
        req.flush({ success: true });

        expect(operationResult).toEqual({ success: true });
      }));

      it('should remove operations after max retries', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        
        service.queueOperation(mockOperation, { 
          priority: 'medium', 
          maxRetries: 1, 
          timeout: 30000 
        }).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.status).toBe(0);
          }
        );

        service.forceCompleteRecovery();
        tick(1000);

        // Both attempts fail
        let req = httpMock.expectOne('/test');
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        tick(1000);
        
        req = httpMock.expectOne('/test');
        req.error(new ErrorEvent('Network error'), { status: 0 });

        tick(1000);
        
        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(0);
      }));
    });

    describe('Queue Management', () => {
      it('should provide queue status information', () => {
        const mockOperation = () => httpClient.get('/test');
        
        service.queueOperation(mockOperation, { 
          priority: 'high', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe();

        const queueStatus = service.getQueueStatus();
        
        expect(queueStatus.size).toBe(1);
        expect(queueStatus.operations.length).toBe(1);
        expect(queueStatus.operations[0].priority).toBe('high');
        expect(queueStatus.operations[0].retries).toBe(0);
        expect(queueStatus.operations[0].age).toBeGreaterThanOrEqual(0);
      });

      it('should clear all queued operations', () => {
        const mockOperation = () => httpClient.get('/test');
        
        service.queueOperation(mockOperation, { 
          priority: 'medium', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.message).toBe('Queue cleared');
          }
        );

        service.clearQueue();
        
        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(0);
      });

      it('should clean up expired operations', fakeAsync(() => {
        service.updateDegradationConfig({ queueTimeout: 1000 });
        
        const mockOperation = () => httpClient.get('/test');
        
        service.queueOperation(mockOperation, { 
          priority: 'medium', 
          maxRetries: 3, 
          timeout: 30000 
        }).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.message).toBe('Operation expired in queue');
          }
        );

        // Force escalation to trigger cleanup
        service.forceStartRecovery();
        for (let i = 0; i < 10; i++) {
          tick(2000 * Math.pow(2, i));
        }

        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(0);
      }));
    });
  });

  describe('Caching and Degradation', () => {
    describe('Result Caching', () => {
      it('should cache operation results', () => {
        const testData = { id: 1, name: 'Test' };
        const cacheKey = 'test-key';
        
        service.cacheResult(cacheKey, testData);
        
        // Access cached result through degraded operation
        service.forceStartRecovery();
        
        const mockOperation = () => httpClient.get('/test');
        
        service.executeWithRecovery(mockOperation, { 
          cacheKey,
          enableDegradation: true 
        }).subscribe(result => {
          expect(result).toEqual(testData);
        });

        httpMock.expectNone('/test');
      });

      it('should expire cached results after TTL', fakeAsync(() => {
        const testData = { id: 1, name: 'Test' };
        const cacheKey = 'test-key';
        const shortTTL = 1000; // 1 second
        
        service.cacheResult(cacheKey, testData, shortTTL);
        
        // Should return cached result immediately
        service.forceStartRecovery();
        
        let mockOperation = () => httpClient.get('/test');
        
        service.executeWithRecovery(mockOperation, { 
          cacheKey,
          enableDegradation: true 
        }).subscribe(result => {
          expect(result).toEqual(testData);
        });

        httpMock.expectNone('/test');
        
        // Wait for cache to expire
        tick(1100);
        
        // Should queue operation now that cache is expired
        service.executeWithRecovery(mockOperation, { 
          cacheKey,
          enableDegradation: true 
        }).subscribe();

        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(1);
      }));

      it('should clean up expired cache entries', fakeAsync(() => {
        const testData = { id: 1, name: 'Test' };
        service.cacheResult('key1', testData, 1000);
        service.cacheResult('key2', testData, 60000);
        
        // Trigger cache cleanup (runs every 60 seconds)
        tick(60000);
        
        // key1 should be expired and cleaned up
        service.forceStartRecovery();
        
        const mockOperation = () => httpClient.get('/test');
        
        // key1 should not be found in cache
        service.executeWithRecovery(mockOperation, { 
          cacheKey: 'key1',
          enableDegradation: true 
        }).subscribe();

        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(1);
        
        // key2 should still be in cache
        service.executeWithRecovery(mockOperation, { 
          cacheKey: 'key2',
          enableDegradation: true 
        }).subscribe(result => {
          expect(result).toEqual(testData);
        });

        httpMock.expectNone('/test');
      }));
    });

    describe('Degradation Configuration', () => {
      it('should update degradation configuration', () => {
        const newConfig: Partial<DegradationConfig> = {
          enableCaching: false,
          enableMockData: true,
          maxQueueSize: 50
        };
        
        service.updateDegradationConfig(newConfig);
        
        const updatedConfig = service.getDegradationConfig();
        expect(updatedConfig.enableCaching).toBe(false);
        expect(updatedConfig.enableMockData).toBe(true);
        expect(updatedConfig.maxQueueSize).toBe(50);
        expect(updatedConfig.enableOfflineMode).toBe(true); // Should retain other values
      });

      it('should respect caching configuration', () => {
        service.updateDegradationConfig({ enableCaching: false });
        
        const testData = { id: 1, name: 'Test' };
        const cacheKey = 'test-key';
        
        service.cacheResult(cacheKey, testData);
        service.forceStartRecovery();
        
        const mockOperation = () => httpClient.get('/test');
        
        // Should queue operation instead of using cache
        service.executeWithRecovery(mockOperation, { 
          cacheKey,
          enableDegradation: true 
        }).subscribe();

        const queueStatus = service.getQueueStatus();
        expect(queueStatus.size).toBe(1);
      });

      it('should respect mock data configuration', () => {
        service.updateDegradationConfig({ enableMockData: true });
        
        const mockData = { id: 1, name: 'Mock' };
        service.forceStartRecovery();
        
        const mockOperation = () => httpClient.get('/test');
        
        service.executeWithRecovery(mockOperation, { 
          mockData,
          enableDegradation: true 
        }).subscribe(result => {
          expect(result).toEqual(mockData);
        });

        httpMock.expectNone('/test');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed operations gracefully', fakeAsync(() => {
      const faultyOperation = () => throwError(() => new Error('Operation error'));
      
      service.executeWithRecovery(faultyOperation).subscribe(
        () => fail('Expected error'),
        error => {
          expect(error.message).toBe('Operation error');
        }
      );

      tick(1000);
    }));

    it('should handle queue processing errors gracefully', fakeAsync(() => {
      const faultyOperation = () => throwError(() => new Error('Queue operation error'));
      
      service.queueOperation(faultyOperation, { 
        priority: 'medium', 
        maxRetries: 1, 
        timeout: 30000 
      }).subscribe(
        () => fail('Expected error'),
        error => {
          expect(error.message).toBe('Queue operation error');
        }
      );

      service.forceCompleteRecovery();
      tick(2000);
      
      const queueStatus = service.getQueueStatus();
      expect(queueStatus.size).toBe(0);
    }));

    it('should handle concurrent recovery attempts', () => {
      let recoveryStatus: ConnectionRecoveryStatus | null = null;
      service.recoveryStatus$.subscribe(status => {
        recoveryStatus = status;
      });

      // Start recovery multiple times
      service.forceStartRecovery();
      service.forceStartRecovery();
      service.forceStartRecovery();

      // Should only have one recovery process
      expect(recoveryStatus?.isRecovering).toBe(true);
      expect(recoveryStatus?.recoveryAttempt).toBe(0);
    });

    it('should handle service destruction gracefully', () => {
      const mockOperation = () => httpClient.get('/test');
      
      service.queueOperation(mockOperation, { 
        priority: 'medium', 
        maxRetries: 3, 
        timeout: 30000 
      }).subscribe(
        () => fail('Expected error'),
        error => {
          expect(error.message).toBe('Queue cleared');
        }
      );

      service.ngOnDestroy();
      
      const queueStatus = service.getQueueStatus();
      expect(queueStatus.size).toBe(0);
    });
  });

  describe('Observable Streams', () => {
    it('should provide recoveryStatus$ observable', () => {
      let statusEmissions = 0;
      
      service.recoveryStatus$.subscribe(status => {
        statusEmissions++;
        expect(status).toBeDefined();
        expect(status.isRecovering).toBeDefined();
        expect(status.queueSize).toBeDefined();
      });

      expect(statusEmissions).toBe(1); // Initial emission
    });

    it('should emit status updates during recovery', fakeAsync(() => {
      const statusUpdates: ConnectionRecoveryStatus[] = [];
      
      service.recoveryStatus$.subscribe(status => {
        statusUpdates.push(status);
      });

      service.forceStartRecovery();
      tick(2000);
      service.forceCompleteRecovery();

      expect(statusUpdates.length).toBeGreaterThan(1);
      expect(statusUpdates[0].isRecovering).toBe(false); // Initial
      expect(statusUpdates[1].isRecovering).toBe(true);  // Started
      expect(statusUpdates[statusUpdates.length - 1].isRecovering).toBe(false); // Completed
    }));
  });

  describe('Integration with Other Services', () => {
    it('should integrate with ConnectionService', () => {
      expect(connectionService.getConnectionInfo).toHaveBeenCalled();
    });

    it('should integrate with DatabaseConfigService', () => {
      service.forceStartRecovery();
      expect(databaseConfigService.testConnection).toHaveBeenCalled();
    });

    it('should respond to database health changes', fakeAsync(() => {
      let recoveryStatus: ConnectionRecoveryStatus | null = null;
      service.recoveryStatus$.subscribe(status => {
        recoveryStatus = status;
      });

      // Simulate database health change to unhealthy
      const unhealthyStatus = { ...mockHealthStatus, isConnected: false };
      (databaseConfigService as any).health$.next(unhealthyStatus);
      
      tick(100);
      
      expect(recoveryStatus?.isRecovering).toBe(true);
    }));
  });
});