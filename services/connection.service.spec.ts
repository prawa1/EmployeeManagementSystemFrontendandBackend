import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError, timer } from 'rxjs';

import { ConnectionService } from './connection.service';
import { endpointurl } from '../model/backendport';

describe('ConnectionService', () => {
  let service: ConnectionService;
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ConnectionService]
    });
    service = TestBed.inject(ConnectionService);
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Connection Health Checks', () => {
    describe('testConnection', () => {
      it('should return true when health check succeeds', () => {
        service.testConnection().subscribe(result => {
          expect(result).toBe(true);
          expect(service.isConnectionHealthy()).toBe(true);
          expect(service.getLastHealthCheck()).toBeTruthy();
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health`);
        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Cache-Control')).toBe('no-cache');
        req.flush({ status: 'UP' }, { status: 200, statusText: 'OK' });
      });

      it('should return false when health check fails with 503', () => {
        service.testConnection().subscribe(result => {
          expect(result).toBe(false);
          expect(service.isConnectionHealthy()).toBe(false);
          expect(service.getLastHealthCheck()).toBeTruthy();
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health`);
        req.flush({}, { status: 503, statusText: 'Service Unavailable' });
      });

      it('should return false when health check times out', fakeAsync(() => {
        let result: boolean | undefined;
        service.testConnection().subscribe(r => result = r);

        const req = httpMock.expectOne(`${endpointurl}/actuator/health`);
        
        // Don't respond to trigger timeout
        tick(5000); // Health check timeout is 5 seconds
        
        expect(result).toBe(false);
        expect(service.isConnectionHealthy()).toBe(false);
      }));

      it('should return false when network error occurs', () => {
        service.testConnection().subscribe(result => {
          expect(result).toBe(false);
          expect(service.isConnectionHealthy()).toBe(false);
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health`);
        req.error(new ErrorEvent('Network error'), { status: 0 });
      });

      it('should update connection status correctly', () => {
        // Initially should be healthy
        expect(service.isConnectionHealthy()).toBe(true);

        // Test failure
        service.testConnection().subscribe();
        const req1 = httpMock.expectOne(`${endpointurl}/actuator/health`);
        req1.flush({}, { status: 503, statusText: 'Service Unavailable' });
        
        expect(service.isConnectionHealthy()).toBe(false);

        // Test recovery
        service.testConnection().subscribe();
        const req2 = httpMock.expectOne(`${endpointurl}/actuator/health`);
        req2.flush({ status: 'UP' }, { status: 200, statusText: 'OK' });
        
        expect(service.isConnectionHealthy()).toBe(true);
      });
    });

    describe('forceHealthCheck', () => {
      it('should perform immediate health check', () => {
        service.forceHealthCheck().subscribe(result => {
          expect(result).toBe(true);
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health`);
        req.flush({ status: 'UP' }, { status: 200, statusText: 'OK' });
      });
    });

    describe('getConnectionInfo', () => {
      it('should return comprehensive connection information', () => {
        const info = service.getConnectionInfo();
        
        expect(info).toEqual({
          isHealthy: jasmine.any(Boolean),
          lastCheck: jasmine.any(Date),
          queueSize: jasmine.any(Number),
          isOnline: jasmine.any(Boolean)
        });
        
        expect(info.queueSize).toBe(0); // Initially empty
        expect(info.isOnline).toBe(navigator.onLine);
      });

      it('should reflect queue size changes', () => {
        // Mock unhealthy connection
        service.testConnection().subscribe();
        const req = httpMock.expectOne(`${endpointurl}/actuator/health`);
        req.flush({}, { status: 503, statusText: 'Service Unavailable' });

        // Queue an operation
        const mockOperation = () => httpClient.get('/test');
        service.queueOperation(mockOperation).subscribe();

        const info = service.getConnectionInfo();
        expect(info.queueSize).toBe(1);
        expect(info.isHealthy).toBe(false);
      });
    });
  });

  describe('Retry Logic and Exponential Backoff', () => {
    describe('retryOperation', () => {
      it('should succeed on first attempt', () => {
        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        
        service.retryOperation(mockOperation).subscribe(result => {
          expect(result).toEqual(mockData);
        });

        const req = httpMock.expectOne('/test');
        req.flush(mockData);
      });

      it('should retry connection errors with exponential backoff', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        let requestCount = 0;
        
        service.retryOperation(mockOperation).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.type).toBe('max_retries_exceeded');
            expect(error.message).toContain('Operation failed after 3 attempts');
            expect(requestCount).toBe(4); // Initial + 3 retries
          }
        );

        // Initial request
        let req = httpMock.expectOne('/test');
        requestCount++;
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // First retry after ~1000ms
        tick(1000);
        req = httpMock.expectOne('/test');
        requestCount++;
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // Second retry after ~2000ms
        tick(2000);
        req = httpMock.expectOne('/test');
        requestCount++;
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // Third retry after ~4000ms
        tick(4000);
        req = httpMock.expectOne('/test');
        requestCount++;
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        tick(1000); // Allow error to propagate
      }));

      it('should succeed after retry', fakeAsync(() => {
        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        
        service.retryOperation(mockOperation).subscribe(result => {
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

      it('should not retry non-retriable errors', () => {
        const mockOperation = () => httpClient.get('/test');
        
        service.retryOperation(mockOperation).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.status).toBe(400);
            // Should not be enhanced with retry error type
            expect(error.type).not.toBe('max_retries_exceeded');
          }
        );

        const req = httpMock.expectOne('/test');
        req.flush('Validation error', { status: 400, statusText: 'Bad Request' });
      });

      it('should retry server errors (502, 503, 504)', fakeAsync(() => {
        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        
        service.retryOperation(mockOperation).subscribe(result => {
          expect(result).toEqual(mockData);
        });

        // First request fails with 503
        let req = httpMock.expectOne('/test');
        req.error(new ErrorEvent('Service error'), { status: 503 });
        
        // Retry succeeds
        tick(1000);
        req = httpMock.expectOne('/test');
        req.flush(mockData);
      }));

      it('should handle timeout errors', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        
        service.retryOperation(mockOperation, 1000).subscribe( // 1 second timeout
          () => fail('Expected timeout'),
          error => {
            expect(error.type).toBe('timeout');
            expect(error.message).toContain('Request timed out');
          }
        );

        // Don't respond to trigger timeout
        httpMock.expectOne('/test');
        tick(1000);
      }));

      it('should use custom timeout and max retries', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        let requestCount = 0;
        
        service.retryOperation(mockOperation, 5000, 2).subscribe( // 2 retries max
          () => fail('Expected error'),
          error => {
            expect(error.type).toBe('max_retries_exceeded');
            expect(error.message).toContain('Operation failed after 2 attempts');
            expect(requestCount).toBe(3); // Initial + 2 retries
          }
        );

        // Make 3 failing requests
        for (let i = 0; i < 3; i++) {
          const req = httpMock.expectOne('/test');
          requestCount++;
          req.error(new ErrorEvent('Network error'), { status: 0 });
          if (i < 2) tick(1000 * Math.pow(2, i));
        }
      }));

      it('should calculate exponential backoff with jitter', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        const startTime = Date.now();
        let retryTimes: number[] = [];
        
        // Mock Math.random to return consistent jitter
        spyOn(Math, 'random').and.returnValue(0.1); // 10% jitter
        
        service.retryOperation(mockOperation).subscribe(
          () => fail('Expected error'),
          error => {
            // Verify exponential backoff timing
            expect(retryTimes.length).toBe(3);
            
            // Base delays: 1000ms, 2000ms, 4000ms with 10% jitter
            expect(retryTimes[0]).toBeCloseTo(1100, -2); // ~1100ms
            expect(retryTimes[1]).toBeCloseTo(2200, -2); // ~2200ms  
            expect(retryTimes[2]).toBeCloseTo(4400, -2); // ~4400ms
          }
        );

        // Track retry timing
        for (let i = 0; i < 4; i++) {
          const req = httpMock.expectOne('/test');
          req.error(new ErrorEvent('Network error'), { status: 0 });
          
          if (i < 3) {
            const beforeTick = Date.now();
            tick(10000); // Tick enough to cover any delay
            retryTimes.push(Date.now() - beforeTick);
          }
        }
      }));
    });

    describe('retryWithUserControl', () => {
      it('should use regular retry when no user callback provided', fakeAsync(() => {
        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        
        service.retryWithUserControl(mockOperation).subscribe(result => {
          expect(result).toEqual(mockData);
        });

        // First request fails
        let req = httpMock.expectOne('/test');
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // Retry succeeds
        tick(1000);
        req = httpMock.expectOne('/test');
        req.flush(mockData);
      }));

      it('should ask user for retry when callback provided', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        const userRetryCallback = jasmine.createSpy('userRetryCallback').and.returnValue(of(true));
        
        service.retryWithUserControl(mockOperation, userRetryCallback).subscribe(
          () => fail('Expected error after max retries'),
          error => {
            expect(userRetryCallback).toHaveBeenCalled();
            expect(error.type).toBe('max_retries_exceeded');
          }
        );

        // Fail all retry attempts
        for (let i = 0; i < 4; i++) {
          const req = httpMock.expectOne('/test');
          req.error(new ErrorEvent('Network error'), { status: 0 });
          if (i < 3) tick(1000 * Math.pow(2, i));
        }
        
        tick(1000); // Allow user retry logic to execute
      }));

      it('should stop retrying when user declines', fakeAsync(() => {
        const mockOperation = () => httpClient.get('/test');
        const userRetryCallback = jasmine.createSpy('userRetryCallback').and.returnValue(of(false));
        
        service.retryWithUserControl(mockOperation, userRetryCallback).subscribe(
          () => fail('Expected error'),
          error => {
            expect(userRetryCallback).toHaveBeenCalledWith(jasmine.any(Object), 3);
            expect(error.type).toBe('max_retries_exceeded');
          }
        );

        // Fail all retry attempts
        for (let i = 0; i < 4; i++) {
          const req = httpMock.expectOne('/test');
          req.error(new ErrorEvent('Network error'), { status: 0 });
          if (i < 3) tick(1000 * Math.pow(2, i));
        }
        
        tick(1000);
      }));

      it('should continue retrying when user approves', fakeAsync(() => {
        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        const userRetryCallback = jasmine.createSpy('userRetryCallback').and.returnValue(of(true));
        
        service.retryWithUserControl(mockOperation, userRetryCallback).subscribe(result => {
          expect(result).toEqual(mockData);
          expect(userRetryCallback).toHaveBeenCalled();
        });

        // Fail initial retry attempts
        for (let i = 0; i < 4; i++) {
          const req = httpMock.expectOne('/test');
          req.error(new ErrorEvent('Network error'), { status: 0 });
          if (i < 3) tick(1000 * Math.pow(2, i));
        }
        
        tick(1000); // User retry logic
        
        // User-initiated retry succeeds
        const retryReq = httpMock.expectOne('/test');
        retryReq.flush(mockData);
      }));
    });
  });

  describe('Operation Queuing', () => {
    describe('queueOperation', () => {
      it('should execute immediately when connection is healthy', () => {
        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        
        service.queueOperation(mockOperation).subscribe(result => {
          expect(result).toEqual(mockData);
        });

        const req = httpMock.expectOne('/test');
        req.flush(mockData);
      });

      it('should queue operation when connection is unhealthy', fakeAsync(() => {
        // Make connection unhealthy
        service.testConnection().subscribe();
        const healthReq = httpMock.expectOne(`${endpointurl}/actuator/health`);
        healthReq.flush({}, { status: 503, statusText: 'Service Unavailable' });

        const mockData = { id: 1, name: 'Test' };
        const mockOperation = () => httpClient.get('/test');
        let operationResult: any;
        
        service.queueOperation(mockOperation).subscribe(result => {
          operationResult = result;
        });

        // Operation should be queued, not executed immediately
        httpMock.expectNone('/test');
        expect(service.getConnectionInfo().queueSize).toBe(1);

        // Restore connection
        service.testConnection().subscribe();
        const healthReq2 = httpMock.expectOne(`${endpointurl}/actuator/health`);
        healthReq2.flush({ status: 'UP' }, { status: 200, statusText: 'OK' });

        // Queued operation should now execute
        tick(100); // Allow queue processing
        const req = httpMock.expectOne('/test');
        req.flush(mockData);

        expect(operationResult).toEqual(mockData);
        expect(service.getConnectionInfo().queueSize).toBe(0);
      }));

      it('should process multiple queued operations when connection restored', fakeAsync(() => {
        // Make connection unhealthy
        service.testConnection().subscribe();
        const healthReq = httpMock.expectOne(`${endpointurl}/actuator/health`);
        healthReq.flush({}, { status: 503, statusText: 'Service Unavailable' });

        // Queue multiple operations
        const mockOperation1 = () => httpClient.get('/test1');
        const mockOperation2 = () => httpClient.get('/test2');
        
        service.queueOperation(mockOperation1).subscribe();
        service.queueOperation(mockOperation2).subscribe();

        expect(service.getConnectionInfo().queueSize).toBe(2);

        // Restore connection
        service.testConnection().subscribe();
        const healthReq2 = httpMock.expectOne(`${endpointurl}/actuator/health`);
        healthReq2.flush({ status: 'UP' }, { status: 200, statusText: 'OK' });

        tick(100); // Allow queue processing

        // Both operations should execute
        const req1 = httpMock.expectOne('/test1');
        const req2 = httpMock.expectOne('/test2');
        req1.flush({ id: 1 });
        req2.flush({ id: 2 });

        expect(service.getConnectionInfo().queueSize).toBe(0);
      }));

      it('should handle queued operation errors gracefully', fakeAsync(() => {
        // Make connection unhealthy
        service.testConnection().subscribe();
        const healthReq = httpMock.expectOne(`${endpointurl}/actuator/health`);
        healthReq.flush({}, { status: 503, statusText: 'Service Unavailable' });

        const mockOperation = () => httpClient.get('/test');
        let operationError: any;
        
        service.queueOperation(mockOperation).subscribe(
          () => fail('Expected error'),
          error => operationError = error
        );

        // Restore connection
        service.testConnection().subscribe();
        const healthReq2 = httpMock.expectOne(`${endpointurl}/actuator/health`);
        healthReq2.flush({ status: 'UP' }, { status: 200, statusText: 'OK' });

        tick(100);

        // Queued operation fails
        const req = httpMock.expectOne('/test');
        req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

        expect(operationError).toBeDefined();
        expect(operationError.status).toBe(500);
      }));
    });
  });

  describe('Error Classification', () => {
    it('should identify retriable network errors', () => {
      const networkError = { status: 0, message: 'Network error' };
      expect((service as any).isRetriableError(networkError)).toBe(true);
    });

    it('should identify retriable server errors', () => {
      const serverErrors = [
        { status: 502, message: 'Bad Gateway' },
        { status: 503, message: 'Service Unavailable' },
        { status: 504, message: 'Gateway Timeout' }
      ];

      serverErrors.forEach(error => {
        expect((service as any).isRetriableError(error)).toBe(true);
      });
    });

    it('should identify retriable timeout errors', () => {
      const timeoutError1 = { name: 'TimeoutError', message: 'Request timeout' };
      const timeoutError2 = { status: 408, message: 'Request timeout occurred' };
      
      expect((service as any).isRetriableError(timeoutError1)).toBe(true);
      expect((service as any).isRetriableError(timeoutError2)).toBe(true);
    });

    it('should identify retriable connection-related errors', () => {
      const connectionErrors = [
        { message: 'Connection refused' },
        { message: 'Network unreachable' },
        { message: 'Connection timeout' }
      ];

      connectionErrors.forEach(error => {
        expect((service as any).isRetriableError(error)).toBe(true);
      });
    });

    it('should not retry client errors', () => {
      const clientErrors = [
        { status: 400, message: 'Bad Request' },
        { status: 401, message: 'Unauthorized' },
        { status: 403, message: 'Forbidden' },
        { status: 404, message: 'Not Found' },
        { status: 409, message: 'Conflict' }
      ];

      clientErrors.forEach(error => {
        expect((service as any).isRetriableError(error)).toBe(false);
      });
    });

    it('should not retry successful responses', () => {
      const successResponses = [
        { status: 200, message: 'OK' },
        { status: 201, message: 'Created' },
        { status: 204, message: 'No Content' }
      ];

      successResponses.forEach(response => {
        expect((service as any).isRetriableError(response)).toBe(false);
      });
    });
  });

  describe('Delay Calculation', () => {
    it('should calculate exponential backoff delays', () => {
      const baseDelay = 1000;
      
      // Mock Math.random to return 0 for consistent testing
      spyOn(Math, 'random').and.returnValue(0);
      
      const delay0 = (service as any).calculateRetryDelay(0);
      const delay1 = (service as any).calculateRetryDelay(1);
      const delay2 = (service as any).calculateRetryDelay(2);
      
      expect(delay0).toBe(baseDelay); // 1000 * 2^0 = 1000
      expect(delay1).toBe(baseDelay * 2); // 1000 * 2^1 = 2000
      expect(delay2).toBe(baseDelay * 4); // 1000 * 2^2 = 4000
    });

    it('should add jitter to delays', () => {
      // Mock Math.random to return 0.5 for 50% jitter
      spyOn(Math, 'random').and.returnValue(0.5);
      
      const delay0 = (service as any).calculateRetryDelay(0);
      
      // Expected: 1000 * (1 + 0.3 * 0.5) = 1000 * 1.15 = 1150
      expect(delay0).toBe(1150);
    });

    it('should cap delays at maximum', () => {
      const maxDelay = 10000;
      
      // Mock Math.random to return 0 for no jitter
      spyOn(Math, 'random').and.returnValue(0);
      
      const delay10 = (service as any).calculateRetryDelay(10); // Would be 1000 * 2^10 = 1,024,000
      
      expect(delay10).toBe(maxDelay);
    });
  });

  describe('Browser Event Handling', () => {
    it('should handle browser online event', () => {
      spyOn(service, 'testConnection').and.returnValue(of(true));
      
      // Simulate browser online event
      window.dispatchEvent(new Event('online'));
      
      expect(service.testConnection).toHaveBeenCalled();
    });

    it('should handle browser offline event', () => {
      // Initially healthy
      expect(service.isConnectionHealthy()).toBe(true);
      
      // Simulate browser offline event
      window.dispatchEvent(new Event('offline'));
      
      expect(service.isConnectionHealthy()).toBe(false);
    });
  });

  describe('Periodic Health Checks', () => {
    it('should perform periodic health checks', fakeAsync(() => {
      spyOn(service, 'testConnection').and.returnValue(of(true));
      
      // Fast-forward past the health check interval (60 seconds)
      tick(60000);
      
      expect(service.testConnection).toHaveBeenCalled();
    }));
  });

  describe('Error Enhancement', () => {
    it('should enhance max retries exceeded error', () => {
      const originalError = { status: 0, message: 'Network error' };
      const enhancedError = (service as any).handleOperationError({
        type: 'max_retries_exceeded',
        status: 0,
        originalError
      });

      enhancedError.subscribe(
        () => fail('Expected error'),
        (error: any) => {
          expect(error.type).toBe('max_retries_exceeded');
          expect(error.message).toContain('Unable to complete operation after multiple attempts');
          expect(error.originalError).toBe(originalError);
        }
      );
    });

    it('should enhance network errors', () => {
      const networkError = { status: 0, message: 'Connection failed' };
      const enhancedError = (service as any).handleOperationError(networkError);

      enhancedError.subscribe(
        () => fail('Expected error'),
        (error: any) => {
          expect(error.type).toBe('network_error');
          expect(error.message).toContain('Network connection error');
          expect(error.originalError).toBe(networkError);
        }
      );
    });

    it('should enhance timeout errors', () => {
      const timeoutError = { name: 'TimeoutError', message: 'Request timeout' };
      const enhancedError = (service as any).handleOperationError(timeoutError);

      enhancedError.subscribe(
        () => fail('Expected error'),
        (error: any) => {
          expect(error.type).toBe('timeout');
          expect(error.message).toContain('Request timed out');
          expect(error.originalError).toBe(timeoutError);
        }
      );
    });

    it('should handle generic operation errors', () => {
      const genericError = { status: 500, message: 'Server error' };
      const enhancedError = (service as any).handleOperationError(genericError);

      enhancedError.subscribe(
        () => fail('Expected error'),
        (error: any) => {
          expect(error.type).toBe('operation_error');
          expect(error.message).toBe('Operation failed');
          expect(error.originalError).toBe(genericError);
        }
      );
    });
  });
});