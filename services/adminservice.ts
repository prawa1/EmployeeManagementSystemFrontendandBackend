import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { endpointurl } from '../model/backendport';
import { Employee, Department } from '../model/employeemodel';
import { PayslipData } from '../model/payslipmodel';
import { Observable, timer, throwError, of } from 'rxjs';
import { catchError, retry, timeout, retryWhen, delayWhen, take, concatMap, map, switchMap } from 'rxjs/operators';
import { ConnectionService } from './connection.service';
import { ConnectionRecoveryService } from './connection-recovery.service';
import { DatabaseConfigService } from './database-config.service';

// Interface for employee settings update
export interface EmployeeSettingsUpdate {
  empName?: string;
  phoneNo?: string;
}

// Interface for paginated response
export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Interface for leave management
export interface Leave {
  leaveId: number;
  employee: Employee;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedDate: string;
  approvedBy?: number;
  approvedDate?: string;
  comments?: string;
}

// Interface for dashboard data
export interface DashboardData {
  totalEmployees: number;
  pendingLeaves: number;
  lastUpdated: Date;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Adminservice {

  constructor(
    public httpclient: HttpClient,
    private connectionService: ConnectionService,
    private connectionRecoveryService: ConnectionRecoveryService,
    private databaseConfigService: DatabaseConfigService
  ) {}

  // ===== DATABASE CONNECTION MANAGEMENT METHODS =====

  /**
   * Tests database connectivity by making a health check request
   * @returns Observable<boolean> True if connection is healthy, false otherwise
   */
  testConnection(): Observable<boolean> {
    return this.connectionService.testConnection();
  }

  /**
   * Checks if the database connection is currently healthy
   * @returns boolean Current connection health status
   */
  isConnectionHealthy(): boolean {
    return this.connectionService.isConnectionHealthy();
  }

  /**
   * Gets the timestamp of the last health check
   * @returns Date | null Last health check timestamp
   */
  getLastHealthCheck(): Date | null {
    return this.connectionService.getLastHealthCheck();
  }

  /**
   * Forces a connection health check
   * @returns Observable<boolean> Health check result
   */
  forceHealthCheck(): Observable<boolean> {
    return this.connectionService.forceHealthCheck();
  }

  /**
   * Gets connection information including health status and queue size
   * @returns Object with connection details
   */
  getConnectionInfo(): {
    isHealthy: boolean;
    lastCheck: Date | null;
    queueSize: number;
    isOnline: boolean;
  } {
    return this.connectionService.getConnectionInfo();
  }

  /**
   * Retry operation with exponential backoff for database operations
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
    return this.connectionService.retryOperation(operation, customTimeout, customMaxRetries);
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
    return this.connectionService.retryWithUserControl(operation, userRetryCallback);
  }

  /**
   * Queues an operation to be executed when connection is restored
   * @param operation The operation to queue
   * @returns Observable<T> The result when operation is executed
   */
  queueOperation<T>(operation: () => Observable<T>): Observable<T> {
    return this.connectionService.queueOperation(operation);
  }

  // ===== CONNECTION RECOVERY METHODS =====

  /**
   * Execute operation with automatic recovery and degradation support
   * @param operation The operation to execute
   * @param options Execution options
   * @returns Observable<T> The result of the operation
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
    return this.connectionRecoveryService.executeWithRecovery(operation, options);
  }

  /**
   * Get current connection recovery status
   * @returns ConnectionRecoveryStatus Current recovery status
   */
  getRecoveryStatus() {
    return this.connectionRecoveryService.getCurrentRecoveryStatus();
  }

  /**
   * Get recovery status observable for real-time updates
   * @returns Observable<ConnectionRecoveryStatus> Recovery status stream
   */
  getRecoveryStatus$() {
    return this.connectionRecoveryService.recoveryStatus$;
  }

  /**
   * Get current queue status
   * @returns Queue information
   */
  getQueueStatus() {
    return this.connectionRecoveryService.getQueueStatus();
  }

  /**
   * Cache operation result for degraded mode
   * @param cacheKey Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (optional)
   */
  cacheOperationResult<T>(cacheKey: string, data: T, ttl?: number): void {
    this.connectionRecoveryService.cacheResult(cacheKey, data, ttl);
  }

  /**
   * Update degradation configuration
   * @param config New configuration
   */
  updateDegradationConfig(config: any): void {
    this.connectionRecoveryService.updateDegradationConfig(config);
  }

  /**
   * Get database configuration and health status
   * @returns Database configuration and health information
   */
  getDatabaseStatus() {
    return {
      config: this.databaseConfigService.getCurrentConfig(),
      health: this.databaseConfigService.getCurrentHealthStatus(),
      recovery: this.connectionRecoveryService.getCurrentRecoveryStatus()
    };
  }

  /**
   * Test database connection with custom configuration
   * @param config Custom configuration to test
   * @returns Observable<boolean> Connection test result
   */
  testConnectionWithConfig(config: any): Observable<boolean> {
    return this.databaseConfigService.testConnectionWithConfig(config);
  }

  /**
   * Update database configuration
   * @param config New configuration
   * @returns Observable<boolean> Success status
   */
  updateDatabaseConfig(config: any): Observable<boolean> {
    return this.databaseConfigService.updateConfig(config);
  }

  /**
   * Reset database connection pool
   * @returns Observable<boolean> Reset success status
   */
  resetConnectionPool(): Observable<boolean> {
    return this.databaseConfigService.resetConnectionPool();
  }

  /**
   * Get database configuration recommendations
   * @returns Observable<any> Recommended configuration
   */
  getDatabaseConfigRecommendations(): Observable<any> {
    return this.databaseConfigService.getConfigurationRecommendations();
  }

  // ===== ENHANCED ADMIN METHODS WITH CONNECTION MANAGEMENT =====

  /**
   * Admin login with hardcoded credentials
   * @param username Admin username
   * @param password Admin password
   * @returns Observable<any> Login response
   */
  adminLogin(username: string, password: string): Observable<any> {
    const loginData = { username, password };
    const operation = () => this.httpclient.post<any>(`${endpointurl}/admin/login`, loginData);
    return this.retryOperation(operation).pipe(
      catchError((error: any) => {
        if (error.status === 401) {
          const enhancedError = new Error('Invalid admin credentials');
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = 'unauthorized';
          (enhancedError as any).originalError = error;
          return throwError(() => enhancedError);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if email already exists in the system
   * @param email Email to check
   * @returns Observable<boolean> True if email exists, false otherwise
   */
  checkEmailExists(email: string): Observable<boolean> {
    const operation = () => this.httpclient.get<boolean>(`${endpointurl}/employee/api/check-email?email=${encodeURIComponent(email)}`);
    return this.retryOperation(operation).pipe(
      catchError(error => {
        // If endpoint doesn't exist, fall back to getting all employees and checking
        console.warn('Email check endpoint not available, using fallback method');
        return this.getAllEmployees().pipe(
          map((employees: any) => {
            const employeeList = Array.isArray(employees) ? employees : employees.content || [];
            return employeeList.some((emp: Employee) => emp.email.toLowerCase() === email.toLowerCase());
          }),
          catchError(() => of(false)) // If all fails, assume email doesn't exist
        );
      })
    );
  }

  /**
   * Check if phone number already exists in the system
   * @param phoneNo Phone number to check
   * @returns Observable<boolean> True if phone exists, false otherwise
   */
  checkPhoneExists(phoneNo: string): Observable<boolean> {
    const operation = () => this.httpclient.get<boolean>(`${endpointurl}/employee/api/check-phone?phone=${encodeURIComponent(phoneNo)}`);
    return this.retryOperation(operation).pipe(
      catchError(error => {
        // If endpoint doesn't exist, fall back to getting all employees and checking
        console.warn('Phone check endpoint not available, using fallback method');
        return this.getAllEmployees().pipe(
          map((employees: any) => {
            const employeeList = Array.isArray(employees) ? employees : employees.content || [];
            return employeeList.some((emp: Employee) => emp.phoneNo === phoneNo);
          }),
          catchError(() => of(false)) // If all fails, assume phone doesn't exist
        );
      })
    );
  }

  /**
   * Validate employee data before registration
   * @param employee Employee data to validate
   * @returns Observable<ValidationResult> Validation result
   */
  validateEmployeeData(employee: Employee): Observable<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];
    
    // Convert String objects to string primitives for validation
    const empName = employee.empName ? employee.empName.toString() : '';
    const email = employee.email ? employee.email.toString() : '';
    const phoneNo = employee.phoneNo ? employee.phoneNo.toString() : '';
    
    // Basic validation
    if (!empName || empName.trim().length < 2) {
      errors.push('Employee name must be at least 2 characters long');
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please provide a valid email address');
    }
    
    if (!phoneNo || !/^\d{10}$/.test(phoneNo)) {
      errors.push('Phone number must be exactly 10 digits');
    }
    
    if (!employee.salary || employee.salary < 10000) {
      errors.push('Salary must be at least 10,000');
    }
    
    if (errors.length > 0) {
      return of({ isValid: false, errors });
    }
    
    // Check for duplicates
    return this.checkEmailExists(email).pipe(
      switchMap(emailExists => {
        if (emailExists) {
          errors.push('An employee with this email address already exists');
        }
        
        return this.checkPhoneExists(phoneNo);
      }),
      map(phoneExists => {
        if (phoneExists) {
          errors.push('An employee with this phone number already exists');
        }
        
        return { isValid: errors.length === 0, errors };
      }),
      catchError(() => {
        // If validation checks fail, proceed with registration and let backend handle it
        console.warn('Duplicate validation failed, proceeding with registration');
        return of({ isValid: true, errors: [] });
      })
    );
  }

  /**
   * Register new employee with comprehensive validation and database connection management
   * @param employee Employee data
   * @param departmentId Department ID
   * @returns Observable<Employee> Registered employee
   */
  registerEmployee(employee: Employee, departmentId: number): Observable<Employee> {
    // First validate the employee data
    return this.validateEmployeeData(employee).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          const error = new Error(validation.errors.join('; '));
          (error as any).type = 'validation_error';
          (error as any).status = 400;
          (error as any).validationErrors = validation.errors;
          return throwError(() => error);
        }
        
        // Proceed with registration using recovery service
        const operation = () => this.httpclient.post<Employee>(`${endpointurl}/employee/api/add/${departmentId}`, employee);
        return this.executeWithRecovery(operation, {
          priority: 'high',
          cacheKey: `register_employee_${employee.email}`,
          enableDegradation: true
        });
      }),
      catchError((error: any) => {
        // Handle specific validation errors for employee registration
        if (error.type === 'validation_error') {
          return throwError(() => error);
        }
        
        if (error.status === 409) {
          const enhancedError = new Error('Employee with this email or phone number already exists');
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = 'conflict';
          (enhancedError as any).originalError = error;
          return throwError(() => enhancedError);
        }
        
        if (error.status === 400 && error.originalError?.error) {
          let specificMessage = 'Invalid employee data provided';
          let specificType = 'validation_error';
          
          const errorBody = error.originalError.error;
          if (typeof errorBody === 'string') {
            if (errorBody.includes('email')) {
              specificMessage = 'Invalid email format or email already exists';
            } else if (errorBody.includes('phone')) {
              specificMessage = 'Invalid phone number format or phone number already exists';
            } else if (errorBody.includes('salary')) {
              specificMessage = 'Invalid salary amount';
            } else if (errorBody.includes('department')) {
              specificMessage = 'Invalid department selected';
            }
          } else if (typeof errorBody === 'object' && errorBody.message) {
            specificMessage = errorBody.message;
          }
          
          const enhancedError = new Error(specificMessage);
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = specificType;
          (enhancedError as any).originalError = error;
          
          return throwError(() => enhancedError);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all departments for dropdown selection
   * @returns Observable<Department[]> List of departments
   */
  getAllDepartments(): Observable<Department[]> {
    const operation = () => this.httpclient.get<Department[]>(`${endpointurl}/department/api/all`);
    return this.retryOperation(operation).pipe(
      catchError(error => {
        console.warn('Department endpoint not available, using mock data');
        // Return mock departments if endpoint is not available
        return of([
          { deptId: 1, deptName: 'Human Resources', deptDescription: 'HR Department' },
          { deptId: 2, deptName: 'Information Technology', deptDescription: 'IT Department' },
          { deptId: 3, deptName: 'Finance', deptDescription: 'Finance Department' },
          { deptId: 4, deptName: 'Marketing', deptDescription: 'Marketing Department' },
          { deptId: 5, deptName: 'Operations', deptDescription: 'Operations Department' }
        ]);
      })
    );
  }

  /**
   * Get all employees with pagination and connection management
   * @param page Page number (optional)
   * @param size Page size (optional)
   * @returns Observable<PagedResponse<Employee>> Paginated employee list
   */
  getAllEmployeesWithPagination(page?: number, size?: number): Observable<PagedResponse<Employee>> {
    let url = `${endpointurl}/employee/api/all`;
    if (page !== undefined && size !== undefined) {
      url += `?page=${page}&size=${size}`;
    }
    
    const operation = () => this.httpclient.get<PagedResponse<Employee>>(url);
    return this.retryOperation(operation);
  }

  /**
   * Search employees with connection management
   * @param query Search query
   * @returns Observable<Employee[]> Search results
   */
  searchEmployees(query: string): Observable<Employee[]> {
    const operation = () => this.httpclient.get<Employee[]>(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}`);
    return this.retryOperation(operation);
  }

  /**
   * Update employee with connection management and validation
   * @param empId Employee ID
   * @param employee Updated employee data
   * @returns Observable<Employee> Updated employee
   */
  updateEmployee(empId: number, employee: Employee): Observable<Employee> {
    const operation = () => this.httpclient.put<Employee>(`${endpointurl}/employee/api/update/${empId}`, employee);
    return this.retryOperation(operation);
  }

  /**
   * Update employee by ID with comprehensive validation and conflict detection
   * @param empId Employee ID to update
   * @param updatedEmployee Updated employee data
   * @returns Observable<Employee> Updated employee
   */
  updateEmployeeById(empId: number, updatedEmployee: Employee): Observable<Employee> {
    // First validate the updated employee data
    return this.validateEmployeeUpdateData(empId, updatedEmployee).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          const error = new Error(validation.errors.join('; '));
          (error as any).type = 'validation_error';
          (error as any).status = 400;
          (error as any).validationErrors = validation.errors;
          return throwError(() => error);
        }
        
        // Proceed with update
        const operation = () => this.httpclient.put<Employee>(`${endpointurl}/employee/api/update/${empId}`, updatedEmployee);
        return this.retryOperation(operation);
      }),
      catchError((error: any) => {
        // Handle specific validation errors for employee update
        if (error.type === 'validation_error') {
          return throwError(() => error);
        }
        
        if (error.status === 409) {
          const enhancedError = new Error('Employee with this email or phone number already exists');
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = 'conflict';
          (enhancedError as any).originalError = error;
          return throwError(() => enhancedError);
        }
        
        if (error.status === 404) {
          const enhancedError = new Error('Employee not found');
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = 'not_found';
          (enhancedError as any).originalError = error;
          return throwError(() => enhancedError);
        }
        
        if (error.status === 400 && error.originalError?.error) {
          let specificMessage = 'Invalid employee data provided';
          let specificType = 'validation_error';
          
          const errorBody = error.originalError.error;
          if (typeof errorBody === 'string') {
            if (errorBody.includes('email')) {
              specificMessage = 'Invalid email format or email already exists';
            } else if (errorBody.includes('phone')) {
              specificMessage = 'Invalid phone number format or phone number already exists';
            } else if (errorBody.includes('salary')) {
              specificMessage = 'Invalid salary amount';
            } else if (errorBody.includes('department')) {
              specificMessage = 'Invalid department selected';
            }
          } else if (typeof errorBody === 'object' && errorBody.message) {
            specificMessage = errorBody.message;
          }
          
          const enhancedError = new Error(specificMessage);
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = specificType;
          (enhancedError as any).originalError = error;
          
          return throwError(() => enhancedError);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Get employee by ID for populating update forms
   * @param empId Employee ID
   * @returns Observable<Employee> Employee data
   */
  getEmployeeForUpdate(empId: number): Observable<Employee> {
    const operation = () => this.httpclient.get<Employee>(`${endpointurl}/employee/api/get/${empId}`);
    return this.retryOperation(operation).pipe(
      catchError((error: any) => {
        if (error.status === 404) {
          const enhancedError = new Error('Employee not found');
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = 'not_found';
          (enhancedError as any).originalError = error;
          return throwError(() => enhancedError);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Validate employee update data with conflict detection
   * @param empId Employee ID being updated
   * @param employee Employee data to validate
   * @returns Observable<ValidationResult> Validation result
   */
  private validateEmployeeUpdateData(empId: number, employee: Employee): Observable<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];
    
    // Convert String objects to string primitives for validation
    const empName = employee.empName ? employee.empName.toString() : '';
    const email = employee.email ? employee.email.toString() : '';
    const phoneNo = employee.phoneNo ? employee.phoneNo.toString() : '';
    
    // Basic validation
    if (!empName || empName.trim().length < 2) {
      errors.push('Employee name must be at least 2 characters long');
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please provide a valid email address');
    }
    
    if (!phoneNo || !/^\d{10}$/.test(phoneNo)) {
      errors.push('Phone number must be exactly 10 digits');
    }
    
    if (!employee.salary || employee.salary <= 0) {
      errors.push('Salary must be a positive number');
    }
    
    if (errors.length > 0) {
      return of({ isValid: false, errors });
    }
    
    // Check for duplicates (excluding current employee)
    return this.checkEmailExistsForUpdate(email, empId).pipe(
      switchMap(emailExists => {
        if (emailExists) {
          errors.push('Another employee with this email address already exists');
        }
        
        return this.checkPhoneExistsForUpdate(phoneNo, empId);
      }),
      map(phoneExists => {
        if (phoneExists) {
          errors.push('Another employee with this phone number already exists');
        }
        
        return { isValid: errors.length === 0, errors };
      }),
      catchError(() => {
        // If validation checks fail, proceed with update and let backend handle it
        console.warn('Duplicate validation failed, proceeding with update');
        return of({ isValid: true, errors: [] });
      })
    );
  }

  /**
   * Check if email exists for another employee (excluding current employee being updated)
   * @param email Email to check
   * @param excludeEmpId Employee ID to exclude from check
   * @returns Observable<boolean> True if email exists for another employee
   */
  checkEmailExistsForUpdate(email: string, excludeEmpId: number): Observable<boolean> {
    const operation = () => this.httpclient.get<boolean>(`${endpointurl}/employee/api/check-email-update?email=${encodeURIComponent(email)}&excludeId=${excludeEmpId}`);
    return this.retryOperation(operation).pipe(
      catchError(error => {
        // If endpoint doesn't exist, fall back to getting all employees and checking
        console.warn('Email update check endpoint not available, using fallback method');
        return this.getAllEmployees().pipe(
          map((employees: any) => {
            const employeeList = Array.isArray(employees) ? employees : employees.content || [];
            return employeeList.some((emp: Employee) => 
              emp.email.toLowerCase() === email.toLowerCase() && emp.empId !== excludeEmpId
            );
          }),
          catchError(() => of(false)) // If all fails, assume email doesn't exist
        );
      })
    );
  }

  /**
   * Check if phone exists for another employee (excluding current employee being updated)
   * @param phoneNo Phone number to check
   * @param excludeEmpId Employee ID to exclude from check
   * @returns Observable<boolean> True if phone exists for another employee
   */
  checkPhoneExistsForUpdate(phoneNo: string, excludeEmpId: number): Observable<boolean> {
    const operation = () => this.httpclient.get<boolean>(`${endpointurl}/employee/api/check-phone-update?phone=${encodeURIComponent(phoneNo)}&excludeId=${excludeEmpId}`);
    return this.retryOperation(operation).pipe(
      catchError(error => {
        // If endpoint doesn't exist, fall back to getting all employees and checking
        console.warn('Phone update check endpoint not available, using fallback method');
        return this.getAllEmployees().pipe(
          map((employees: any) => {
            const employeeList = Array.isArray(employees) ? employees : employees.content || [];
            return employeeList.some((emp: Employee) => 
              emp.phoneNo === phoneNo && emp.empId !== excludeEmpId
            );
          }),
          catchError(() => of(false)) // If all fails, assume phone doesn't exist
        );
      })
    );
  }

  /**
   * Check if employee has dependent records (leaves, payslips)
   * @param empId Employee ID
   * @returns Observable<{hasDependencies: boolean, dependencies: string[]}> Dependency check result
   */
  checkEmployeeDependencies(empId: number): Observable<{hasDependencies: boolean, dependencies: string[]}> {
    const operation = () => this.httpclient.get<{hasDependencies: boolean, dependencies: string[]}>(`${endpointurl}/employee/api/dependencies/${empId}`);
    return this.retryOperation(operation).pipe(
      catchError(error => {
        // If endpoint doesn't exist, fall back to manual checking
        console.warn('Dependencies check endpoint not available, using fallback method');
        return this.checkDependenciesFallback(empId);
      })
    );
  }

  /**
   * Fallback method to check employee dependencies manually
   * @param empId Employee ID
   * @returns Observable<{hasDependencies: boolean, dependencies: string[]}> Dependency check result
   */
  private checkDependenciesFallback(empId: number): Observable<{hasDependencies: boolean, dependencies: string[]}> {
    const dependencies: string[] = [];
    
    // Check for leaves
    const leavesCheck = this.httpclient.get<any[]>(`${endpointurl}/leave/api/employee/${empId}`).pipe(
      map(leaves => {
        if (leaves && leaves.length > 0) {
          dependencies.push(`${leaves.length} leave record(s)`);
        }
        return dependencies;
      }),
      catchError(() => of(dependencies)) // If leaves endpoint fails, continue
    );

    // Check for payslips
    const payslipsCheck = this.httpclient.get<any[]>(`${endpointurl}/payslip/api/employee/${empId}`).pipe(
      map(payslips => {
        if (payslips && payslips.length > 0) {
          dependencies.push(`${payslips.length} payslip record(s)`);
        }
        return dependencies;
      }),
      catchError(() => of(dependencies)) // If payslips endpoint fails, continue
    );

    return leavesCheck.pipe(
      switchMap(() => payslipsCheck),
      map(() => ({
        hasDependencies: dependencies.length > 0,
        dependencies: dependencies
      })),
      catchError(() => of({ hasDependencies: false, dependencies: [] }))
    );
  }

  /**
   * Delete employee with dependency checking and connection management
   * @param empId Employee ID
   * @returns Observable<void> Deletion confirmation
   */
  deleteEmployeeById(empId: number): Observable<void> {
    // First check for dependencies
    return this.checkEmployeeDependencies(empId).pipe(
      switchMap(dependencyResult => {
        if (dependencyResult.hasDependencies) {
          const error = new Error(`Cannot delete employee. Employee has dependent records: ${dependencyResult.dependencies.join(', ')}`);
          (error as any).type = 'dependency_error';
          (error as any).status = 409;
          (error as any).dependencies = dependencyResult.dependencies;
          return throwError(() => error);
        }
        
        // Proceed with deletion if no dependencies
        const operation = () => this.httpclient.delete<void>(`${endpointurl}/employee/api/delete/${empId}`);
        return this.retryOperation(operation);
      }),
      catchError((error: any) => {
        // Handle specific errors for employee deletion
        if (error.type === 'dependency_error') {
          return throwError(() => error);
        }
        
        if (error.status === 404) {
          const enhancedError = new Error('Employee not found');
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = 'not_found';
          (enhancedError as any).originalError = error;
          return throwError(() => enhancedError);
        }
        
        if (error.status === 409) {
          const enhancedError = new Error('Cannot delete employee due to existing dependencies');
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = 'dependency_error';
          (enhancedError as any).originalError = error;
          return throwError(() => enhancedError);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete employee with connection management (legacy method)
   * @param empId Employee ID
   * @returns Observable<void> Deletion confirmation
   */
  deleteEmployee(empId: number): Observable<void> {
    const operation = () => this.httpclient.delete<void>(`${endpointurl}/employee/api/delete/${empId}`);
    return this.retryOperation(operation);
  }

  /**
   * Get all employees (legacy method for backward compatibility)
   * @returns Observable<Employee[]> List of all employees
   */
  getAllEmployees(): Observable<Employee[]> {
    const operation = () => this.httpclient.get<Employee[]>(`${endpointurl}/employee/api/all`);
    return this.retryOperation(operation);
  }



  /**
   * Search employees with pagination support
   * @param query Search query (name or email)
   * @param page Page number (0-based)
   * @param size Page size
   * @param sortBy Sort field (optional)
   * @param sortDirection Sort direction (optional)
   * @returns Observable<PagedResponse<Employee>> Paginated search results
   */
  searchEmployeesWithPagination(
    query: string, 
    page: number = 0, 
    size: number = 10,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc'
  ): Observable<PagedResponse<Employee>> {
    let url = `${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`;
    
    if (sortBy) {
      url += `&sortBy=${sortBy}`;
    }
    if (sortDirection) {
      url += `&sortDirection=${sortDirection}`;
    }
    
    const operation = () => this.httpclient.get<PagedResponse<Employee>>(url);
    return this.retryOperation(operation).pipe(
      catchError(error => {
        // If paginated search endpoint doesn't exist, fall back to regular search and create paginated response
        console.warn('Paginated search endpoint not available, using fallback method');
        return this.searchEmployees(query).pipe(
          map((employees: Employee[]) => {
            // Apply sorting if specified
            if (sortBy && employees.length > 0) {
              employees = this.sortEmployees(employees, sortBy, sortDirection || 'asc');
            }
            
            const startIndex = page * size;
            const endIndex = startIndex + size;
            const paginatedEmployees = employees.slice(startIndex, endIndex);
            
            return {
              content: paginatedEmployees,
              totalElements: employees.length,
              totalPages: Math.ceil(employees.length / size),
              size: size,
              number: page
            } as PagedResponse<Employee>;
          })
        );
      })
    );
  }

  /**
   * Sort employees array by specified field
   * @param employees Array of employees to sort
   * @param sortBy Field to sort by
   * @param sortDirection Sort direction
   * @returns Sorted array of employees
   */
  private sortEmployees(employees: Employee[], sortBy: string, sortDirection: 'asc' | 'desc'): Employee[] {
    return employees.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'empName':
          aValue = a.empName.toString().toLowerCase();
          bValue = b.empName.toString().toLowerCase();
          break;
        case 'email':
          aValue = a.email.toString().toLowerCase();
          bValue = b.email.toString().toLowerCase();
          break;
        case 'phoneNo':
          aValue = a.phoneNo.toString();
          bValue = b.phoneNo.toString();
          break;
        case 'role':
          aValue = a.role.toString().toLowerCase();
          bValue = b.role.toString().toLowerCase();
          break;
        case 'joiningDate':
          aValue = new Date(a.joiningDate.toString());
          bValue = new Date(b.joiningDate.toString());
          break;
        case 'salary':
          aValue = a.salary;
          bValue = b.salary;
          break;
        default:
          aValue = a.empId;
          bValue = b.empId;
      }
      
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Get pending leaves with connection management
   * @returns Observable<Leave[]> Pending leave requests
   */
  getPendingLeaves(): Observable<Leave[]> {
    const operation = () => this.httpclient.get<Leave[]>(`${endpointurl}/leave/api/pending`);
    return this.retryOperation(operation);
  }

  /**
   * Approve leave request with connection management
   * @param leaveId Leave ID
   * @param comments Optional approval comments
   * @returns Observable<Leave> Approved leave
   */
  approveLeave(leaveId: number, comments?: string): Observable<Leave> {
    console.log('AdminService.approveLeave called with:', { leaveId, comments });
    const body = comments ? { comments } : {};
    console.log('Request body:', body);
    console.log('Request URL:', `${endpointurl}/leave/api/approve/${leaveId}`);
    
    const operation = () => this.httpclient.put<Leave>(`${endpointurl}/leave/api/approve/${leaveId}`, body);
    return this.retryOperation(operation).pipe(
      catchError((error: any) => {
        console.error('AdminService.approveLeave error:', error);
        // Try alternative endpoint patterns if the first one fails
        if (error.status === 404) {
          console.log('Trying alternative endpoint pattern...');
          const alternativeOperation = () => this.httpclient.post<Leave>(`${endpointurl}/leave/api/approve/${leaveId}`, body);
          return this.retryOperation(alternativeOperation);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Reject leave request with connection management
   * @param leaveId Leave ID
   * @param reason Rejection reason
   * @returns Observable<Leave> Rejected leave
   */
  rejectLeave(leaveId: number, reason: string): Observable<Leave> {
    console.log('AdminService.rejectLeave called with:', { leaveId, reason });
    const body = { reason };
    console.log('Request body:', body);
    console.log('Request URL:', `${endpointurl}/leave/api/reject/${leaveId}`);
    
    const operation = () => this.httpclient.put<Leave>(`${endpointurl}/leave/api/reject/${leaveId}`, body);
    return this.retryOperation(operation).pipe(
      catchError((error: any) => {
        console.error('AdminService.rejectLeave error:', error);
        // Try alternative endpoint patterns if the first one fails
        if (error.status === 404) {
          console.log('Trying alternative endpoint pattern...');
          const alternativeOperation = () => this.httpclient.post<Leave>(`${endpointurl}/leave/api/reject/${leaveId}`, body);
          return this.retryOperation(alternativeOperation);
        }
        return throwError(() => error);
      })
    );
  }

  // ===== DASHBOARD DATA SERVICE METHODS =====

  /**
   * Get total employee count for dashboard
   * @returns Observable<number> Total number of employees
   */
  getTotalEmployeeCount(): Observable<number> {
    const operation = () => this.httpclient.get<number>(`${endpointurl}/employee/api/count`);
    return this.retryOperation(operation).pipe(
      catchError(error => {
        console.warn('Employee count endpoint not available, using fallback method');
        // Fallback to getting all employees and counting
        return this.getAllEmployees().pipe(
          map((employees: any) => {
            if (Array.isArray(employees)) {
              return employees.length;
            } else if (employees && employees.totalElements !== undefined) {
              return employees.totalElements;
            } else if (employees && employees.content) {
              return employees.content.length;
            }
            return 0;
          }),
          catchError(() => of(0)) // If all fails, return 0
        );
      })
    );
  }

  /**
   * Get pending leaves count for dashboard
   * @returns Observable<number> Number of pending leave requests
   */
  getPendingLeavesCount(): Observable<number> {
    const operation = () => this.httpclient.get<number>(`${endpointurl}/leave/api/pending/count`);
    return this.retryOperation(operation).pipe(
      catchError(error => {
        console.warn('Pending leaves count endpoint not available, using fallback method');
        // Fallback to getting all pending leaves and counting
        return this.getPendingLeaves().pipe(
          map((leaves: Leave[]) => leaves ? leaves.length : 0),
          catchError(() => of(0)) // If all fails, return 0
        );
      })
    );
  }

  /**
   * Get comprehensive dashboard data in a single call
   * @returns Observable<DashboardData> Dashboard statistics
   */
  getDashboardData(): Observable<DashboardData> {
    // Use switchMap to make sequential requests for better error handling
    const employeeCount$ = this.getTotalEmployeeCount();
    const pendingLeavesCount$ = this.getPendingLeavesCount();

    return employeeCount$.pipe(
      switchMap(employeeCount => 
        pendingLeavesCount$.pipe(
          map(pendingLeavesCount => ({
            totalEmployees: employeeCount,
            pendingLeaves: pendingLeavesCount,
            lastUpdated: new Date()
          }))
        )
      ),
      catchError(error => {
        console.error('Failed to fetch dashboard data:', error);
        // Return default data if all requests fail
        return of({
          totalEmployees: 0,
          pendingLeaves: 0,
          lastUpdated: new Date(),
          error: 'Failed to load dashboard data'
        });
      })
    );
  }

  /**
   * Refresh dashboard data with error handling
   * @returns Observable<DashboardData> Refreshed dashboard statistics
   */
  refreshDashboardData(): Observable<DashboardData> {
    // Clear any cached data and force fresh fetch
    return this.getDashboardData().pipe(
      catchError(error => {
        console.error('Dashboard refresh failed:', error);
        const enhancedError = new Error('Failed to refresh dashboard data. Please check your connection.');
        (enhancedError as any).type = 'dashboard_refresh_error';
        (enhancedError as any).originalError = error;
        return throwError(() => enhancedError);
      })
    );
  }



  // ===== LEGACY METHODS WITH CONNECTION MANAGEMENT =====

  addEmployee(employee:any,departmentId:any){
    const operation = () => this.httpclient.post(`${endpointurl}/employee/api/add/${departmentId}`,employee);
    return this.retryOperation(operation);
  }

  getDepartmentById(deptid:any) {
    const operation = () => this.httpclient.get(`${endpointurl}/department/api/get/${deptid}`);
    return this.retryOperation(operation);
  }
  
  employeeLogin(employee:any): Observable<Employee>{
    const operation = () => this.httpclient.post<Employee>(`${endpointurl}/employee/api/login`,employee);
    return this.retryOperation(operation);
  }

  getEmployeeById(empId:any){
    const operation = () => this.httpclient.get(`${endpointurl}/employee/api/get/${empId}`);
    return this.retryOperation(operation);
  }


  



  getPayslipData(empId: string): Observable<PayslipData> {
    const operation = () => this.httpclient.get<PayslipData>(`${endpointurl}/employee/api/payslip/${empId}`);
    return this.retryOperation(operation);
  }

  /**
   * Updates employee settings (name and phone number) with connection management
   * @param empId Employee ID
   * @param updateData Object containing empName and/or phoneNo to update
   * @returns Observable<Employee> Updated employee data
   */
  updateEmployeeSettings(empId: number, updateData: EmployeeSettingsUpdate): Observable<Employee> {
    const operation = () => this.httpclient.put<Employee>(`${endpointurl}/employee/api/settings/${empId}`, updateData);
    return this.retryOperation(operation).pipe(
      catchError((error: any) => {
        // Handle specific validation errors for employee settings
        if (error.status === 400 && error.originalError?.error?.fieldErrors) {
          const fieldErrors = error.originalError.error.fieldErrors;
          let specificMessage = error.message;
          let specificType = error.type;
          
          if (typeof fieldErrors === 'string') {
            try {
              const parsedErrors = JSON.parse(fieldErrors.replace(/=/g, ':').replace(/\{|\}/g, ''));
              if (parsedErrors.phoneNo) {
                specificMessage = parsedErrors.phoneNo;
                specificType = 'phone_validation_error';
              } else if (parsedErrors.empName) {
                specificMessage = parsedErrors.empName;
                specificType = 'name_validation_error';
              }
            } catch (parseError) {
              if (fieldErrors.includes('phoneNo')) {
                specificType = 'phone_validation_error';
              } else if (fieldErrors.includes('empName')) {
                specificType = 'name_validation_error';
              }
            }
          } else if (typeof fieldErrors === 'object') {
            if (fieldErrors.phoneNo) {
              specificMessage = fieldErrors.phoneNo;
              specificType = 'phone_validation_error';
            } else if (fieldErrors.empName) {
              specificMessage = fieldErrors.empName;
              specificType = 'name_validation_error';
            }
          }
          
          const enhancedError = new Error(specificMessage);
          (enhancedError as any).status = error.status;
          (enhancedError as any).type = specificType;
          (enhancedError as any).originalError = error.originalError;
          (enhancedError as any).fieldErrors = fieldErrors;
          
          return throwError(() => enhancedError);
        }
        
        return throwError(() => error);
      })
    );
  }

}
