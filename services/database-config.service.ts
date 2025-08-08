import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap, retry, timeout } from 'rxjs/operators';
import { endpointurl } from '../model/backendport';

/**
 * Database Configuration Interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxLifetime: number;
  testQuery: string;
  validationTimeout: number;
}

/**
 * Connection Pool Status Interface
 */
export interface ConnectionPoolStatus {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
  pendingRequests: number;
  isHealthy: boolean;
  lastHealthCheck: Date;
}

/**
 * Database Health Status Interface
 */
export interface DatabaseHealthStatus {
  isConnected: boolean;
  responseTime: number;
  lastCheck: Date;
  errorMessage?: string;
  connectionPool: ConnectionPoolStatus;
  serverInfo?: {
    version: string;
    uptime: number;
  };
}

/**
 * Database Configuration Service for MySQL connection management
 * Implements connection pool configuration, health monitoring, and testing utilities
 */
@Injectable({
  providedIn: 'root'
})
export class DatabaseConfigService {
  // Default configuration for MySQL on port 3306
  private readonly defaultConfig: DatabaseConfig = {
    host: 'localhost',
    port: 3306,
    database: 'Employee_management_system',
    maxConnections: 20,
    minConnections: 5,
    connectionTimeout: 30000, // 30 seconds
    idleTimeout: 600000, // 10 minutes
    maxLifetime: 1800000, // 30 minutes
    testQuery: 'SELECT 1',
    validationTimeout: 5000 // 5 seconds
  };

  // Configuration state
  private configSubject = new BehaviorSubject<DatabaseConfig>(this.defaultConfig);
  public config$ = this.configSubject.asObservable();

  // Health monitoring state
  private healthSubject = new BehaviorSubject<DatabaseHealthStatus>({
    isConnected: false,
    responseTime: 0,
    lastCheck: new Date(),
    connectionPool: {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      maxConnections: this.defaultConfig.maxConnections,
      pendingRequests: 0,
      isHealthy: false,
      lastHealthCheck: new Date()
    }
  });
  public health$ = this.healthSubject.asObservable();

  // Monitoring intervals
  private healthCheckInterval: any;
  private poolMonitoringInterval: any;

  constructor(private http: HttpClient) {
    this.initializeMonitoring();
  }

  /**
   * Initialize database monitoring and health checks
   */
  private initializeMonitoring(): void {
    // Start periodic health checks every 30 seconds
    this.healthCheckInterval = timer(0, 30000).subscribe(() => {
      this.performHealthCheck().subscribe();
    });

    // Start connection pool monitoring every 10 seconds
    this.poolMonitoringInterval = timer(0, 10000).subscribe(() => {
      this.monitorConnectionPool().subscribe();
    });
  }

  /**
   * Get current database configuration
   * @returns DatabaseConfig Current configuration
   */
  getCurrentConfig(): DatabaseConfig {
    return this.configSubject.value;
  }

  /**
   * Update database configuration
   * @param config New configuration
   * @returns Observable<boolean> Success status
   */
  updateConfig(config: Partial<DatabaseConfig>): Observable<boolean> {
    const newConfig = { ...this.defaultConfig, ...config };
    
    // Validate configuration
    const validation = this.validateConfig(newConfig);
    if (!validation.isValid) {
      return throwError(() => new Error(`Invalid configuration: ${validation.errors.join(', ')}`));
    }

    // Apply configuration to backend
    return this.http.post<any>(`${endpointurl}/admin/database/config`, newConfig).pipe(
      timeout(10000),
      map(() => {
        this.configSubject.next(newConfig);
        return true;
      }),
      catchError(error => {
        console.warn('Failed to update backend configuration, using local config only:', error);
        // Still update local config even if backend update fails
        this.configSubject.next(newConfig);
        return of(true);
      })
    );
  }

  /**
   * Validate database configuration
   * @param config Configuration to validate
   * @returns Validation result
   */
  private validateConfig(config: DatabaseConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.host || config.host.trim().length === 0) {
      errors.push('Host is required');
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }

    if (!config.database || config.database.trim().length === 0) {
      errors.push('Database name is required');
    }

    if (config.maxConnections < 1 || config.maxConnections > 100) {
      errors.push('Max connections must be between 1 and 100');
    }

    if (config.minConnections < 0 || config.minConnections >= config.maxConnections) {
      errors.push('Min connections must be less than max connections');
    }

    if (config.connectionTimeout < 1000 || config.connectionTimeout > 300000) {
      errors.push('Connection timeout must be between 1 second and 5 minutes');
    }

