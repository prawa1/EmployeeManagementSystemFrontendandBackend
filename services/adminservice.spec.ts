import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';

import { Adminservice, EmployeeSettingsUpdate, PagedResponse, Leave } from './adminservice';
import { Employee } from '../model/employeemodel';
import { endpointurl } from '../model/backendport';

describe('Adminservice', () => {
  let service: Adminservice;
  let httpMock: HttpTestingController;

  const mockEmployee: Employee = {
    empId: 1001,
    empName: 'John Doe',
    phoneNo: '1234567890',
    email: 'john.doe@example.com',
    password: 'password',
    role: 'Employee',
    managerId: 1,
    salary: 50000,
    address: '123 Main St',
    joiningDate: '2023-01-01',
    gender: 'Male',
    department: {
      deptId: 1,
      deptName: 'IT'
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [Adminservice]
    });
    service = TestBed.inject(Adminservice);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===== DATABASE CONNECTION MANAGEMENT TESTS =====

  describe('Database Connection Management', () => {
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

      it('should return false when health check fails', () => {
        service.testConnection().subscribe(result => {
          expect(result).toBe(false);
          expect(service.isConnectionHealthy()).toBe(false);
          expect(service.getLastHealthCheck()).toBeTruthy();
        });

        const req = httpMock.expectOne(`${endpointurl}/actuator/health`);
        req.flush({}, { status: 503, statusText: 'Service Unavailable' });
      });

      it('should timeout after 5 seconds', fakeAsync(() => {
        let result: boolean | undefined;
        service.testConnection().subscribe(r => result = r);

        const req = httpMock.expectOne(`${endpointurl}/actuator/health`);
        
        tick(5000);
        
        expect(result).toBe(false);
        expect(service.isConnectionHealthy()).toBe(false);
      }));
    });

    describe('retryOperation', () => {
      it('should succeed on first attempt', () => {
        const httpClient = (service as any).httpclient as HttpClient;
        const mockOperation = () => httpClient.get<Employee>(`${endpointurl}/test`);
        
        service.retryOperation(mockOperation).subscribe(result => {
          expect(result).toEqual(mockEmployee);
        });

        const req = httpMock.expectOne(`${endpointurl}/test`);
        req.flush(mockEmployee);
      });

      it('should retry connection errors with exponential backoff', fakeAsync(() => {
        const httpClient = (service as any).httpclient as HttpClient;
        const mockOperation = () => httpClient.get<Employee>(`${endpointurl}/test`);
        let requestCount = 0;
        
        service.retryOperation(mockOperation).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.message).toContain('Database connection failed after 3 attempts');
            expect(requestCount).toBe(4); // Initial + 3 retries
          }
        );

        // Initial request
        let req = httpMock.expectOne(`${endpointurl}/test`);
        requestCount++;
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // First retry after 1000ms
        tick(1000);
        req = httpMock.expectOne(`${endpointurl}/test`);
        requestCount++;
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // Second retry after 2000ms
        tick(2000);
        req = httpMock.expectOne(`${endpointurl}/test`);
        requestCount++;
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // Third retry after 4000ms
        tick(4000);
        req = httpMock.expectOne(`${endpointurl}/test`);
        requestCount++;
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        tick(1000); // Allow error to propagate
      }));

      it('should succeed after retry', fakeAsync(() => {
        const httpClient = (service as any).httpclient as HttpClient;
        const mockOperation = () => httpClient.get<Employee>(`${endpointurl}/test`);
        
        service.retryOperation(mockOperation).subscribe(result => {
          expect(result).toEqual(mockEmployee);
        });

        // First request fails
        let req = httpMock.expectOne(`${endpointurl}/test`);
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // Retry after 1000ms succeeds
        tick(1000);
        req = httpMock.expectOne(`${endpointurl}/test`);
        req.flush(mockEmployee);
      }));

      it('should not retry non-connection errors', () => {
        const httpClient = (service as any).httpclient as HttpClient;
        const mockOperation = () => httpClient.get<Employee>(`${endpointurl}/test`);
        
        service.retryOperation(mockOperation).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.type).toBe('validation_error');
          }
        );

        const req = httpMock.expectOne(`${endpointurl}/test`);
        req.flush({}, { status: 400, statusText: 'Bad Request' });
      });

      it('should timeout after 30 seconds', fakeAsync(() => {
        const httpClient = (service as any).httpclient as HttpClient;
        const mockOperation = () => httpClient.get<Employee>(`${endpointurl}/test`);
        
        service.retryOperation(mockOperation).subscribe(
          () => fail('Expected timeout'),
          error => {
            expect(error.message).toContain('timeout');
          }
        );

        httpMock.expectOne(`${endpointurl}/test`);
        tick(30000);
      }));
    });
  });

  // ===== ENHANCED ADMIN METHODS TESTS =====

  describe('Enhanced Admin Methods', () => {
    describe('registerEmployee', () => {
      it('should register employee successfully', () => {
        const departmentId = 1;
        
        service.registerEmployee(mockEmployee, departmentId).subscribe(result => {
          expect(result).toEqual(mockEmployee);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/add/${departmentId}`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(mockEmployee);
        req.flush(mockEmployee);
      });

      it('should retry on connection failure', fakeAsync(() => {
        const departmentId = 1;
        
        service.registerEmployee(mockEmployee, departmentId).subscribe(result => {
          expect(result).toEqual(mockEmployee);
        });

        // First request fails
        let req = httpMock.expectOne(`${endpointurl}/employee/api/add/${departmentId}`);
        req.error(new ErrorEvent('Network error'), { status: 0 });
        
        // Retry succeeds
        tick(1000);
        req = httpMock.expectOne(`${endpointurl}/employee/api/add/${departmentId}`);
        req.flush(mockEmployee);
      }));
    });

    describe('getAllEmployeesWithPagination', () => {
      const mockPagedResponse: PagedResponse<Employee> = {
        content: [mockEmployee],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0
      };

      it('should get all employees without pagination', () => {
        service.getAllEmployeesWithPagination().subscribe(result => {
          expect(result).toEqual(mockPagedResponse);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/all`);
        expect(req.request.method).toBe('GET');
        req.flush(mockPagedResponse);
      });

      it('should get all employees with pagination', () => {
        service.getAllEmployeesWithPagination(0, 10).subscribe(result => {
          expect(result).toEqual(mockPagedResponse);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/all?page=0&size=10`);
        expect(req.request.method).toBe('GET');
        req.flush(mockPagedResponse);
      });
    });

    describe('searchEmployees', () => {
      it('should search employees successfully', () => {
        const query = 'John';
        const searchResults = [mockEmployee];
        
        service.searchEmployees(query).subscribe(result => {
          expect(result).toEqual(searchResults);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}`);
        expect(req.request.method).toBe('GET');
        req.flush(searchResults);
      });

      it('should handle special characters in search query', () => {
        const query = 'John & Jane';
        const searchResults = [mockEmployee];
        
        service.searchEmployees(query).subscribe(result => {
          expect(result).toEqual(searchResults);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}`);
        req.flush(searchResults);
      });
    });

    describe('updateEmployee', () => {
      it('should update employee successfully', () => {
        const empId = 1001;
        const updatedEmployee = { ...mockEmployee, empName: 'Jane Doe' };
        
        service.updateEmployee(empId, updatedEmployee).subscribe(result => {
          expect(result).toEqual(updatedEmployee);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/update/${empId}`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(updatedEmployee);
        req.flush(updatedEmployee);
      });
    });

    describe('deleteEmployee', () => {
      it('should delete employee successfully', () => {
        const empId = 1001;
        
        service.deleteEmployee(empId).subscribe(result => {
          expect(result).toBeUndefined();
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
      });
    });

    describe('checkEmployeeDependencies', () => {
      it('should return no dependencies when employee has no dependent records', () => {
        const empId = 1001;
        const mockDependencyResult = {
          hasDependencies: false,
          dependencies: []
        };
        
        service.checkEmployeeDependencies(empId).subscribe(result => {
          expect(result).toEqual(mockDependencyResult);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockDependencyResult);
      });

      it('should return dependencies when employee has dependent records', () => {
        const empId = 1001;
        const mockDependencyResult = {
          hasDependencies: true,
          dependencies: ['2 leave record(s)', '1 payslip record(s)']
        };
        
        service.checkEmployeeDependencies(empId).subscribe(result => {
          expect(result).toEqual(mockDependencyResult);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockDependencyResult);
      });

      it('should use fallback method when dependencies endpoint is not available', () => {
        const empId = 1001;
        const mockLeaves = [
          { leaveId: 1, employee: mockEmployee, leaveType: 'Annual' },
          { leaveId: 2, employee: mockEmployee, leaveType: 'Sick' }
        ];
        const mockPayslips = [
          { payslipId: 1, employee: mockEmployee, month: 'January' }
        ];
        
        service.checkEmployeeDependencies(empId).subscribe(result => {
          expect(result.hasDependencies).toBe(true);
          expect(result.dependencies).toContain('2 leave record(s)');
          expect(result.dependencies).toContain('1 payslip record(s)');
        });

        // Dependencies endpoint fails
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Fallback to leaves endpoint
        const leavesReq = httpMock.expectOne(`${endpointurl}/leave/api/employee/${empId}`);
        leavesReq.flush(mockLeaves);

        // Fallback to payslips endpoint
        const payslipsReq = httpMock.expectOne(`${endpointurl}/payslip/api/employee/${empId}`);
        payslipsReq.flush(mockPayslips);
      });

      it('should handle fallback method when both leaves and payslips endpoints fail', () => {
        const empId = 1001;
        
        service.checkEmployeeDependencies(empId).subscribe(result => {
          expect(result.hasDependencies).toBe(false);
          expect(result.dependencies).toEqual([]);
        });

        // Dependencies endpoint fails
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Leaves endpoint fails
        const leavesReq = httpMock.expectOne(`${endpointurl}/leave/api/employee/${empId}`);
        leavesReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Payslips endpoint fails
        const payslipsReq = httpMock.expectOne(`${endpointurl}/payslip/api/employee/${empId}`);
        payslipsReq.flush({}, { status: 404, statusText: 'Not Found' });
      });
    });

    describe('deleteEmployeeById', () => {
      it('should delete employee successfully when no dependencies exist', () => {
        const empId = 1001;
        const mockDependencyResult = {
          hasDependencies: false,
          dependencies: []
        };
        
        service.deleteEmployeeById(empId).subscribe(result => {
          expect(result).toBeUndefined();
        });

        // First check dependencies
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);

        // Then delete employee
        const deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        expect(deleteReq.request.method).toBe('DELETE');
        deleteReq.flush(null);
      });

      it('should prevent deletion when employee has dependencies', () => {
        const empId = 1001;
        const mockDependencyResult = {
          hasDependencies: true,
          dependencies: ['2 leave record(s)', '1 payslip record(s)']
        };
        
        service.deleteEmployeeById(empId).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.type).toBe('dependency_error');
            expect(error.status).toBe(409);
            expect(error.message).toContain('Cannot delete employee');
            expect(error.message).toContain('2 leave record(s)');
            expect(error.message).toContain('1 payslip record(s)');
            expect(error.dependencies).toEqual(mockDependencyResult.dependencies);
          }
        );

        // Only check dependencies, no delete request should be made
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);
      });

      it('should handle employee not found error', () => {
        const empId = 1001;
        const mockDependencyResult = {
          hasDependencies: false,
          dependencies: []
        };
        
        service.deleteEmployeeById(empId).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.type).toBe('not_found');
            expect(error.status).toBe(404);
            expect(error.message).toBe('Employee not found');
          }
        );

        // Check dependencies first
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);

        // Delete request fails with 404
        const deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        deleteReq.flush({}, { status: 404, statusText: 'Not Found' });
      });

      it('should handle backend dependency conflict error', () => {
        const empId = 1001;
        const mockDependencyResult = {
          hasDependencies: false,
          dependencies: []
        };
        
        service.deleteEmployeeById(empId).subscribe(
          () => fail('Expected error'),
          error => {
            expect(error.type).toBe('dependency_error');
            expect(error.status).toBe(409);
            expect(error.message).toBe('Cannot delete employee due to existing dependencies');
          }
        );

        // Check dependencies first (shows no dependencies)
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);

        // Delete request fails with 409 (backend found dependencies)
        const deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        deleteReq.flush({}, { status: 409, statusText: 'Conflict' });
      });

      it('should retry deletion on connection failure', fakeAsync(() => {
        const empId = 1001;
        const mockDependencyResult = {
          hasDependencies: false,
          dependencies: []
        };
        
        service.deleteEmployeeById(empId).subscribe(result => {
          expect(result).toBeUndefined();
        });

        // Check dependencies first
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);

        // First delete request fails with connection error
        let deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        deleteReq.error(new ErrorEvent('Network error'), { status: 0 });

        // Retry after 1000ms succeeds
        tick(1000);
        deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        deleteReq.flush(null);
      }));
    });

    // ===== COMPREHENSIVE LEAVE MANAGEMENT TESTS =====

    describe('Leave Management Operations - Comprehensive Tests', () => {
      const mockLeave: Leave = {
        leaveId: 1,
        employee: mockEmployee,
        leaveType: 'Annual',
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        reason: 'Vacation',
        status: 'PENDING',
        appliedDate: '2023-12-15'
      };

      const mockLeave2: Leave = {
        leaveId: 2,
        employee: { ...mockEmployee, empId: 1002, empName: 'Jane Smith' },
        leaveType: 'Sick',
        startDate: '2024-01-10',
        endDate: '2024-01-12',
        reason: 'Medical appointment',
        status: 'PENDING',
        appliedDate: '2024-01-08'
      };

      describe('getPendingLeaves - Mock Data and Error Scenarios', () => {
        it('should get pending leaves successfully with multiple records', () => {
          const pendingLeaves = [mockLeave, mockLeave2];
          
          service.getPendingLeaves().subscribe(result => {
            expect(result).toEqual(pendingLeaves);
            expect(result.length).toBe(2);
            expect(result[0].status).toBe('PENDING');
            expect(result[1].status).toBe('PENDING');
            expect(result[0].employee.empName).toBe('John Doe');
            expect(result[1].employee.empName).toBe('Jane Smith');
          });

          const req = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
          expect(req.request.method).toBe('GET');
          req.flush(pendingLeaves);
        });

        it('should handle empty pending leaves list', () => {
          service.getPendingLeaves().subscribe(result => {
            expect(result).toEqual([]);
            expect(result.length).toBe(0);
          });

          const req = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
          req.flush([]);
        });

        it('should retry on connection failure', fakeAsync(() => {
          const pendingLeaves = [mockLeave];
          
          service.getPendingLeaves().subscribe(result => {
            expect(result).toEqual(pendingLeaves);
          });

          // First request fails
          let req = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
          req.error(new ErrorEvent('Network error'), { status: 0 });

          // Retry succeeds
          tick(1000);
          req = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
          req.flush(pendingLeaves);
        }));

        it('should handle server error (500)', () => {
          service.getPendingLeaves().subscribe(
            () => fail('Expected server error'),
            error => {
              expect(error.type).toBe('server_error');
              expect(error.status).toBe(500);
              expect(error.message).toBe('Server error. Please try again later.');
            }
          );

          const req = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
          req.flush({}, { status: 500, statusText: 'Internal Server Error' });
        });

        it('should handle unauthorized access (401)', () => {
          service.getPendingLeaves().subscribe(
            () => fail('Expected unauthorized error'),
            error => {
              expect(error.type).toBe('session_expired');
              expect(error.status).toBe(401);
              expect(error.message).toBe('Session expired. Please login again.');
            }
          );

          const req = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
          req.flush({}, { status: 401, statusText: 'Unauthorized' });
        });

        it('should handle database connection timeout', fakeAsync(() => {
          service.getPendingLeaves().subscribe(
            () => fail('Expected timeout error'),
            error => {
              expect(error.message).toContain('Database connection failed after 3 attempts');
            }
          );

          // Simulate multiple connection failures
          for (let i = 0; i < 4; i++) {
            const req = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
            req.error(new ErrorEvent('Network error'), { status: 0 });
            if (i < 3) tick(1000 * Math.pow(2, i)); // Exponential backoff
          }
        }));
      });

      describe('approveLeave - Success and Error Scenarios', () => {
        it('should approve leave without comments', () => {
          const leaveId = 1;
          const approvedLeave = { 
            ...mockLeave, 
            status: 'APPROVED' as const,
            approvedBy: 1,
            approvedDate: '2024-01-15'
          };
          
          service.approveLeave(leaveId).subscribe(result => {
            expect(result).toEqual(approvedLeave);
            expect(result.status).toBe('APPROVED');
            expect(result.approvedBy).toBe(1);
            expect(result.approvedDate).toBeTruthy();
          });

          const req = httpMock.expectOne(`${endpointurl}/leave/api/approve/${leaveId}`);
          expect(req.request.method).toBe('PUT');
          expect(req.request.body).toEqual({});
          req.flush(approvedLeave);
        });

        it('should approve leave with comments', () => {
          const leaveId = 1;
          const comments = 'Approved for vacation. Enjoy your time off!';
          const approvedLeave = { 
            ...mockLeave, 
            status: 'APPROVED' as const, 
            comments,
            approvedBy: 1,
            approvedDate: '2024-01-15'
          };
          
          service.approveLeave(leaveId, comments).subscribe(result => {
            expect(result).toEqual(approvedLeave);
            expect(result.status).toBe('APPROVED');
            expect(result.comments).toBe(comments);
          });

          const req = httpMock.expectOne(`${endpointurl}/leave/api/approve/${leaveId}`);
          expect(req.request.method).toBe('PUT');
          expect(req.request.body).toEqual({ comments });
          req.flush(approvedLeave);
        });

        it('should handle leave not found error (404)', () => {
          const leaveId = 999;
          
          service.approveLeave(leaveId).subscribe(
            () => fail('Expected not found error'),
            error => {
              expect(error.type).toBe('not_found');
              expect(error.status).toBe(404);
              expect(error.message).toBe('Requested resource not found.');
            }
          );

          const req = httpMock.expectOne(`${endpointurl}/leave/api/approve/${leaveId}`);
          req.flush({}, { status: 404, statusText: 'Not Found' });
        });

        it('should handle leave already processed error (409)', () => {
          const leaveId = 1;
          
          service.approveLeave(leaveId).subscribe(
            () => fail('Expected conflict error'),
            error => {
              expect(error.type).toBe('conflict');
              expect(error.status).toBe(409);
              expect(error.message).toBe('Data conflict. Resource already exists.');
            }
          );

          const req = httpMock.expectOne(`${endpointurl}/leave/api/approve/${leaveId}`);
          req.flush({}, { status: 409, statusText: 'Conflict' });
        });

        it('should handle unauthorized approval (403)', () => {
          const leaveId = 1;
          
          service.approveLeave(leaveId).subscribe(
            () => fail('Expected access denied error'),
            error => {
              expect(error.type).toBe('access_denied');
              expect(error.status).toBe(403);
              expect(error.message).toBe('Access denied. Insufficient permissions.');
            }
          );

          const req = httpMock.expectOne(`${endpointurl}/leave/api/approve/${leaveId}`);
          req.flush({}, { status: 403, statusText: 'Forbidden' });
        });

        it('should retry approval on connection failure', fakeAsync(() => {
          const leaveId = 1;
          const approvedLeave = { ...mockLeave, status: 'APPROVED' as const };
          
          service.approveLeave(leaveId).subscribe(result => {
            expect(result).toEqual(approvedLeave);
          });

          // First request fails
          let req = httpMock.expectOne(`${endpointurl}/leave/api/approve/${leaveId}`);
          req.error(new ErrorEvent('Network error'), { status: 0 });

          // Retry succeeds
          tick(1000);
          req = httpMock.expectOne(`${endpointurl}/leave/api/approve/${leaveId}`);
          req.flush(approvedLeave);
        }));

        it('should handle database connection failure during approval', fakeAsync(() => {
          const leaveId = 1;
          
          service.approveLeave(leaveId).subscribe(
            () => fail('Expected connection error'),
            error => {
              expect(error.message).toContain('Database connection failed after 3 attempts');
            }
          );

          // Simulate multiple connection failures
          for (let i = 0; i < 4; i++) {
            const req = httpMock.expectOne(`${endpointurl}/leave/api/approve/${leaveId}`);
            req.error(new ErrorEvent('Network error'), { status: 0 });
            if (i < 3) tick(1000 * Math.pow(2, i));
          }
        }));
      });

      describe('rejectLeave - Success and Error Scenarios', () => {
        it('should reject leave with reason', () => {
          const leaveId = 1;
          const reason = 'Insufficient leave balance. Please check your available days.';
          const rejectedLeave = { 
            ...mockLeave, 
            status: 'REJECTED' as const,
            comments: reason,
            approvedBy: 1,
            approvedDate: '2024-01-15'
          };
          
          service.rejectLeave(leaveId, reason).subscribe(result => {
            expect(result).toEqual(rejectedLeave);
            expect(result.status).toBe('REJECTED');
            expect(result.comments).toBe(reason);
          });

          const req = httpMock.expectOne(`${endpointurl}/leave/api/reject/${leaveId}`);
          expect(req.request.method).toBe('PUT');
          expect(req.request.body).toEqual({ reason });
          req.flush(rejectedLeave);
        });

        it('should reject leave with detailed business reason', () => {
          const leaveId = 2;
          const reason = 'Cannot approve leave during peak business period. Please reschedule for after month-end.';
          const rejectedLeave = { 
            ...mockLeave2, 
            status: 'REJECTED' as const,
            comments: reason
          };
          
          service.rejectLeave(leaveId, reason).subscribe(result => {
            expect(result.status).toBe('REJECTED');
            expect(result.comments).toBe(reason);
            expect(result.leaveType).toBe('Sick');
          });

          const req = httpMock.expectOne(`${endpointurl}/leave/api/reject/${leaveId}`);
          expect(req.request.body).toEqual({ reason });
          req.flush(rejectedLeave);
        });

        it('should handle leave not found error (404)', () => {
          const leaveId = 999;
          const reason = 'Invalid leave request';
          
          service.rejectLeave(leaveId, reason).subscribe(
            () => fail('Expected not found error'),
            error => {
              expect(error.type).toBe('not_found');
              expect(error.status).toBe(404);
              expect(error.message).toBe('Requested resource not found.');
            }
          );

          const req = httpMock.expectOne(`${endpointurl}/leave/api/reject/${leaveId}`);
          req.flush({}, { status: 404, statusText: 'Not Found' });
        });

        it('should handle leave already processed error (409)', () => {
          const leaveId = 1;
          const reason = 'Already processed';
          
          service.rejectLeave(leaveId, reason).subscribe(
            () => fail('Expected conflict error'),
            error => {
              expect(error.type).toBe('conflict');
              expect(error.status).toBe(409);
              expect(error.message).toBe('Data conflict. Resource already exists.');
            }
          );

          const req = httpMock.expectOne(`${endpointurl}/leave/api/reject/${leaveId}`);
          req.flush({}, { status: 409, statusText: 'Conflict' });
        });

        it('should handle validation error for empty reason (400)', () => {
          const leaveId = 1;
          const reason = '';
          
          service.rejectLeave(leaveId, reason).subscribe(
            () => fail('Expected validation error'),
            error => {
              expect(error.type).toBe('validation_error');
              expect(error.status).toBe(400);
            }
          );

          const req = httpMock.expectOne(`${endpointurl}/leave/api/reject/${leaveId}`);
          req.flush('Rejection reason is required', { status: 400, statusText: 'Bad Request' });
        });

        it('should retry rejection on connection failure', fakeAsync(() => {
          const leaveId = 1;
          const reason = 'Business requirements';
          const rejectedLeave = { ...mockLeave, status: 'REJECTED' as const };
          
          service.rejectLeave(leaveId, reason).subscribe(result => {
            expect(result).toEqual(rejectedLeave);
          });

          // First request fails
          let req = httpMock.expectOne(`${endpointurl}/leave/api/reject/${leaveId}`);
          req.error(new ErrorEvent('Network error'), { status: 0 });

          // Retry succeeds
          tick(1000);
          req = httpMock.expectOne(`${endpointurl}/leave/api/reject/${leaveId}`);
          req.flush(rejectedLeave);
        }));

        it('should handle database connection failure during rejection', fakeAsync(() => {
          const leaveId = 1;
          const reason = 'Connection test';
          
          service.rejectLeave(leaveId, reason).subscribe(
            () => fail('Expected connection error'),
            error => {
              expect(error.message).toContain('Database connection failed after 3 attempts');
            }
          );

          // Simulate multiple connection failures
          for (let i = 0; i < 4; i++) {
            const req = httpMock.expectOne(`${endpointurl}/leave/api/reject/${leaveId}`);
            req.error(new ErrorEvent('Network error'), { status: 0 });
            if (i < 3) tick(1000 * Math.pow(2, i));
          }
        }));
      });

      describe('Dashboard Leave Data - Count and Statistics', () => {
        describe('getPendingLeavesCount', () => {
          it('should get pending leaves count successfully', () => {
            const count = 5;
            
            service.getPendingLeavesCount().subscribe(result => {
              expect(result).toBe(count);
              expect(typeof result).toBe('number');
            });

            const req = httpMock.expectOne(`${endpointurl}/leave/api/pending/count`);
            expect(req.request.method).toBe('GET');
            req.flush(count);
          });

          it('should fallback to getPendingLeaves when count endpoint fails', () => {
            const pendingLeaves = [mockLeave, mockLeave2];
            
            service.getPendingLeavesCount().subscribe(result => {
              expect(result).toBe(2);
            });

            // Count endpoint fails
            const countReq = httpMock.expectOne(`${endpointurl}/leave/api/pending/count`);
            countReq.flush({}, { status: 404, statusText: 'Not Found' });

            // Fallback to getPendingLeaves
            const leavesReq = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
            leavesReq.flush(pendingLeaves);
          });

          it('should return 0 when both endpoints fail', () => {
            service.getPendingLeavesCount().subscribe(result => {
              expect(result).toBe(0);
            });

            // Count endpoint fails
            const countReq = httpMock.expectOne(`${endpointurl}/leave/api/pending/count`);
            countReq.flush({}, { status: 404, statusText: 'Not Found' });

            // Fallback also fails
            const leavesReq = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
            leavesReq.flush({}, { status: 500, statusText: 'Internal Server Error' });
          });

          it('should retry count request on connection failure', fakeAsync(() => {
            const count = 3;
            
            service.getPendingLeavesCount().subscribe(result => {
              expect(result).toBe(count);
            });

            // First request fails
            let req = httpMock.expectOne(`${endpointurl}/leave/api/pending/count`);
            req.error(new ErrorEvent('Network error'), { status: 0 });

            // Retry succeeds
            tick(1000);
            req = httpMock.expectOne(`${endpointurl}/leave/api/pending/count`);
            req.flush(count);
          }));
        });

        describe('getDashboardData - Leave Integration', () => {
          it('should include pending leaves count in dashboard data', () => {
            const employeeCount = 10;
            const pendingLeavesCount = 3;
            
            service.getDashboardData().subscribe(result => {
              expect(result.totalEmployees).toBe(employeeCount);
              expect(result.pendingLeaves).toBe(pendingLeavesCount);
              expect(result.lastUpdated).toBeTruthy();
              expect(result.error).toBeUndefined();
            });

            // Employee count request
            const empCountReq = httpMock.expectOne(`${endpointurl}/employee/api/count`);
            empCountReq.flush(employeeCount);

            // Pending leaves count request
            const leavesCountReq = httpMock.expectOne(`${endpointurl}/leave/api/pending/count`);
            leavesCountReq.flush(pendingLeavesCount);
          });

          it('should handle leave count failure gracefully in dashboard', () => {
            const employeeCount = 10;
            
            service.getDashboardData().subscribe(result => {
              expect(result.totalEmployees).toBe(employeeCount);
              expect(result.pendingLeaves).toBe(0); // Fallback value
              expect(result.error).toBeUndefined();
            });

            // Employee count succeeds
            const empCountReq = httpMock.expectOne(`${endpointurl}/employee/api/count`);
            empCountReq.flush(employeeCount);

            // Leave count fails
            const leavesCountReq = httpMock.expectOne(`${endpointurl}/leave/api/pending/count`);
            leavesCountReq.flush({}, { status: 500, statusText: 'Internal Server Error' });

            // Fallback to getPendingLeaves also fails
            const leavesReq = httpMock.expectOne(`${endpointurl}/leave/api/pending`);
            leavesReq.flush({}, { status: 500, statusText: 'Internal Server Error' });
          });

          it('should return error in dashboard when all requests fail', () => {
            service.getDashboardData().subscribe(result => {
              expect(result.totalEmployees).toBe(0);
              expect(result.pendingLeaves).toBe(0);
              expect(result.error).toBe('Failed to load dashboard data');
            });

            // Employee count fails
            const empCountReq = httpMock.expectOne(`${endpointurl}/employee/api/count`);
            empCountReq.flush({}, { status: 500, statusText: 'Internal Server Error' });
          });
        });
      });
    });
  });

  describe('updateEmployeeSettings', () => {
    const empId = 1001;
    const updateData: EmployeeSettingsUpdate = {
      empName: 'Jane Doe',
      phoneNo: '9876543210'
    };

    it('should successfully update employee settings', () => {
      const updatedEmployee = { ...mockEmployee, ...updateData };

      service.updateEmployeeSettings(empId, updateData).subscribe(
        (response) => {
          expect(response).toEqual(updatedEmployee);
          expect(response.empName).toBe('Jane Doe');
          expect(response.phoneNo).toBe('9876543210');
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(updatedEmployee);
    });

    it('should update only name when phoneNo is not provided', () => {
      const nameOnlyUpdate: EmployeeSettingsUpdate = { empName: 'Jane Smith' };
      const updatedEmployee = { ...mockEmployee, empName: 'Jane Smith' };

      service.updateEmployeeSettings(empId, nameOnlyUpdate).subscribe(
        (response) => {
          expect(response.empName).toBe('Jane Smith');
          expect(response.phoneNo).toBe(mockEmployee.phoneNo); // Should remain unchanged
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(nameOnlyUpdate);
      req.flush(updatedEmployee);
    });

    it('should update only phone when empName is not provided', () => {
      const phoneOnlyUpdate: EmployeeSettingsUpdate = { phoneNo: '5555555555' };
      const updatedEmployee = { ...mockEmployee, phoneNo: '5555555555' };

      service.updateEmployeeSettings(empId, phoneOnlyUpdate).subscribe(
        (response) => {
          expect(response.phoneNo).toBe('5555555555');
          expect(response.empName).toBe(mockEmployee.empName); // Should remain unchanged
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(phoneOnlyUpdate);
      req.flush(updatedEmployee);
    });

    it('should handle validation errors (400)', () => {
      const errorResponse = {
        status: 400,
        error: 'Validation Failed',
        message: 'Invalid input data',
        fieldErrors: {
          empName: 'Name must be between 2 and 30 characters',
          phoneNo: 'Phone number must be exactly 10 digits'
        }
      };

      service.updateEmployeeSettings(empId, updateData).subscribe(
        () => fail('Expected error'),
        (error) => {
          expect(error.message).toBe('Name must be between 2 and 30 characters');
          expect(error.type).toBe('name_validation_error');
          expect(error.status).toBe(400);
          expect(error.fieldErrors).toEqual(errorResponse.fieldErrors);
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle phone number validation errors', () => {
      const errorResponse = {
        status: 400,
        error: 'Validation Failed',
        fieldErrors: {
          phoneNo: 'Phone number must be exactly 10 digits'
        }
      };

      service.updateEmployeeSettings(empId, updateData).subscribe(
        () => fail('Expected error'),
        (error) => {
          expect(error.message).toBe('Phone number must be exactly 10 digits');
          expect(error.type).toBe('phone_validation_error');
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle duplicate phone number errors (409)', () => {
      const errorResponse = {
        status: 409,
        error: 'Conflict',
        message: 'Phone number already exists'
      };

      service.updateEmployeeSettings(empId, updateData).subscribe(
        () => fail('Expected error'),
        (error) => {
          expect(error.message).toBe('Phone number already exists. Please use a different phone number');
          expect(error.type).toBe('phone_duplicate_error');
          expect(error.status).toBe(409);
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.flush(errorResponse, { status: 409, statusText: 'Conflict' });
    });

    it('should handle employee not found errors (404)', () => {
      service.updateEmployeeSettings(empId, updateData).subscribe(
        () => fail('Expected error'),
        (error) => {
          expect(error.message).toBe('Employee not found');
          expect(error.type).toBe('employee_not_found');
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.flush({}, { status: 404, statusText: 'Not Found' });
    });

    it('should handle unauthorized errors (401)', () => {
      service.updateEmployeeSettings(empId, updateData).subscribe(
        () => fail('Expected error'),
        (error) => {
          expect(error.message).toBe('Session expired. Please login again');
          expect(error.type).toBe('session_expired');
          expect(error.status).toBe(401);
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle forbidden errors (403)', () => {
      service.updateEmployeeSettings(empId, updateData).subscribe(
        () => fail('Expected error'),
        (error) => {
          expect(error.message).toBe('Access denied. You do not have permission to update this employee');
          expect(error.type).toBe('access_denied');
          expect(error.status).toBe(403);
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle server errors (500)', () => {
      service.updateEmployeeSettings(empId, updateData).subscribe(
        () => fail('Expected error'),
        (error) => {
          expect(error.message).toBe('Server error occurred. Please try again later');
          expect(error.type).toBe('server_error');
          expect(error.status).toBe(500);
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle network errors (0)', () => {
      service.updateEmployeeSettings(empId, updateData).subscribe(
        () => fail('Expected error'),
        (error) => {
          expect(error.message).toBe('Unable to connect to server. Please check your internet connection');
          expect(error.type).toBe('network_error');
          expect(error.status).toBe(0);
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.error(new ErrorEvent('Network error'), { status: 0 });
    });

    it('should handle service unavailable errors (503)', () => {
      service.updateEmployeeSettings(empId, updateData).subscribe(
        () => fail('Expected error'),
        (error) => {
          expect(error.message).toBe('Service temporarily unavailable. Please try again later');
          expect(error.type).toBe('service_unavailable');
          expect(error.status).toBe(503);
        }
      );

      const req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.flush({}, { status: 503, statusText: 'Service Unavailable' });
    });

    it('should retry on connection failure', fakeAsync(() => {
      const updatedEmployee = { ...mockEmployee, ...updateData };

      service.updateEmployeeSettings(empId, updateData).subscribe(
        (response) => {
          expect(response).toEqual(updatedEmployee);
        }
      );

      // First request fails with network error
      let req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.error(new ErrorEvent('Network error'), { status: 0 });

      // Retry after 1000ms succeeds
      tick(1000);
      req = httpMock.expectOne(`${endpointurl}/employee/api/settings/${empId}`);
      req.flush(updatedEmployee);
    }));
  });

  // ===== COMPREHENSIVE EMPLOYEE CRUD OPERATIONS TESTS =====

  describe('Employee CRUD Operations - Comprehensive Tests', () => {
    
    describe('registerEmployee - Success and Validation Scenarios', () => {
      const validEmployee: Employee = {
        empId: null,
        empName: 'John Doe',
        phoneNo: '1234567890',
        email: 'john.doe@example.com',
        password: 'password123',
        role: 'Employee',
        managerId: 1,
        salary: 50000,
        address: '123 Main St',
        joiningDate: '2024-01-01',
        gender: 'Male',
        department: { deptId: 1, deptName: 'IT' }
      };

      it('should register employee successfully with valid data', () => {
        const departmentId = 1;
        const registeredEmployee = { ...validEmployee, empId: 1001 };
        
        service.registerEmployee(validEmployee, departmentId).subscribe(result => {
          expect(result).toEqual(registeredEmployee);
          expect(result.empId).toBe(1001);
          expect(result.empName).toBe('John Doe');
          expect(result.email).toBe('john.doe@example.com');
        });

        // Mock validation checks
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email?email=${encodeURIComponent(validEmployee.email.toString())}`);
        emailCheckReq.flush(false); // Email doesn't exist

        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone?phone=${encodeURIComponent(validEmployee.phoneNo.toString())}`);
        phoneCheckReq.flush(false); // Phone doesn't exist

        // Registration request
        const registerReq = httpMock.expectOne(`${endpointurl}/employee/api/add/${departmentId}`);
        expect(registerReq.request.method).toBe('POST');
        expect(registerReq.request.body).toEqual(validEmployee);
        registerReq.flush(registeredEmployee);
      });

      it('should validate employee name - reject empty name', () => {
        const invalidEmployee = { ...validEmployee, empName: '' };
        const departmentId = 1;
        
        service.registerEmployee(invalidEmployee, departmentId).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.status).toBe(400);
            expect(error.message).toContain('Employee name must be at least 2 characters long');
            expect(error.validationErrors).toContain('Employee name must be at least 2 characters long');
          }
        );

        // No HTTP requests should be made for invalid data
        httpMock.expectNone(`${endpointurl}/employee/api/check-email`);
        httpMock.expectNone(`${endpointurl}/employee/api/add/${departmentId}`);
      });

      it('should validate employee name - reject short name', () => {
        const invalidEmployee = { ...validEmployee, empName: 'J' };
        const departmentId = 1;
        
        service.registerEmployee(invalidEmployee, departmentId).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Employee name must be at least 2 characters long');
          }
        );
      });

      it('should validate email format - reject invalid email', () => {
        const invalidEmployee = { ...validEmployee, email: 'invalid-email' };
        const departmentId = 1;
        
        service.registerEmployee(invalidEmployee, departmentId).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Please provide a valid email address');
          }
        );
      });

      it('should validate phone number format - reject invalid phone', () => {
        const invalidEmployee = { ...validEmployee, phoneNo: '123' };
        const departmentId = 1;
        
        service.registerEmployee(invalidEmployee, departmentId).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Phone number must be exactly 10 digits');
          }
        );
      });

      it('should validate salary - reject low salary', () => {
        const invalidEmployee = { ...validEmployee, salary: 5000 };
        const departmentId = 1;
        
        service.registerEmployee(invalidEmployee, departmentId).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Salary must be at least 10,000');
          }
        );
      });

      it('should prevent registration with duplicate email', () => {
        const departmentId = 1;
        
        service.registerEmployee(validEmployee, departmentId).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('An employee with this email address already exists');
          }
        );

        // Mock email check returning true (email exists)
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email?email=${encodeURIComponent(validEmployee.email.toString())}`);
        emailCheckReq.flush(true);
      });

      it('should prevent registration with duplicate phone number', () => {
        const departmentId = 1;
        
        service.registerEmployee(validEmployee, departmentId).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('An employee with this phone number already exists');
          }
        );

        // Mock validation checks
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email?email=${encodeURIComponent(validEmployee.email.toString())}`);
        emailCheckReq.flush(false); // Email doesn't exist

        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone?phone=${encodeURIComponent(validEmployee.phoneNo.toString())}`);
        phoneCheckReq.flush(true); // Phone exists
      });

      it('should handle backend conflict error (409)', () => {
        const departmentId = 1;
        
        service.registerEmployee(validEmployee, departmentId).subscribe(
          () => fail('Expected conflict error'),
          error => {
            expect(error.type).toBe('conflict');
            expect(error.status).toBe(409);
            expect(error.message).toBe('Employee with this email or phone number already exists');
          }
        );

        // Mock validation checks pass
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email?email=${encodeURIComponent(validEmployee.email.toString())}`);
        emailCheckReq.flush(false);

        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone?phone=${encodeURIComponent(validEmployee.phoneNo.toString())}`);
        phoneCheckReq.flush(false);

        // Registration fails with conflict
        const registerReq = httpMock.expectOne(`${endpointurl}/employee/api/add/${departmentId}`);
        registerReq.flush({}, { status: 409, statusText: 'Conflict' });
      });

      it('should handle backend validation error (400)', () => {
        const departmentId = 1;
        
        service.registerEmployee(validEmployee, departmentId).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.status).toBe(400);
            expect(error.message).toContain('Invalid email format');
          }
        );

        // Mock validation checks pass
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email?email=${encodeURIComponent(validEmployee.email.toString())}`);
        emailCheckReq.flush(false);

        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone?phone=${encodeURIComponent(validEmployee.phoneNo.toString())}`);
        phoneCheckReq.flush(false);

        // Registration fails with validation error
        const registerReq = httpMock.expectOne(`${endpointurl}/employee/api/add/${departmentId}`);
        registerReq.flush('Invalid email format', { status: 400, statusText: 'Bad Request' });
      });

      it('should fallback to getAllEmployees when validation endpoints fail', () => {
        const departmentId = 1;
        const registeredEmployee = { ...validEmployee, empId: 1001 };
        const allEmployees = [
          { empId: 1002, email: 'other@example.com', phoneNo: '9876543210' }
        ];
        
        service.registerEmployee(validEmployee, departmentId).subscribe(result => {
          expect(result).toEqual(registeredEmployee);
        });

        // Email check endpoint fails
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email?email=${encodeURIComponent(validEmployee.email.toString())}`);
        emailCheckReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Fallback to getAllEmployees for email check
        const getAllReq1 = httpMock.expectOne(`${endpointurl}/employee/api/all`);
        getAllReq1.flush(allEmployees);

        // Phone check endpoint fails
        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone?phone=${encodeURIComponent(validEmployee.phoneNo.toString())}`);
        phoneCheckReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Fallback to getAllEmployees for phone check
        const getAllReq2 = httpMock.expectOne(`${endpointurl}/employee/api/all`);
        getAllReq2.flush(allEmployees);

        // Registration succeeds
        const registerReq = httpMock.expectOne(`${endpointurl}/employee/api/add/${departmentId}`);
        registerReq.flush(registeredEmployee);
      });
    });

    describe('updateEmployeeById - Conflict Detection and Validation', () => {
      const empId = 1001;
      const originalEmployee: Employee = {
        empId: 1001,
        empName: 'John Doe',
        phoneNo: '1234567890',
        email: 'john.doe@example.com',
        password: 'password123',
        role: 'Employee',
        managerId: 1,
        salary: 50000,
        address: '123 Main St',
        joiningDate: '2024-01-01',
        gender: 'Male',
        department: { deptId: 1, deptName: 'IT' }
      };

      it('should update employee successfully with valid data', () => {
        const updatedEmployee = { ...originalEmployee, empName: 'Jane Doe', salary: 55000 };
        
        service.updateEmployeeById(empId, updatedEmployee).subscribe(result => {
          expect(result).toEqual(updatedEmployee);
          expect(result.empName).toBe('Jane Doe');
          expect(result.salary).toBe(55000);
        });

        // Mock validation checks for update
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email-update?email=${encodeURIComponent(updatedEmployee.email.toString())}&excludeId=${empId}`);
        emailCheckReq.flush(false); // Email doesn't exist for other employees

        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone-update?phone=${encodeURIComponent(updatedEmployee.phoneNo.toString())}&excludeId=${empId}`);
        phoneCheckReq.flush(false); // Phone doesn't exist for other employees

        // Update request
        const updateReq = httpMock.expectOne(`${endpointurl}/employee/api/update/${empId}`);
        expect(updateReq.request.method).toBe('PUT');
        expect(updateReq.request.body).toEqual(updatedEmployee);
        updateReq.flush(updatedEmployee);
      });

      it('should validate updated employee name', () => {
        const invalidEmployee = { ...originalEmployee, empName: 'J' };
        
        service.updateEmployeeById(empId, invalidEmployee).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Employee name must be at least 2 characters long');
          }
        );
      });

      it('should validate updated email format', () => {
        const invalidEmployee = { ...originalEmployee, email: 'invalid-email' };
        
        service.updateEmployeeById(empId, invalidEmployee).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Please provide a valid email address');
          }
        );
      });

      it('should validate updated phone number format', () => {
        const invalidEmployee = { ...originalEmployee, phoneNo: '123' };
        
        service.updateEmployeeById(empId, invalidEmployee).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Phone number must be exactly 10 digits');
          }
        );
      });

      it('should validate updated salary is positive', () => {
        const invalidEmployee = { ...originalEmployee, salary: -1000 };
        
        service.updateEmployeeById(empId, invalidEmployee).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Salary must be a positive number');
          }
        );
      });

      it('should detect email conflict with another employee', () => {
        const conflictEmployee = { ...originalEmployee, email: 'existing@example.com' };
        
        service.updateEmployeeById(empId, conflictEmployee).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Another employee with this email address already exists');
          }
        );

        // Mock email check returning true (email exists for another employee)
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email-update?email=${encodeURIComponent(conflictEmployee.email.toString())}&excludeId=${empId}`);
        emailCheckReq.flush(true);
      });

      it('should detect phone conflict with another employee', () => {
        const conflictEmployee = { ...originalEmployee, phoneNo: '9876543210' };
        
        service.updateEmployeeById(empId, conflictEmployee).subscribe(
          () => fail('Expected validation error'),
          error => {
            expect(error.type).toBe('validation_error');
            expect(error.validationErrors).toContain('Another employee with this phone number already exists');
          }
        );

        // Mock validation checks
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email-update?email=${encodeURIComponent(conflictEmployee.email.toString())}&excludeId=${empId}`);
        emailCheckReq.flush(false); // Email doesn't exist

        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone-update?phone=${encodeURIComponent(conflictEmployee.phoneNo.toString())}&excludeId=${empId}`);
        phoneCheckReq.flush(true); // Phone exists for another employee
      });

      it('should handle employee not found error (404)', () => {
        const updatedEmployee = { ...originalEmployee, empName: 'Jane Doe' };
        
        service.updateEmployeeById(empId, updatedEmployee).subscribe(
          () => fail('Expected not found error'),
          error => {
            expect(error.type).toBe('not_found');
            expect(error.status).toBe(404);
            expect(error.message).toBe('Employee not found');
          }
        );

        // Mock validation checks pass
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email-update?email=${encodeURIComponent(updatedEmployee.email.toString())}&excludeId=${empId}`);
        emailCheckReq.flush(false);

        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone-update?phone=${encodeURIComponent(updatedEmployee.phoneNo.toString())}&excludeId=${empId}`);
        phoneCheckReq.flush(false);

        // Update fails with 404
        const updateReq = httpMock.expectOne(`${endpointurl}/employee/api/update/${empId}`);
        updateReq.flush({}, { status: 404, statusText: 'Not Found' });
      });

      it('should handle backend conflict error (409)', () => {
        const updatedEmployee = { ...originalEmployee, empName: 'Jane Doe' };
        
        service.updateEmployeeById(empId, updatedEmployee).subscribe(
          () => fail('Expected conflict error'),
          error => {
            expect(error.type).toBe('conflict');
            expect(error.status).toBe(409);
            expect(error.message).toBe('Employee with this email or phone number already exists');
          }
        );

        // Mock validation checks pass
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email-update?email=${encodeURIComponent(updatedEmployee.email.toString())}&excludeId=${empId}`);
        emailCheckReq.flush(false);

        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone-update?phone=${encodeURIComponent(updatedEmployee.phoneNo.toString())}&excludeId=${empId}`);
        phoneCheckReq.flush(false);

        // Update fails with conflict
        const updateReq = httpMock.expectOne(`${endpointurl}/employee/api/update/${empId}`);
        updateReq.flush({}, { status: 409, statusText: 'Conflict' });
      });

      it('should fallback to getAllEmployees when update validation endpoints fail', () => {
        const updatedEmployee = { ...originalEmployee, empName: 'Jane Doe' };
        const allEmployees = [
          { empId: 1001, email: 'john.doe@example.com', phoneNo: '1234567890' },
          { empId: 1002, email: 'other@example.com', phoneNo: '9876543210' }
        ];
        
        service.updateEmployeeById(empId, updatedEmployee).subscribe(result => {
          expect(result).toEqual(updatedEmployee);
        });

        // Email check endpoint fails
        const emailCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-email-update?email=${encodeURIComponent(updatedEmployee.email.toString())}&excludeId=${empId}`);
        emailCheckReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Fallback to getAllEmployees for email check
        const getAllReq1 = httpMock.expectOne(`${endpointurl}/employee/api/all`);
        getAllReq1.flush(allEmployees);

        // Phone check endpoint fails
        const phoneCheckReq = httpMock.expectOne(`${endpointurl}/employee/api/check-phone-update?phone=${encodeURIComponent(updatedEmployee.phoneNo.toString())}&excludeId=${empId}`);
        phoneCheckReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Fallback to getAllEmployees for phone check
        const getAllReq2 = httpMock.expectOne(`${endpointurl}/employee/api/all`);
        getAllReq2.flush(allEmployees);

        // Update succeeds
        const updateReq = httpMock.expectOne(`${endpointurl}/employee/api/update/${empId}`);
        updateReq.flush(updatedEmployee);
      });
    });

    describe('getEmployeeForUpdate - Data Retrieval', () => {
      const empId = 1001;

      it('should retrieve employee data successfully', () => {
        service.getEmployeeForUpdate(empId).subscribe(result => {
          expect(result).toEqual(mockEmployee);
          expect(result.empId).toBe(1001);
          expect(result.empName).toBe('John Doe');
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/get/${empId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockEmployee);
      });

      it('should handle employee not found error (404)', () => {
        service.getEmployeeForUpdate(empId).subscribe(
          () => fail('Expected not found error'),
          error => {
            expect(error.type).toBe('not_found');
            expect(error.status).toBe(404);
            expect(error.message).toBe('Employee not found');
          }
        );

        const req = httpMock.expectOne(`${endpointurl}/employee/api/get/${empId}`);
        req.flush({}, { status: 404, statusText: 'Not Found' });
      });

      it('should retry on connection failure', fakeAsync(() => {
        service.getEmployeeForUpdate(empId).subscribe(result => {
          expect(result).toEqual(mockEmployee);
        });

        // First request fails
        let req = httpMock.expectOne(`${endpointurl}/employee/api/get/${empId}`);
        req.error(new ErrorEvent('Network error'), { status: 0 });

        // Retry succeeds
        tick(1000);
        req = httpMock.expectOne(`${endpointurl}/employee/api/get/${empId}`);
        req.flush(mockEmployee);
      }));
    });

    describe('getAllEmployees - Pagination and Search', () => {
      const mockEmployees = [mockEmployee, { ...mockEmployee, empId: 1002, empName: 'Jane Doe' }];
      const mockPagedResponse: PagedResponse<Employee> = {
        content: mockEmployees,
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0
      };

      it('should get all employees successfully', () => {
        service.getAllEmployees().subscribe(result => {
          expect(result).toEqual(mockEmployees);
          expect(result.length).toBe(2);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/all`);
        expect(req.request.method).toBe('GET');
        req.flush(mockEmployees);
      });

      it('should get employees with pagination', () => {
        service.getAllEmployeesWithPagination(0, 10).subscribe(result => {
          expect(result).toEqual(mockPagedResponse);
          expect(result.content.length).toBe(2);
          expect(result.totalElements).toBe(2);
          expect(result.number).toBe(0);
          expect(result.size).toBe(10);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/all?page=0&size=10`);
        req.flush(mockPagedResponse);
      });

      it('should search employees with pagination and sorting', () => {
        const query = 'John';
        const sortBy = 'empName';
        const sortDirection = 'asc';
        
        service.searchEmployeesWithPagination(query, 0, 10, sortBy, sortDirection).subscribe(result => {
          expect(result.content.length).toBe(1);
          expect(result.content[0].empName).toBe('John Doe');
        });

        const expectedUrl = `${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}&page=0&size=10&sortBy=${sortBy}&sortDirection=${sortDirection}`;
        const req = httpMock.expectOne(expectedUrl);
        req.flush({
          content: [mockEmployee],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0
        });
      });

      it('should fallback to regular search when paginated search fails', () => {
        const query = 'John';
        const searchResults = [mockEmployee];
        
        service.searchEmployeesWithPagination(query, 0, 10).subscribe(result => {
          expect(result.content).toEqual([mockEmployee]);
          expect(result.totalElements).toBe(1);
          expect(result.totalPages).toBe(1);
        });

        // Paginated search fails
        const paginatedReq = httpMock.expectOne(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}&page=0&size=10`);
        paginatedReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Fallback to regular search
        const fallbackReq = httpMock.expectOne(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}`);
        fallbackReq.flush(searchResults);
      });

      it('should sort employees correctly in fallback mode', () => {
        const query = 'test';
        const unsortedEmployees = [
          { ...mockEmployee, empId: 1002, empName: 'Zoe Smith' },
          { ...mockEmployee, empId: 1001, empName: 'Alice Johnson' }
        ];
        
        service.searchEmployeesWithPagination(query, 0, 10, 'empName', 'asc').subscribe(result => {
          expect(result.content[0].empName).toBe('Alice Johnson');
          expect(result.content[1].empName).toBe('Zoe Smith');
        });

        // Paginated search fails
        const paginatedReq = httpMock.expectOne(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}&page=0&size=10&sortBy=empName&sortDirection=asc`);
        paginatedReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Fallback to regular search
        const fallbackReq = httpMock.expectOne(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}`);
        fallbackReq.flush(unsortedEmployees);
      });

      it('should handle empty search results', () => {
        const query = 'nonexistent';
        
        service.searchEmployees(query).subscribe(result => {
          expect(result).toEqual([]);
          expect(result.length).toBe(0);
        });

        const req = httpMock.expectOne(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}`);
        req.flush([]);
      });

      it('should retry search on connection failure', fakeAsync(() => {
        const query = 'John';
        const searchResults = [mockEmployee];
        
        service.searchEmployees(query).subscribe(result => {
          expect(result).toEqual(searchResults);
        });

        // First request fails
        let req = httpMock.expectOne(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}`);
        req.error(new ErrorEvent('Network error'), { status: 0 });

        // Retry succeeds
        tick(1000);
        req = httpMock.expectOne(`${endpointurl}/employee/api/search?q=${encodeURIComponent(query)}`);
        req.flush(searchResults);
      }));
    });

    describe('deleteEmployeeById - Comprehensive Dependency Checking', () => {
      const empId = 1001;

      it('should delete employee successfully when no dependencies exist', () => {
        const mockDependencyResult = {
          hasDependencies: false,
          dependencies: []
        };
        
        service.deleteEmployeeById(empId).subscribe(result => {
          expect(result).toBeUndefined();
        });

        // Check dependencies first
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);

        // Delete employee
        const deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        expect(deleteReq.request.method).toBe('DELETE');
        deleteReq.flush(null);
      });

      it('should prevent deletion when employee has leave dependencies', () => {
        const mockDependencyResult = {
          hasDependencies: true,
          dependencies: ['3 leave record(s)']
        };
        
        service.deleteEmployeeById(empId).subscribe(
          () => fail('Expected dependency error'),
          error => {
            expect(error.type).toBe('dependency_error');
            expect(error.status).toBe(409);
            expect(error.message).toContain('Cannot delete employee');
            expect(error.message).toContain('3 leave record(s)');
            expect(error.dependencies).toEqual(['3 leave record(s)']);
          }
        );

        // Only dependency check, no delete request
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);
      });

      it('should prevent deletion when employee has payslip dependencies', () => {
        const mockDependencyResult = {
          hasDependencies: true,
          dependencies: ['5 payslip record(s)']
        };
        
        service.deleteEmployeeById(empId).subscribe(
          () => fail('Expected dependency error'),
          error => {
            expect(error.type).toBe('dependency_error');
            expect(error.message).toContain('5 payslip record(s)');
          }
        );

        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);
      });

      it('should prevent deletion when employee has multiple dependencies', () => {
        const mockDependencyResult = {
          hasDependencies: true,
          dependencies: ['2 leave record(s)', '3 payslip record(s)']
        };
        
        service.deleteEmployeeById(empId).subscribe(
          () => fail('Expected dependency error'),
          error => {
            expect(error.type).toBe('dependency_error');
            expect(error.message).toContain('2 leave record(s)');
            expect(error.message).toContain('3 payslip record(s)');
            expect(error.dependencies).toEqual(['2 leave record(s)', '3 payslip record(s)']);
          }
        );

        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);
      });

      it('should use fallback dependency checking when endpoint fails', () => {
        const mockLeaves = [
          { leaveId: 1, employee: mockEmployee },
          { leaveId: 2, employee: mockEmployee }
        ];
        const mockPayslips = [
          { payslipId: 1, employee: mockEmployee }
        ];
        
        service.deleteEmployeeById(empId).subscribe(
          () => fail('Expected dependency error'),
          error => {
            expect(error.type).toBe('dependency_error');
            expect(error.message).toContain('2 leave record(s)');
            expect(error.message).toContain('1 payslip record(s)');
          }
        );

        // Dependencies endpoint fails
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Fallback checks
        const leavesReq = httpMock.expectOne(`${endpointurl}/leave/api/employee/${empId}`);
        leavesReq.flush(mockLeaves);

        const payslipsReq = httpMock.expectOne(`${endpointurl}/payslip/api/employee/${empId}`);
        payslipsReq.flush(mockPayslips);
      });

      it('should delete when fallback dependency check finds no dependencies', () => {
        service.deleteEmployeeById(empId).subscribe(result => {
          expect(result).toBeUndefined();
        });

        // Dependencies endpoint fails
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Fallback checks return empty arrays
        const leavesReq = httpMock.expectOne(`${endpointurl}/leave/api/employee/${empId}`);
        leavesReq.flush([]);

        const payslipsReq = httpMock.expectOne(`${endpointurl}/payslip/api/employee/${empId}`);
        payslipsReq.flush([]);

        // Delete proceeds
        const deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        deleteReq.flush(null);
      });

      it('should handle fallback dependency check failures gracefully', () => {
        service.deleteEmployeeById(empId).subscribe(result => {
          expect(result).toBeUndefined();
        });

        // Dependencies endpoint fails
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Both fallback endpoints fail
        const leavesReq = httpMock.expectOne(`${endpointurl}/leave/api/employee/${empId}`);
        leavesReq.flush({}, { status: 404, statusText: 'Not Found' });

        const payslipsReq = httpMock.expectOne(`${endpointurl}/payslip/api/employee/${empId}`);
        payslipsReq.flush({}, { status: 404, statusText: 'Not Found' });

        // Delete proceeds (assumes no dependencies)
        const deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        deleteReq.flush(null);
      });

      it('should handle employee not found during deletion', () => {
        const mockDependencyResult = {
          hasDependencies: false,
          dependencies: []
        };
        
        service.deleteEmployeeById(empId).subscribe(
          () => fail('Expected not found error'),
          error => {
            expect(error.type).toBe('not_found');
            expect(error.status).toBe(404);
            expect(error.message).toBe('Employee not found');
          }
        );

        // Dependencies check passes
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);

        // Delete fails with 404
        const deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        deleteReq.flush({}, { status: 404, statusText: 'Not Found' });
      });

      it('should handle backend dependency conflict during deletion', () => {
        const mockDependencyResult = {
          hasDependencies: false,
          dependencies: []
        };
        
        service.deleteEmployeeById(empId).subscribe(
          () => fail('Expected dependency error'),
          error => {
            expect(error.type).toBe('dependency_error');
            expect(error.status).toBe(409);
            expect(error.message).toBe('Cannot delete employee due to existing dependencies');
          }
        );

        // Dependencies check passes (no dependencies found)
        const dependenciesReq = httpMock.expectOne(`${endpointurl}/employee/api/dependencies/${empId}`);
        dependenciesReq.flush(mockDependencyResult);

        // Delete fails with 409 (backend found dependencies)
        const deleteReq = httpMock.expectOne(`${endpointurl}/employee/api/delete/${empId}`);
        deleteReq.flush({}, { status: 409, statusText: 'Conflict' });
      });
    });

    describe('getAllDepartments - Department Selection Support', () => {
      const mockDepartments = [
        { deptId: 1, deptName: 'Human Resources', deptDescription: 'HR Department' },
        { deptId: 2, deptName: 'Information Technology', deptDescription: 'IT Department' },
        { deptId: 3, deptName: 'Finance', deptDescription: 'Finance Department' }
      ];

      it('should get all departments successfully', () => {
        service.getAllDepartments().subscribe(result => {
          expect(result).toEqual(mockDepartments);
          expect(result.length).toBe(3);
          expect(result[0].deptName).toBe('Human Resources');
        });

        const req = httpMock.expectOne(`${endpointurl}/department/api/all`);
        expect(req.request.method).toBe('GET');
        req.flush(mockDepartments);
      });

      it('should fallback to mock departments when endpoint fails', () => {
        service.getAllDepartments().subscribe(result => {
          expect(result.length).toBe(5); // Mock departments count
          expect(result[0].deptName).toBe('Human Resources');
          expect(result[1].deptName).toBe('Information Technology');
          expect(result[2].deptName).toBe('Finance');
          expect(result[3].deptName).toBe('Marketing');
          expect(result[4].deptName).toBe('Operations');
        });

        const req = httpMock.expectOne(`${endpointurl}/department/api/all`);
        req.flush({}, { status: 404, statusText: 'Not Found' });
      });

      it('should retry department fetch on connection failure', fakeAsync(() => {
        service.getAllDepartments().subscribe(result => {
          expect(result).toEqual(mockDepartments);
        });

        // First request fails
        let req = httpMock.expectOne(`${endpointurl}/department/api/all`);
        req.error(new ErrorEvent('Network error'), { status: 0 });

        // Retry succeeds
        tick(1000);
        req = httpMock.expectOne(`${endpointurl}/department/api/all`);
        req.flush(mockDepartments);
      }));
    });
  });
});
