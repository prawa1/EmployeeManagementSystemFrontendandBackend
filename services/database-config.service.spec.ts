import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';

import { DatabaseConfigService, DatabaseConfig, DatabaseHealthStatus, ConnectionPoolStatus } from './database-config.service';
import { endpointurl } from '../model/backendport';

describe('DatabaseConfigService', () => {
  let service: DatabaseConfigService;
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  const mockConfig: DatabaseConfig = {
    host: 'localhost',
    port: 3306,
    database: 'test_db',
    maxConnections: 15,
    minConnections: 3,
    connectionTimeout: 25000,
    idleTimeout: 500000,
    maxLifetime: 1500000,
    testQuery: 'SELECT 1',
    validationTimeout: 4000
  };

  const mockHealthResponse = {
    status: 'UP',
    details: {
      activeConnections: 5,
      idleConnections: 3,
      totalConnections: 8,
      maxConnections: 20,
      pendingRequests: 1,
      isHealthy: true
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DatabaseConfigService]
    });
    service = TestBed.inject(DatabaseConfigService);
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.ngOnDestroy();
  });

  describe('Configuration Management', () => {
    describe('getCurrentConfig', () => {
      it('should return default configuration initially', () => {
        const config = service.getCurrentConfig();
        
        expect(config.host).toBe('localhost');
        expect(config.port).toBe(3306);
        expect(config.database).toBe('Employee_management_system');
        expect(config.maxConnections).toBe(20);
        expect(config.minConnections).toBe(5);
      });
    });

    describe('updateConfig', () => {
      it('should update configuration successfully', () => {
        const partialConfig = { maxConnections: 25, minConnections: 8 };
        
        service.updateConfig(partialConfig).subscribe(result => {
          expect(result).toBe(true);
          
          const updatedConfig = service.getCurrentConfig();
          expect(updatedConfig.maxConnections).toBe(25);
          expect(updatedConfig.minConnections).toBe(8);
          expect(updatedConfig.host).toBe('localhost'); // Should retain other values
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/config`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body.maxConnections).toBe(25);
        req.flush({ success: true });
      });

      it('should update local config even if backend update fails', () => {
        const partialConfig = { maxConnections: 25 };
        
        service.updateConfig(partialConfig).subscribe(result => {
          expect(result).toBe(true);
          
          const updatedConfig = service.getCurrentConfig();
          expect(updatedConfig.maxConnections).toBe(25);
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/config`);
        req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      });

      it('should reject invalid configuration', () => {
        const invalidConfig = { maxConnections: -5, port: 70000 };
        
        service.updateConfig(invalidConfig).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.message).toContain('Invalid configuration');
            expect(error.message).toContain('Max connections must be between 1 and 100');
            expect(error.message).toContain('Port must be between 1 and 65535');
          }
        );

        httpMock.expectNone(`${endpointurl}/admin/database/config`);
      });

      it('should validate all configuration fields', () => {
        const testCases = [
          { config: { host: '' }, expectedError: 'Host is required' },
          { config: { port: 0 }, expectedError: 'Port must be between 1 and 65535' },
          { config: { port: 70000 }, expectedError: 'Port must be between 1 and 65535' },
          { config: { database: '' }, expectedError: 'Database name is required' },
          { config: { maxConnections: 0 }, expectedError: 'Max connections must be between 1 and 100' },
          { config: { maxConnections: 150 }, expectedError: 'Max connections must be between 1 and 100' },
          { config: { minConnections: -1 }, expectedError: 'Min connections must be less than max connections' },
          { config: { minConnections: 25, maxConnections: 20 }, expectedError: 'Min connections must be less than max connections' },
          { config: { connectionTimeout: 500 }, expectedError: 'Connection timeout must be between 1 second and 5 minutes' },
          { config: { connectionTimeout: 400000 }, expectedError: 'Connection timeout must be between 1 second and 5 minutes' },
          { config: { validationTimeout: 500 }, expectedError: 'Validation timeout must be between 1 and 30 seconds' },
          { config: { validationTimeout: 35000 }, expectedError: 'Validation timeout must be between 1 and 30 seconds' }
        ];

        testCases.forEach(testCase => {
          service.updateConfig(testCase.config).subscribe(
            () => fail(`Expected error for config: ${JSON.stringify(testCase.config)}`),
            error => {
              expect(error.message).toContain(testCase.expectedError);
            }
          );
        });

        httpMock.expectNone(`${endpointurl}/admin/database/config`);
      });
    });

    describe('config$ observable', () => {
      it('should emit configuration changes', fakeAsync(() => {
        let emittedConfigs: DatabaseConfig[] = [];
        
        service.config$.subscribe(config => {
          emittedConfigs.push(config);
        });

        // Initial config should be emitted
        expect(emittedConfigs.length).toBe(1);
        expect(emittedConfigs[0].maxConnections).toBe(20);

        // Update config
        service.updateConfig({ maxConnections: 30 }).subscribe();
        
        const req = httpMock.expectOne(`${endpointurl}/admin/database/config`);
        req.flush({ success: true });
        
        tick();

        expect(emittedConfigs.length).toBe(2);
        expect(emittedConfigs[1].maxConnections).toBe(30);
      }));
    });
  });

  describe('Connection Testing', () => {
    describe('testConnection', () => {
      it('should return true for successful connection test', () => {
        service.testConnection().subscribe(result => {
          expect(result).toBe(true);
          
          const healthStatus = service.getCurrentHealthStatus();
          expect(healthStatus.isConnected).toBe(true);
          expect(healthStatus.responseTime).toBeGreaterThan(0);
          expect(healthStatus.errorMessage).toBeUndefined();
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Cache-Control')).toBe('no-cache');
        req.flush({ status: 'UP' }, { status: 200, statusText: 'OK' });
      });

      it('should return false for failed connection test', () => {
        service.testConnection().subscribe(result => {
          expect(result).toBe(false);
          
          const healthStatus = service.getCurrentHealthStatus();
          expect(healthStatus.isConnected).toBe(false);
          expect(healthStatus.errorMessage).toBe('Database service unavailable');
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
        req.flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });
      });

      it('should handle timeout errors', fakeAsync(() => {
        service.testConnection().subscribe(result => {
          expect(result).toBe(false);
          
          const healthStatus = service.getCurrentHealthStatus();
          expect(healthStatus.isConnected).toBe(false);
          expect(healthStatus.errorMessage).toBe('Database connection timeout');
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
        // Don't respond to trigger timeout
        tick(5000); // Default validation timeout
        
        expect(service.getCurrentHealthStatus().isConnected).toBe(false);
      }));

      it('should handle network errors', () => {
        service.testConnection().subscribe(result => {
          expect(result).toBe(false);
          
          const healthStatus = service.getCurrentHealthStatus();
          expect(healthStatus.isConnected).toBe(false);
          expect(healthStatus.errorMessage).toBe('Unable to reach database server');
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
        req.error(new ErrorEvent('Network error'), { status: 0 });
      });
    });

    describe('testConnectionWithConfig', () => {
      it('should test connection with custom configuration', () => {
        service.testConnectionWithConfig(mockConfig).subscribe(result => {
          expect(result).toBe(true);
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/test-connection`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(mockConfig);
        req.flush({ success: true });
      });

      it('should reject invalid custom configuration', () => {
        const invalidConfig = { ...mockConfig, port: -1 };
        
        service.testConnectionWithConfig(invalidConfig).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.message).toContain('Invalid configuration');
            expect(error.message).toContain('Port must be between 1 and 65535');
          }
        );

        httpMock.expectNone(`${endpointurl}/admin/database/test-connection`);
      });

      it('should handle test connection failures', () => {
        service.testConnectionWithConfig(mockConfig).subscribe(result => {
          expect(result).toBe(false);
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/test-connection`);
        req.flush('Connection failed', { status: 500, statusText: 'Internal Server Error' });
      });
    });
  });

  describe('Health Monitoring', () => {
    describe('performHealthCheck', () => {
      it('should perform comprehensive health check', () => {
        service.performHealthCheck().subscribe(healthStatus => {
          expect(healthStatus.isConnected).toBe(true);
          expect(healthStatus.responseTime).toBeGreaterThan(0);
          expect(healthStatus.connectionPool.activeConnections).toBe(5);
          expect(healthStatus.connectionPool.totalConnections).toBe(8);
          expect(healthStatus.serverInfo?.version).toBe('MySQL 8.0.25');
        });

        // Health check request
        const healthReq = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
        healthReq.flush(mockHealthResponse);

        // Server info request
        const infoReq = httpMock.expectOne(`${endpointurl}/admin/database/info`);
        infoReq.flush({ version: 'MySQL 8.0.25', uptime: 3600 });
      });

      it('should handle health check without server info', () => {
        service.performHealthCheck().subscribe(healthStatus => {
          expect(healthStatus.isConnected).toBe(true);
          expect(healthStatus.connectionPool.activeConnections).toBe(5);
          expect(healthStatus.serverInfo).toBeUndefined();
        });

        const healthReq = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
        healthReq.flush(mockHealthResponse);

        const infoReq = httpMock.expectOne(`${endpointurl}/admin/database/info`);
        infoReq.error(new ErrorEvent('Not found'), { status: 404 });
      });

      it('should handle failed health check', () => {
        service.performHealthCheck().subscribe(healthStatus => {
          expect(healthStatus.isConnected).toBe(false);
          expect(healthStatus.errorMessage).toBe('Health check failed');
          expect(healthStatus.connectionPool.isHealthy).toBe(false);
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
        req.error(new ErrorEvent('Network error'), { status: 0 });
      });

      it('should update health subject', () => {
        let emittedHealth: DatabaseHealthStatus[] = [];
        
        service.health$.subscribe(health => {
          emittedHealth.push(health);
        });

        service.performHealthCheck().subscribe();

        const req = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
        req.flush(mockHealthResponse);

        const infoReq = httpMock.expectOne(`${endpointurl}/admin/database/info`);
        infoReq.flush({ version: 'MySQL 8.0.25', uptime: 3600 });

        expect(emittedHealth.length).toBe(2); // Initial + updated
        expect(emittedHealth[1].isConnected).toBe(true);
      });
    });

    describe('monitorConnectionPool', () => {
      it('should monitor connection pool status', () => {
        const mockPoolStatus = {
          activeConnections: 7,
          idleConnections: 2,
          totalConnections: 9,
          maxConnections: 20,
          pendingRequests: 3,
          isHealthy: true
        };

        service.monitorConnectionPool().subscribe(poolStatus => {
          expect(poolStatus.activeConnections).toBe(7);
          expect(poolStatus.idleConnections).toBe(2);
          expect(poolStatus.totalConnections).toBe(9);
          expect(poolStatus.pendingRequests).toBe(3);
          expect(poolStatus.isHealthy).toBe(true);
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/pool-status`);
        req.flush(mockPoolStatus);
      });

      it('should handle pool monitoring failure', () => {
        service.monitorConnectionPool().subscribe(poolStatus => {
          expect(poolStatus.activeConnections).toBe(0);
          expect(poolStatus.isHealthy).toBe(false);
          expect(poolStatus.maxConnections).toBe(20); // Should use default
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/pool-status`);
        req.error(new ErrorEvent('Network error'), { status: 0 });
      });

      it('should update health subject with pool status', () => {
        let latestHealth: DatabaseHealthStatus | null = null;
        
        service.health$.subscribe(health => {
          latestHealth = health;
        });

        service.monitorConnectionPool().subscribe();

        const req = httpMock.expectOne(`${endpointurl}/admin/database/pool-status`);
        req.flush({
          activeConnections: 10,
          idleConnections: 5,
          totalConnections: 15,
          isHealthy: true
        });

        expect(latestHealth?.connectionPool.activeConnections).toBe(10);
        expect(latestHealth?.connectionPool.totalConnections).toBe(15);
      });
    });

    describe('forceHealthCheck', () => {
      it('should force immediate health check', () => {
        service.forceHealthCheck().subscribe(healthStatus => {
          expect(healthStatus.isConnected).toBe(true);
        });

        const healthReq = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
        healthReq.flush(mockHealthResponse);

        const infoReq = httpMock.expectOne(`${endpointurl}/admin/database/info`);
        infoReq.flush({ version: 'MySQL 8.0.25', uptime: 3600 });
      });
    });
  });

  describe('Connection Pool Management', () => {
    describe('resetConnectionPool', () => {
      it('should reset connection pool successfully', () => {
        service.resetConnectionPool().subscribe(result => {
          expect(result).toBe(true);
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/reset-pool`);
        expect(req.request.method).toBe('POST');
        req.flush({ success: true });
      });

      it('should handle reset failure', () => {
        service.resetConnectionPool().subscribe(result => {
          expect(result).toBe(false);
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/reset-pool`);
        req.flush('Reset failed', { status: 500, statusText: 'Internal Server Error' });
      });
    });

    describe('getConfigurationRecommendations', () => {
      it('should get configuration recommendations', () => {
        const mockRecommendations = {
          maxConnections: 25,
          minConnections: 8,
          connectionTimeout: 35000,
          idleTimeout: 700000
        };

        service.getConfigurationRecommendations().subscribe(recommendations => {
          expect(recommendations.maxConnections).toBe(25);
          expect(recommendations.minConnections).toBe(8);
          expect(recommendations.connectionTimeout).toBe(35000);
          expect(recommendations.idleTimeout).toBe(700000);
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/recommendations`);
        req.flush(mockRecommendations);
      });

      it('should return default recommendations on failure', () => {
        service.getConfigurationRecommendations().subscribe(recommendations => {
          expect(recommendations.maxConnections).toBe(20);
          expect(recommendations.minConnections).toBe(5);
          expect(recommendations.connectionTimeout).toBe(30000);
          expect(recommendations.idleTimeout).toBe(600000);
        });

        const req = httpMock.expectOne(`${endpointurl}/admin/database/recommendations`);
        req.error(new ErrorEvent('Network error'), { status: 0 });
      });
    });
  });

  describe('Testing Utilities', () => {
    describe('createTestingUtilities', () => {
      let testUtils: any;

      beforeEach(() => {
        testUtils = service.createTestingUtilities();
      });

      it('should simulate connection failure', () => {
        testUtils.simulateConnectionFailure().subscribe((result: boolean) => {
          expect(result).toBe(false);
          
          const healthStatus = service.getCurrentHealthStatus();
          expect(healthStatus.isConnected).toBe(false);
          expect(healthStatus.errorMessage).toBe('Simulated connection failure');
        });
      });

      it('should simulate connection recovery', () => {
        testUtils.simulateConnectionRecovery().subscribe((result: boolean) => {
          expect(result).toBe(true);
          
          const healthStatus = service.getCurrentHealthStatus();
          expect(healthStatus.isConnected).toBe(true);
          expect(healthStatus.errorMessage).toBeUndefined();
          expect(healthStatus.responseTime).toBe(50);
        });
      });

      it('should provide mock pool status', () => {
        const mockPoolStatus = testUtils.getMockPoolStatus();
        
        expect(mockPoolStatus.activeConnections).toBe(5);
        expect(mockPoolStatus.idleConnections).toBe(3);
        expect(mockPoolStatus.totalConnections).toBe(8);
        expect(mockPoolStatus.maxConnections).toBe(20);
        expect(mockPoolStatus.pendingRequests).toBe(2);
        expect(mockPoolStatus.isHealthy).toBe(true);
      });

      it('should test configuration validation', () => {
        const validConfig = { maxConnections: 15, minConnections: 5 };
        const invalidConfig = { maxConnections: -5, port: 70000 };

        const validResult = testUtils.testConfigValidation(validConfig);
        expect(validResult.isValid).toBe(true);
        expect(validResult.errors.length).toBe(0);

        const invalidResult = testUtils.testConfigValidation(invalidConfig);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors.length).toBeGreaterThan(0);
        expect(invalidResult.errors).toContain('Max connections must be between 1 and 100');
        expect(invalidResult.errors).toContain('Port must be between 1 and 65535');
      });
    });
  });

  describe('Periodic Monitoring', () => {
    it('should start periodic health checks on initialization', fakeAsync(() => {
      // Health checks should start immediately and then every 30 seconds
      tick(0); // Initial check
      
      let req = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
      req.flush(mockHealthResponse);
      
      let infoReq = httpMock.expectOne(`${endpointurl}/admin/database/info`);
      infoReq.flush({ version: 'MySQL 8.0.25', uptime: 3600 });

      // Next check after 30 seconds
      tick(30000);
      
      req = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
      req.flush(mockHealthResponse);
      
      infoReq = httpMock.expectOne(`${endpointurl}/admin/database/info`);
      infoReq.flush({ version: 'MySQL 8.0.25', uptime: 3600 });
    }));

    it('should start periodic pool monitoring on initialization', fakeAsync(() => {
      // Pool monitoring should start immediately and then every 10 seconds
      tick(0); // Initial check
      
      let req = httpMock.expectOne(`${endpointurl}/admin/database/pool-status`);
      req.flush({ activeConnections: 5, isHealthy: true });

      // Next check after 10 seconds
      tick(10000);
      
      req = httpMock.expectOne(`${endpointurl}/admin/database/pool-status`);
      req.flush({ activeConnections: 6, isHealthy: true });
    }));
  });

  describe('Observable Streams', () => {
    it('should provide config$ observable', () => {
      let configEmissions = 0;
      
      service.config$.subscribe(config => {
        configEmissions++;
        expect(config).toBeDefined();
        expect(config.host).toBeDefined();
        expect(config.port).toBeDefined();
      });

      expect(configEmissions).toBe(1); // Initial emission
    });

    it('should provide health$ observable', () => {
      let healthEmissions = 0;
      
      service.health$.subscribe(health => {
        healthEmissions++;
        expect(health).toBeDefined();
        expect(health.lastCheck).toBeDefined();
        expect(health.connectionPool).toBeDefined();
      });

      expect(healthEmissions).toBe(1); // Initial emission
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed health response', () => {
      service.performHealthCheck().subscribe(healthStatus => {
        expect(healthStatus.isConnected).toBe(false);
        expect(healthStatus.connectionPool.isHealthy).toBe(false);
      });

      const req = httpMock.expectOne(`${endpointurl}/actuator/health/db`);
      req.flush(null); // Malformed response
    });

    it('should handle malformed pool status response', () => {
      service.monitorConnectionPool().subscribe(poolStatus => {
        expect(poolStatus.activeConnections).toBe(0);
        expect(poolStatus.isHealthy).toBe(false);
      });

      const req = httpMock.expectOne(`${endpointurl}/admin/database/pool-status`);
      req.flush(null); // Malformed response
    });
  });
});