    if (config.validationTimeout < 1000 || config.validationTimeout > 30000) {
      errors.push('Validation timeout must be between 1 and 30 seconds');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Test database connectivity with current configuration
   * @returns Observable<boolean> Connection test result
   */
  testConnection(): Observable<boolean> {
    const startTime = Date.now();
    
    return this.http.get(`${endpointurl}/actuator/health/db`, {
      headers: { 'Cache-Control': 'no-cache' },
      observe: 'response'
    }).pipe(
      timeout(this.getCurrentConfig().validationTimeout),
      map(response => {
        const responseTime = Date.now() - startTime;
        const isHealthy = response.status === 200;
        
        this.updateHealthStatus({
          isConnected: isHealthy,
          responseTime,
          lastCheck: new Date(),
          errorMessage: isHealthy ? undefined : 'Connection test failed'
        });
        
        return isHealthy;
      }),
      catchError(error => {
        const responseTime = Date.now() - startTime;
        let errorMessage = 'Database connection failed';
        
        if (error.name === 'TimeoutError') {
          errorMessage = 'Database connection timeout';
        } else if (error.status === 0) {
          errorMessage = 'Unable to reach database server';
        } else if (error.status === 503) {
          errorMessage = 'Database service unavailable';
        }
        
        this.updateHealthStatus({
          isConnected: false,
          responseTime,
          lastCheck: new Date(),
          errorMessage
        });
        
        return of(false);
      })
    );
  }

  /**
   * Test database connectivity with custom configuration
   * @param config Custom configuration to test
   * @returns Observable<boolean> Connection test result
   */
  testConnectionWithConfig(config: DatabaseConfig): Observable<boolean> {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      return throwError(() => new Error(`Invalid configuration: ${validation.errors.join(', ')}`));
    }

    return this.http.post<any>(`${endpointurl}/admin/database/test-connection`, config).pipe(
      timeout(config.validationTimeout),
      map(response => response.success === true),
      catchError(error => {
        console.error('Connection test with custom config failed:', error);
        return of(false);
      })
    );
  }

  /**
   * Perform comprehensive health check
   * @returns Observable<DatabaseHealthStatus> Health status
   */
  performHealthCheck(): Observable<DatabaseHealthStatus> {
    const startTime = Date.now();
    
    return this.http.get<any>(`${endpointurl}/actuator/health/db`).pipe(
      timeout(this.getCurrentConfig().validationTimeout),
      switchMap(healthData => {
        const responseTime = Date.now() - startTime;
        
        // Get additional server info
        return this.getServerInfo().pipe(
          map(serverInfo => ({
            isConnected: healthData.status === 'UP',
            responseTime,
            lastCheck: new Date(),
            connectionPool: this.parseConnectionPoolInfo(healthData.details),
            serverInfo,
            errorMessage: healthData.status !== 'UP' ? healthData.details?.error : undefined
          })),
          catchError(() => of({
            isConnected: healthData.status === 'UP',
            responseTime,
            lastCheck: new Date(),
            connectionPool: this.parseConnectionPoolInfo(healthData.details),
            errorMessage: healthData.status !== 'UP' ? healthData.details?.error : undefined
          }))
        );
      }),
      tap(healthStatus => this.healthSubject.next(healthStatus)),
      catchError(error => {
        const responseTime = Date.now() - startTime;
        let errorMessage = 'Health check failed';
        
        if (error.name === 'TimeoutError') {
          errorMessage = 'Health check timeout';
        } else if (error.status === 0) {
          errorMessage = 'Unable to reach health check endpoint';
        }
        
        const failedHealthStatus: DatabaseHealthStatus = {
          isConnected: false,
          responseTime,
          lastCheck: new Date(),
          errorMessage,
          connectionPool: {
            activeConnections: 0,
            idleConnections: 0,
            totalConnections: 0,
            maxConnections: this.getCurrentConfig().maxConnections,
            pendingRequests: 0,
            isHealthy: false,
            lastHealthCheck: new Date()
          }
        };
        
        this.healthSubject.next(failedHealthStatus);
        return of(failedHealthStatus);
      })
    );
  }

  /**
   * Get database server information
   * @returns Observable<ServerInfo> Server information
   */
  private getServerInfo(): Observable<{ version: string; uptime: number }> {
    return this.http.get<any>(`${endpointurl}/admin/database/info`).pipe(
      timeout(5000),
      map(info => ({
        version: info.version || 'Unknown',
        uptime: info.uptime || 0
      })),
      catchError(() => of({ version: 'Unknown', uptime: 0 }))
    );
  }

  /**
   * Monitor connection pool status
   * @returns Observable<ConnectionPoolStatus> Pool status
   */
  monitorConnectionPool(): Observable<ConnectionPoolStatus> {
    return this.http.get<any>(`${endpointurl}/admin/database/pool-status`).pipe(
      timeout(5000),
      map(poolData => this.parseConnectionPoolInfo(poolData)),
      tap(poolStatus => {
        const currentHealth = this.healthSubject.value;
        this.healthSubject.next({
          ...currentHealth,
          connectionPool: poolStatus
        });
      }),
      catchError(error => {
        console.warn('Failed to get connection pool status:', error);
        const defaultPoolStatus: ConnectionPoolStatus = {
          activeConnections: 0,
          idleConnections: 0,
          totalConnections: 0,
          maxConnections: this.getCurrentConfig().maxConnections,
          pendingRequests: 0,
          isHealthy: false,
          lastHealthCheck: new Date()
        };
        
        const currentHealth = this.healthSubject.value;
        this.healthSubject.next({
          ...currentHealth,
          connectionPool: defaultPoolStatus
        });
        
        return of(defaultPoolStatus);
      })
    );
  }

