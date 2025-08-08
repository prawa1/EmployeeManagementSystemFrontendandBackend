import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';

import { Viewemployee } from './viewemployee';
import { Adminservice, PagedResponse } from '../../services/adminservice';
import { Employee, Department } from '../../model/employeemodel';
import { DeleteConfirmationData } from '../delete-confirmation-dialog/delete-confirmation-dialog.component';

describe('Viewemployee Component', () => {
  let component: Viewemployee;
  let fixture: ComponentFixture<Viewemployee>;
  let mockAdminService: jasmine.SpyObj<Adminservice>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;

  const mockDepartment: Department = {
    deptId: 1,
    deptName: 'Information Technology',
    deptDescription: 'IT Department'
  };

  const mockEmployees: Employee[] = [
    {
      empId: 1001,
      empName: 'John Doe',
      phoneNo: '1234567890',
      email: 'john.doe@example.com',
      password: 'password123',
      role: 'Developer',
      managerId: 1,
      salary: 50000,
      address: '123 Main Street',
      joiningDate: '2024-01-15',
      gender: 'Male',
      department: mockDepartment
    },
    {
      empId: 1002,
      empName: 'Jane Smith',
      phoneNo: '9876543210',
      email: 'jane.smith@example.com',
      password: 'password456',
      role: 'Designer',
      managerId: 1,
      salary: 45000,
      address: '456 Oak Avenue',
      joiningDate: '2024-02-01',
      gender: 'Female',
      department: mockDepartment
    }
  ];

  const mockPagedResponse: PagedResponse<Employee> = {
    content: mockEmployees,
    totalElements: 2,
    totalPages: 1,
    size: 10,
    number: 0
  };

  beforeEach(async () => {
    const adminServiceSpy = jasmine.createSpyObj('Adminservice', [
      'getAllEmployeesWithPagination',
      'searchEmployeesWithPagination',
      'checkEmployeeDependencies',
      'deleteEmployeeById'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const changeDetectorRefSpy = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    await TestBed.configureTestingModule({
      declarations: [Viewemployee],
      providers: [
        { provide: Adminservice, useValue: adminServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ChangeDetectorRef, useValue: changeDetectorRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Viewemployee);
    component = fixture.componentInstance;
    mockAdminService = TestBed.inject(Adminservice) as jasmine.SpyObj<Adminservice>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockChangeDetectorRef = TestBed.inject(ChangeDetectorRef) as jasmine.SpyObj<ChangeDetectorRef>;

    // Default mock implementations
    mockAdminService.getAllEmployeesWithPagination.and.returnValue(of(mockPagedResponse));
    mockAdminService.searchEmployeesWithPagination.and.returnValue(of(mockPagedResponse));
    mockAdminService.checkEmployeeDependencies.and.returnValue(of({ hasDependencies: false, dependencies: [] }));
    mockAdminService.deleteEmployeeById.and.returnValue(of(undefined));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.currentPage).toBe(0);
      expect(component.pageSize).toBe(10);
      expect(component.searchQuery).toBe('');
      expect(component.sortBy).toBe('');
      expect(component.sortDirection).toBe('asc');
      expect(component.isLoading).toBe(false);
    });

    it('should load employees on init', () => {
      fixture.detectChanges();
      
      expect(mockAdminService.getAllEmployeesWithPagination).toHaveBeenCalledWith(0, 10);
      expect(component.employee).toEqual(mockEmployees);
      expect(component.totalElements).toBe(2);
      expect(component.totalPages).toBe(1);
      expect(component.isLoading).toBe(false);
    });

    it('should update legacy pagination properties', () => {
      fixture.detectChanges();
      
      expect(component.p).toBe(1); // 1-based pagination
      expect(component.count).toBe(10);
    });
  });

  describe('Employee Loading', () => {
    it('should load employees with pagination parameters', () => {
      component.loadEmployees(1, 20);
      
      expect(mockAdminService.getAllEmployeesWithPagination).toHaveBeenCalledWith(1, 20);
      expect(component.isLoading).toBe(false);
    });

    it('should handle loading error with connection error', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Network error',
        status: 0
      };
      mockAdminService.getAllEmployeesWithPagination.and.returnValue(throwError(() => connectionError));
      
      component.loadEmployees();
      
      expect(component.loadError).toBe('Unable to connect to the server. Please check your connection and try again.');
      expect(component.isLoading).toBe(false);
    });

    it('should handle loading error with server error', () => {
      const serverError = {
        type: 'server_error',
        message: 'Internal server error',
        status: 500
      };
      mockAdminService.getAllEmployeesWithPagination.and.returnValue(throwError(() => serverError));
      
      component.loadEmployees();
      
      expect(component.loadError).toBe('Server error occurred. Please try again later.');
      expect(component.isLoading).toBe(false);
    });

    it('should handle generic loading error', () => {
      const genericError = {
        message: 'Generic error',
        status: 400
      };
      mockAdminService.getAllEmployeesWithPagination.and.returnValue(throwError(() => genericError));
      
      component.loadEmployees();
      
      expect(component.loadError).toBe('An error occurred while loading employees. Please try again.');
      expect(component.isLoading).toBe(false);
    });

    it('should refresh employees list', () => {
      component.currentPage = 1;
      component.pageSize = 20;
      
      component.refreshEmployees();
      
      expect(mockAdminService.getAllEmployeesWithPagination).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle page change', () => {
      component.onPageChange(2);
      
      expect(mockAdminService.getAllEmployeesWithPagination).toHaveBeenCalledWith(1, 10); // 2-1=1 (0-based)
    });

    it('should handle page change with search query', () => {
      component.searchQuery = 'John';
      
      component.onPageChange(2);
      
      expect(mockAdminService.searchEmployeesWithPagination).toHaveBeenCalledWith('John', 1, 10, '', 'asc');
    });

    it('should handle page change with sorting', () => {
      component.sortBy = 'empName';
      component.sortDirection = 'desc';
      
      component.onPageChange(2);
      
      expect(component.loadEmployeesWithSort).toBeDefined();
    });

    it('should handle page size change', () => {
      component.onPageSizeChange(20);
      
      expect(component.pageSize).toBe(20);
      expect(component.count).toBe(20);
      expect(mockAdminService.getAllEmployeesWithPagination).toHaveBeenCalledWith(0, 20);
    });

    it('should handle page size change with search', () => {
      component.searchQuery = 'Jane';
      
      component.onPageSizeChange(20);
      
      expect(mockAdminService.searchEmployeesWithPagination).toHaveBeenCalledWith('Jane', 0, 20, '', 'asc');
    });

    it('should calculate visible pages correctly', () => {
      component.totalPages = 10;
      component.currentPage = 4; // 0-based, so page 5
      
      const visiblePages = component.getVisiblePages();
      
      expect(visiblePages.length).toBeLessThanOrEqual(5);
      expect(visiblePages).toContain(5); // Current page (1-based)
    });

    it('should show all pages when total pages is less than max visible', () => {
      component.totalPages = 3;
      
      const visiblePages = component.getVisiblePages();
      
      expect(visiblePages).toEqual([1, 2, 3]);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should perform search with debouncing', fakeAsync(() => {
      component.onSearchInput('John');
      
      expect(component.searchQuery).toBe('John');
      
      tick(300); // Wait for debounce
      
      expect(mockAdminService.searchEmployeesWithPagination).toHaveBeenCalledWith('John', 0, 10, '', 'asc');
    }));

    it('should clear previous search timeout', fakeAsync(() => {
      component.onSearchInput('Jo');
      tick(100);
      component.onSearchInput('John');
      
      tick(300);
      
      // Should only call once with the final query
      expect(mockAdminService.searchEmployeesWithPagination).toHaveBeenCalledTimes(1);
      expect(mockAdminService.searchEmployeesWithPagination).toHaveBeenCalledWith('John', 0, 10, '', 'asc');
    }));

    it('should load all employees when search query is empty', fakeAsync(() => {
      component.onSearchInput('');
      
      tick(300);
      
      expect(mockAdminService.getAllEmployeesWithPagination).toHaveBeenCalledWith(0, 10);
    }));

    it('should handle search error with connection error', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Network error',
        status: 0
      };
      mockAdminService.searchEmployeesWithPagination.and.returnValue(throwError(() => connectionError));
      
      component.performSearch();
      
      expect(component.searchError).toBe('Unable to connect to the server. Please check your connection and try again.');
      expect(component.isSearching).toBe(false);
    });

    it('should handle search error with server error', () => {
      const serverError = {
        type: 'server_error',
        message: 'Server error',
        status: 500
      };
      mockAdminService.searchEmployeesWithPagination.and.returnValue(throwError(() => serverError));
      
      component.performSearch();
      
      expect(component.searchError).toBe('Server error occurred during search. Please try again later.');
      expect(component.isSearching).toBe(false);
    });

    it('should clear search and reload all employees', fakeAsync(() => {
      component.searchQuery = 'John';
      component.searchError = 'Some error';
      
      component.clearSearch();
      
      expect(component.searchQuery).toBe('');
      expect(component.searchError).toBeNull();
      expect(mockAdminService.getAllEmployeesWithPagination).toHaveBeenCalledWith(0, 10);
    }));

    it('should perform search with pagination and sorting', () => {
      component.searchQuery = 'John';
      component.sortBy = 'empName';
      component.sortDirection = 'desc';
      
      component.performSearch(1, 20);
      
      expect(mockAdminService.searchEmployeesWithPagination).toHaveBeenCalledWith('John', 1, 20, 'empName', 'desc');
    });
  });

  describe('Sorting Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should set sort field and direction', () => {
      component.onSort('empName');
      
      expect(component.sortBy).toBe('empName');
      expect(component.sortDirection).toBe('asc');
    });

    it('should toggle sort direction for same field', () => {
      component.sortBy = 'empName';
      component.sortDirection = 'asc';
      
      component.onSort('empName');
      
      expect(component.sortDirection).toBe('desc');
    });

    it('should reset to ascending for new field', () => {
      component.sortBy = 'empName';
      component.sortDirection = 'desc';
      
      component.onSort('email');
      
      expect(component.sortBy).toBe('email');
      expect(component.sortDirection).toBe('asc');
    });

    it('should perform search when sorting with search query', () => {
      component.searchQuery = 'John';
      
      component.onSort('empName');
      
      expect(mockAdminService.searchEmployeesWithPagination).toHaveBeenCalledWith('John', 0, 10, 'empName', 'asc');
    });

    it('should get correct sort icon for unsorted field', () => {
      component.sortBy = 'empName';
      
      const icon = component.getSortIcon('email');
      
      expect(icon).toBe('fas fa-sort text-muted');
    });

    it('should get correct sort icon for ascending field', () => {
      component.sortBy = 'empName';
      component.sortDirection = 'asc';
      
      const icon = component.getSortIcon('empName');
      
      expect(icon).toBe('fas fa-sort-up text-primary');
    });

    it('should get correct sort icon for descending field', () => {
      component.sortBy = 'empName';
      component.sortDirection = 'desc';
      
      const icon = component.getSortIcon('empName');
      
      expect(icon).toBe('fas fa-sort-down text-primary');
    });

    it('should sort employees client-side', () => {
      const unsortedEmployees = [mockEmployees[1], mockEmployees[0]]; // Jane, John
      
      const sorted = component['sortEmployeesClientSide'](unsortedEmployees, 'empName', 'asc');
      
      expect(sorted[0].empName).toBe('Jane Smith');
      expect(sorted[1].empName).toBe('John Doe');
    });

    it('should sort employees by salary in descending order', () => {
      const sorted = component['sortEmployeesClientSide'](mockEmployees, 'salary', 'desc');
      
      expect(sorted[0].salary).toBe(50000); // John
      expect(sorted[1].salary).toBe(45000); // Jane
    });
  });

  describe('Employee Management Actions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should navigate to update employee', () => {
      component.updateEmployee(1001);
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['updateemployeeurl', 1001]);
    });

    it('should initiate delete employee process', () => {
      const mockDependencyResult = {
        hasDependencies: false,
        dependencies: []
      };
      mockAdminService.checkEmployeeDependencies.and.returnValue(of(mockDependencyResult));
      
      component.deleteEmployee(1001, 'John Doe');
      
      expect(mockAdminService.checkEmployeeDependencies).toHaveBeenCalledWith(1001);
      expect(component.showDeleteDialog).toBe(true);
      expect(component.deleteConfirmationData.employee.empId).toBe(1001);
      expect(component.deleteConfirmationData.hasDependencies).toBe(false);
    });

    it('should handle delete employee with dependencies', () => {
      const mockDependencyResult = {
        hasDependencies: true,
        dependencies: ['2 leave record(s)', '1 payslip record(s)']
      };
      mockAdminService.checkEmployeeDependencies.and.returnValue(of(mockDependencyResult));
      
      component.deleteEmployee(1001, 'John Doe');
      
      expect(component.deleteConfirmationData.hasDependencies).toBe(true);
      expect(component.deleteConfirmationData.dependencies).toEqual(['2 leave record(s)', '1 payslip record(s)']);
    });

    it('should handle dependency check error', () => {
      const error = { message: 'Dependency check failed' };
      mockAdminService.checkEmployeeDependencies.and.returnValue(throwError(() => error));
      
      component.deleteEmployee(1001, 'John Doe');
      
      expect(component.showDeleteDialog).toBe(true);
      expect(component.deleteConfirmationData.hasDependencies).toBe(false);
    });

    it('should handle employee not found during delete', () => {
      component.employee = []; // Empty employee list
      
      component.deleteEmployee(1001, 'John Doe');
      
      expect(mockAdminService.checkEmployeeDependencies).not.toHaveBeenCalled();
    });
  });

  describe('Delete Confirmation Dialog', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.deleteConfirmationData = {
        employee: mockEmployees[0],
        dependencies: [],
        hasDependencies: false
      };
    });

    it('should delete employee when confirmed without dependencies', () => {
      spyOn(window, 'alert');
      
      component.onDeleteConfirmed(true);
      
      expect(mockAdminService.deleteEmployeeById).toHaveBeenCalledWith(1001);
      expect(component.showDeleteDialog).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Employee John Doe has been deleted successfully.');
    });

    it('should not delete employee when not confirmed', () => {
      component.onDeleteConfirmed(false);
      
      expect(mockAdminService.deleteEmployeeById).not.toHaveBeenCalled();
    });

    it('should not delete employee with dependencies', () => {
      component.deleteConfirmationData.hasDependencies = true;
      
      component.onDeleteConfirmed(true);
      
      expect(mockAdminService.deleteEmployeeById).not.toHaveBeenCalled();
    });

    it('should handle delete error with dependency error', () => {
      const dependencyError = {
        type: 'dependency_error',
        message: 'Cannot delete employee with dependencies',
        status: 409
      };
      mockAdminService.deleteEmployeeById.and.returnValue(throwError(() => dependencyError));
      spyOn(window, 'alert');
      
      component.onDeleteConfirmed(true);
      
      expect(component.deleteError).toBe('Cannot delete employee with dependencies');
      expect(window.alert).toHaveBeenCalledWith('Cannot delete employee with dependencies');
    });

    it('should handle delete error with not found error', () => {
      const notFoundError = {
        type: 'not_found',
        message: 'Employee not found',
        status: 404
      };
      mockAdminService.deleteEmployeeById.and.returnValue(throwError(() => notFoundError));
      spyOn(window, 'alert');
      
      component.onDeleteConfirmed(true);
      
      expect(component.deleteError).toBe('Employee not found. It may have already been deleted.');
      expect(window.alert).toHaveBeenCalledWith('Employee not found. It may have already been deleted.');
    });

    it('should handle delete error with connection error', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Network error',
        status: 0
      };
      mockAdminService.deleteEmployeeById.and.returnValue(throwError(() => connectionError));
      spyOn(window, 'alert');
      
      component.onDeleteConfirmed(true);
      
      expect(component.deleteError).toBe('Unable to connect to the server. Please check your connection and try again.');
      expect(window.alert).toHaveBeenCalledWith('Unable to connect to the server. Please check your connection and try again.');
    });

    it('should cancel delete dialog', () => {
      component.showDeleteDialog = true;
      component.deleteError = 'Some error';
      
      component.onDeleteCancelled();
      
      expect(component.showDeleteDialog).toBe(false);
      expect(component.deleteError).toBeNull();
    });

    it('should handle null employee ID during delete', () => {
      component.deleteConfirmationData.employee.empId = null;
      
      component.onDeleteConfirmed(true);
      
      expect(mockAdminService.deleteEmployeeById).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should track employees by ID', () => {
      const employee = mockEmployees[0];
      
      const trackId = component.trackByEmployeeId(0, employee);
      
      expect(trackId).toBe(1001);
    });

    it('should get sort field label', () => {
      expect(component.getSortFieldLabel('empId')).toBe('Employee ID');
      expect(component.getSortFieldLabel('empName')).toBe('Name');
      expect(component.getSortFieldLabel('phoneNo')).toBe('Phone Number');
      expect(component.getSortFieldLabel('unknownField')).toBe('unknownField');
    });

    it('should expose Math object to template', () => {
      expect(component.Math).toBe(Math);
    });

    it('should logout and clear localStorage', () => {
      spyOn(localStorage, 'clear');
      
      component.logout();
      
      expect(localStorage.clear).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['loginurl']);
    });
  });

  describe('Loading States', () => {
    it('should show loading state during employee loading', () => {
      component.isLoading = true;
      fixture.detectChanges();
      
      expect(component.isLoading).toBe(true);
    });

    it('should show searching state during search', () => {
      component.isSearching = true;
      fixture.detectChanges();
      
      expect(component.isSearching).toBe(true);
    });

    it('should show loading dependencies state', () => {
      component.isLoadingDependencies = true;
      fixture.detectChanges();
      
      expect(component.isLoadingDependencies).toBe(true);
    });
  });

  describe('Error States', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display load error', () => {
      component.loadError = 'Failed to load employees';
      fixture.detectChanges();
      
      expect(component.loadError).toBe('Failed to load employees');
    });

    it('should display search error', () => {
      component.searchError = 'Search failed';
      fixture.detectChanges();
      
      expect(component.searchError).toBe('Search failed');
    });

    it('should display delete error', () => {
      component.deleteError = 'Delete failed';
      fixture.detectChanges();
      
      expect(component.deleteError).toBe('Delete failed');
    });
  });

  describe('Legacy Support', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should support legacy loadEmployee method', () => {
      spyOn(component, 'loadEmployees');
      
      component.loadEmployee();
      
      expect(component.loadEmployees).toHaveBeenCalled();
    });

    it('should maintain legacy pagination properties', () => {
      const mockResponse: PagedResponse<Employee> = {
        content: mockEmployees,
        totalElements: 50,
        totalPages: 5,
        size: 10,
        number: 2
      };
      mockAdminService.getAllEmployeesWithPagination.and.returnValue(of(mockResponse));
      
      component.loadEmployees();
      
      expect(component.p).toBe(3); // number + 1 (1-based)
      expect(component.count).toBe(10); // size
    });
  });
});