  /**
   * Parse connection pool information from health data
   * @param poolData Raw pool data from backend
   * @returns ConnectionPoolStatus Parsed pool status
   */
  private parseConnectionPoolInfo(poolData: any): ConnectionPoolStatus {
    if (!poolData) {
      return {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        maxConnections: this.getCurrentConfig().maxConnections,
        pendingRequests: 0,
        isHealthy: false,
        lastHealthCheck: new Date()
      };
    }

    return {
      activeConnections: poolData.activeConnections || 0,
      idleConnections: poolData.idleConnections || 0,
      totalConnections: poolData.totalConnections || 0,
      maxConnections: poolData.maxConnections || this.getCurrentConfig().maxConnections,
      pendingRequests: poolData.pendingRequests || 0,
      isHealthy: poolData.isHealthy !== false,
      lastHealthCheck: new Date()
    };
  }

  /**
   * Update health status
   * @param updates Partial health status updates
   */
  private updateHealthStatus(updates: Partial<DatabaseHealthStatus>): void {
    const currentHealth = this.healthSubject.value;
    this.healthSubject.next({
      ...currentHealth,
      ...updates
    });
  }

  /**
   * Get current health status
   * @returns DatabaseHealthStatus Current health status
   */
  getCurrentHealthStatus(): DatabaseHealthStatus {
    return this.healthSubject.value;
  }

  /**
   * Force immediate health check
   * @returns Observable<DatabaseHealthStatus> Updated health status
   */
  forceHealthCheck(): Observable<DatabaseHealthStatus> {
    return this.performHealthCheck();
  }

  /**
   * Reset connection pool (if supported by backend)
   * @returns Observable<boolean> Reset success status
   */
  resetConnectionPool(): Observable<boolean> {
    return this.http.post<any>(`${endpointurl}/admin/database/reset-pool`, {}).pipe(
      timeout(10000),
      map(() => true),
      catchError(error => {
        console.error('Failed to reset connection pool:', error);
        return of(false);
      })
    );
  }

  /**
   * Get connection pool configuration recommendations
   * @returns Observable<Partial<DatabaseConfig>> Recommended configuration
   */
  getConfigurationRecommendations(): Observable<Partial<DatabaseConfig>> {
    return this.http.get<any>(`${endpointurl}/admin/database/recommendations`).pipe(
      timeout(5000),
      map(recommendations => ({
        maxConnections: recommendations.maxConnections,
        minConnections: recommendations.minConnections,
        connectionTimeout: recommendations.connectionTimeout,
        idleTimeout: recommendations.idleTimeout
      })),
      catchError(() => {
        // Return default recommendations if endpoint is not available
        return of({
          maxConnections: 20,
          minConnections: 5,
          connectionTimeout: 30000,
          idleTimeout: 600000
        });
      })
    );
  }

  /**
   * Create development testing utilities
   * @returns Object with testing methods
   */
  createTestingUtilities() {
    return {
      /**
       * Simulate connection failure for testing
       */
      simulateConnectionFailure: (): Observable<boolean> => {
        this.updateHealthStatus({
          isConnected: false,
          errorMessage: 'Simulated connection failure',
          lastCheck: new Date()
        });
        return of(false);
      },

      /**
       * Simulate connection recovery for testing
       */
      simulateConnectionRecovery: (): Observable<boolean> => {
        this.updateHealthStatus({
          isConnected: true,
          errorMessage: undefined,
          lastCheck: new Date(),
          responseTime: 50
        });
        return of(true);
      },

      /**
       * Get mock connection pool status for testing
       */
      getMockPoolStatus: (): ConnectionPoolStatus => ({
        activeConnections: 5,
        idleConnections: 3,
        totalConnections: 8,
        maxConnections: 20,
        pendingRequests: 2,
        isHealthy: true,
        lastHealthCheck: new Date()
      }),

      /**
       * Test configuration validation
       */
      testConfigValidation: (config: Partial<DatabaseConfig>) => {
        const fullConfig = { ...this.defaultConfig, ...config };
        return this.validateConfig(fullConfig);
      }
    };
  }

  /**
   * Cleanup resources when service is destroyed
   */
  ngOnDestroy(): void {
    if (this.healthCheckInterval) {
      this.healthCheckInterval.unsubscribe();
    }
    if (this.poolMonitoringInterval) {
      this.poolMonitoringInterval.unsubscribe();
    }
  }
}