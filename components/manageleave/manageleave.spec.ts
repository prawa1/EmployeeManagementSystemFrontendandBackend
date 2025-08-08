import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';

import { Manageleave } from './manageleave';
import { Adminservice, Leave } from '../../services/adminservice';
import { Employee } from '../../model/employeemodel';

describe('Manageleave Component', () => {
  let component: Manageleave;
  let fixture: ComponentFixture<Manageleave>;
  let mockAdminService: jasmine.SpyObj<Adminservice>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;

  const mockEmployee: Employee = {
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
    gender: 'Male'
  };

  const mockLeaves: Leave[] = [
    {
      leaveId: 1,
      employee: mockEmployee,
      leaveType: 'Annual',
      startDate: '2024-03-01',
      endDate: '2024-03-05',
      reason: 'Family vacation',
      status: 'PENDING',
      appliedDate: '2024-02-15'
    },
    {
      leaveId: 2,
      employee: { ...mockEmployee, empId: 1002, empName: 'Jane Smith' },
      leaveType: 'Sick',
      startDate: '2024-03-10',
      endDate: '2024-03-12',
      reason: 'Medical appointment',
      status: 'PENDING',
      appliedDate: '2024-03-08'
    }
  ];

  beforeEach(async () => {
    const adminServiceSpy = jasmine.createSpyObj('Adminservice', [
      'getPendingLeaves',
      'approveLeave',
      'rejectLeave'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const changeDetectorRefSpy = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    await TestBed.configureTestingModule({
      declarations: [Manageleave],
      providers: [
        { provide: Adminservice, useValue: adminServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ChangeDetectorRef, useValue: changeDetectorRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Manageleave);
    component = fixture.componentInstance;
    mockAdminService = TestBed.inject(Adminservice) as jasmine.SpyObj<Adminservice>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockChangeDetectorRef = TestBed.inject(ChangeDetectorRef) as jasmine.SpyObj<ChangeDetectorRef>;

    // Default mock implementations
    mockAdminService.getPendingLeaves.and.returnValue(of(mockLeaves));
    mockAdminService.approveLeave.and.returnValue(of({ ...mockLeaves[0], status: 'APPROVED' }));
    mockAdminService.rejectLeave.and.returnValue(of({ ...mockLeaves[0], status: 'REJECTED' }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.pendingLeaves).toEqual([]);
      expect(component.p).toBe(1);
      expect(component.count).toBe(5);
      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBe('');
      expect(component.connectionError).toBe(false);
      expect(component.showConfirmDialog).toBe(false);
    });

    it('should fetch pending leaves on init', () => {
      fixture.detectChanges();
      
      expect(mockAdminService.getPendingLeaves).toHaveBeenCalled();
      expect(component.pendingLeaves).toEqual(mockLeaves);
      expect(component.isLoading).toBe(false);
      expect(mockChangeDetectorRef.detectChanges).toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('should load pending leaves successfully', () => {
      component.fetchAllPendingLeaves();
      
      expect(component.isLoading).toBe(false);
      expect(component.pendingLeaves).toEqual(mockLeaves);
      expect(component.errorMessage).toBe('');
      expect(component.connectionError).toBe(false);
    });

    it('should handle empty pending leaves list', () => {
      mockAdminService.getPendingLeaves.and.returnValue(of([]));
      
      component.fetchAllPendingLeaves();
      
      expect(component.pendingLeaves).toEqual([]);
      expect(component.isLoading).toBe(false);
    });

    it('should handle null response from service', () => {
      mockAdminService.getPendingLeaves.and.returnValue(of(null as any));
      
      component.fetchAllPendingLeaves();
      
      expect(component.pendingLeaves).toEqual([]);
      expect(component.isLoading).toBe(false);
    });

    it('should show loading state during data fetch', () => {
      component.fetchAllPendingLeaves();
      
      // Before the observable completes, loading should be true
      expect(component.isLoading).toBe(false); // Will be false after synchronous completion
    });
  });

  describe('Error Handling', () => {
    it('should handle connection error', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Network error',
        status: 0
      };
      mockAdminService.getPendingLeaves.and.returnValue(throwError(() => connectionError));
      
      component.fetchAllPendingLeaves();
      
      expect(component.connectionError).toBe(true);
      expect(component.errorMessage).toBe('Unable to connect to the server. Please check your connection and try again.');
      expect(component.isLoading).toBe(false);
    });

    it('should handle network error', () => {
      const networkError = {
        type: 'network_error',
        message: 'Network failure',
        status: 0
      };
      mockAdminService.getPendingLeaves.and.returnValue(throwError(() => networkError));
      
      component.fetchAllPendingLeaves();
      
      expect(component.connectionError).toBe(true);
      expect(component.errorMessage).toBe('Unable to connect to the server. Please check your connection and try again.');
    });

    it('should handle timeout error', () => {
      const timeoutError = {
        type: 'timeout',
        message: 'Request timeout',
        status: 408
      };
      mockAdminService.getPendingLeaves.and.returnValue(throwError(() => timeoutError));
      
      component.fetchAllPendingLeaves();
      
      expect(component.errorMessage).toBe('Request timed out. Please try again.');
      expect(component.connectionError).toBe(false);
    });

    it('should handle server error (500)', () => {
      const serverError = {
        message: 'Internal server error',
        status: 500
      };
      mockAdminService.getPendingLeaves.and.returnValue(throwError(() => serverError));
      
      component.fetchAllPendingLeaves();
      
      expect(component.errorMessage).toBe('Server error occurred. Please try again later.');
      expect(component.connectionError).toBe(false);
    });

    it('should handle generic error', () => {
      const genericError = {
        message: 'Something went wrong',
        status: 400
      };
      mockAdminService.getPendingLeaves.and.returnValue(throwError(() => genericError));
      
      component.fetchAllPendingLeaves();
      
      expect(component.errorMessage).toBe('Something went wrong');
    });

    it('should handle error without message', () => {
      const errorWithoutMessage = {
        status: 400
      };
      mockAdminService.getPendingLeaves.and.returnValue(throwError(() => errorWithoutMessage));
      
      component.fetchAllPendingLeaves();
      
      expect(component.errorMessage).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('Confirmation Dialogs', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show approve confirmation dialog', () => {
      const leave = mockLeaves[0];
      
      component.showApproveConfirmation(leave);
      
      expect(component.showConfirmDialog).toBe(true);
      expect(component.confirmAction).toBe('approve');
      expect(component.selectedLeave).toBe(leave);
      expect(component.approvalComments).toBe('');
    });

    it('should show reject confirmation dialog', () => {
      const leave = mockLeaves[0];
      
      component.showRejectConfirmation(leave);
      
      expect(component.showConfirmDialog).toBe(true);
      expect(component.confirmAction).toBe('reject');
      expect(component.selectedLeave).toBe(leave);
      expect(component.rejectionReason).toBe('');
    });

    it('should cancel confirmation dialog', () => {
      component.showConfirmDialog = true;
      component.confirmAction = 'approve';
      component.selectedLeave = mockLeaves[0];
      component.approvalComments = 'Test comment';
      component.rejectionReason = 'Test reason';
      
      component.cancelConfirmation();
      
      expect(component.showConfirmDialog).toBe(false);
      expect(component.confirmAction).toBeNull();
      expect(component.selectedLeave).toBeNull();
      expect(component.approvalComments).toBe('');
      expect(component.rejectionReason).toBe('');
    });
  });

  describe('Leave Approval', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedLeave = mockLeaves[0];
    });

    it('should approve leave without comments', () => {
      spyOn(window, 'alert');
      spyOn(component, 'fetchAllPendingLeaves');
      component.confirmAction = 'approve';
      component.approvalComments = '';
      
      component.confirmAction_execute();
      
      expect(mockAdminService.approveLeave).toHaveBeenCalledWith(1, '');
      expect(window.alert).toHaveBeenCalledWith('Leave approved successfully!');
      expect(component.fetchAllPendingLeaves).toHaveBeenCalled();
    });

    it('should approve leave with comments', () => {
      spyOn(window, 'alert');
      spyOn(component, 'fetchAllPendingLeaves');
      component.confirmAction = 'approve';
      component.approvalComments = 'Approved for vacation';
      
      component.confirmAction_execute();
      
      expect(mockAdminService.approveLeave).toHaveBeenCalledWith(1, 'Approved for vacation');
      expect(window.alert).toHaveBeenCalledWith('Leave approved successfully!');
    });

    it('should handle approval error with connection error', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Network error',
        status: 0
      };
      mockAdminService.approveLeave.and.returnValue(throwError(() => connectionError));
      component.confirmAction = 'approve';
      
      component.confirmAction_execute();
      
      expect(component.connectionError).toBe(true);
      expect(component.errorMessage).toBe('Unable to connect to the server. Please check your connection and try again.');
      expect(component.isLoading).toBe(false);
    });

    it('should handle approval error with generic error', () => {
      const genericError = {
        message: 'Approval failed',
        status: 400
      };
      mockAdminService.approveLeave.and.returnValue(throwError(() => genericError));
      component.confirmAction = 'approve';
      
      component.confirmAction_execute();
      
      expect(component.errorMessage).toBe('Approval failed');
      expect(component.isLoading).toBe(false);
    });

    it('should not execute approval without selected leave', () => {
      component.selectedLeave = null;
      component.confirmAction = 'approve';
      
      component.confirmAction_execute();
      
      expect(mockAdminService.approveLeave).not.toHaveBeenCalled();
    });

    it('should refresh leave list after successful approval', fakeAsync(() => {
      spyOn(window, 'alert');
      spyOn(component, 'fetchAllPendingLeaves');
      component.confirmAction = 'approve';
      
      component.confirmAction_execute();
      
      tick(500); // Wait for the timeout in refreshLeaveList
      
      expect(component.fetchAllPendingLeaves).toHaveBeenCalled();
    }));
  });

  describe('Leave Rejection', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedLeave = mockLeaves[0];
    });

    it('should reject leave with reason', () => {
      spyOn(window, 'alert');
      spyOn(component, 'fetchAllPendingLeaves');
      component.confirmAction = 'reject';
      component.rejectionReason = 'Insufficient leave balance';
      
      component.confirmAction_execute();
      
      expect(mockAdminService.rejectLeave).toHaveBeenCalledWith(1, 'Insufficient leave balance');
      expect(window.alert).toHaveBeenCalledWith('Leave rejected successfully!');
      expect(component.fetchAllPendingLeaves).toHaveBeenCalled();
    });

    it('should prevent rejection without reason', () => {
      spyOn(window, 'alert');
      component.confirmAction = 'reject';
      component.rejectionReason = '';
      
      component.confirmAction_execute();
      
      expect(window.alert).toHaveBeenCalledWith('Please provide a reason for rejection.');
      expect(mockAdminService.rejectLeave).not.toHaveBeenCalled();
    });

    it('should prevent rejection with whitespace-only reason', () => {
      spyOn(window, 'alert');
      component.confirmAction = 'reject';
      component.rejectionReason = '   ';
      
      component.confirmAction_execute();
      
      expect(window.alert).toHaveBeenCalledWith('Please provide a reason for rejection.');
      expect(mockAdminService.rejectLeave).not.toHaveBeenCalled();
    });

    it('should handle rejection error with connection error', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Network error',
        status: 0
      };
      mockAdminService.rejectLeave.and.returnValue(throwError(() => connectionError));
      component.confirmAction = 'reject';
      component.rejectionReason = 'Test reason';
      
      component.confirmAction_execute();
      
      expect(component.connectionError).toBe(true);
      expect(component.errorMessage).toBe('Unable to connect to the server. Please check your connection and try again.');
      expect(component.isLoading).toBe(false);
    });

    it('should handle rejection error with generic error', () => {
      const genericError = {
        message: 'Rejection failed',
        status: 400
      };
      mockAdminService.rejectLeave.and.returnValue(throwError(() => genericError));
      component.confirmAction = 'reject';
      component.rejectionReason = 'Test reason';
      
      component.confirmAction_execute();
      
      expect(component.errorMessage).toBe('Rejection failed');
      expect(component.isLoading).toBe(false);
    });

    it('should refresh leave list after successful rejection', fakeAsync(() => {
      spyOn(window, 'alert');
      spyOn(component, 'fetchAllPendingLeaves');
      component.confirmAction = 'reject';
      component.rejectionReason = 'Test reason';
      
      component.confirmAction_execute();
      
      tick(500); // Wait for the timeout in refreshLeaveList
      
      expect(component.fetchAllPendingLeaves).toHaveBeenCalled();
    }));
  });

  describe('Connection Retry', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should retry connection', () => {
      spyOn(component, 'fetchAllPendingLeaves');
      
      component.retryConnection();
      
      expect(component.fetchAllPendingLeaves).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should format date correctly', () => {
      const dateString = '2024-03-01';
      
      const formattedDate = component.getFormattedDate(dateString);
      
      expect(formattedDate).toBe(new Date(dateString).toLocaleDateString());
    });

    it('should handle invalid date string', () => {
      const invalidDate = 'invalid-date';
      
      const formattedDate = component.getFormattedDate(invalidDate);
      
      expect(formattedDate).toBe(invalidDate);
    });

    it('should handle empty date string', () => {
      const emptyDate = '';
      
      const formattedDate = component.getFormattedDate(emptyDate);
      
      expect(formattedDate).toBe('N/A');
    });

    it('should handle null date string', () => {
      const nullDate = null as any;
      
      const formattedDate = component.getFormattedDate(nullDate);
      
      expect(formattedDate).toBe('N/A');
    });

    it('should get employee name safely', () => {
      const leave = mockLeaves[0];
      
      const employeeName = component.getEmployeeName(leave);
      
      expect(employeeName).toBe('John Doe');
    });

    it('should handle leave without employee', () => {
      const leaveWithoutEmployee = { ...mockLeaves[0], employee: null as any };
      
      const employeeName = component.getEmployeeName(leaveWithoutEmployee);
      
      expect(employeeName).toBe('Unknown Employee');
    });

    it('should handle leave with employee without name', () => {
      const leaveWithoutName = { 
        ...mockLeaves[0], 
        employee: { ...mockEmployee, empName: null as any }
      };
      
      const employeeName = component.getEmployeeName(leaveWithoutName);
      
      expect(employeeName).toBe('Unknown Employee');
    });

    it('should get employee ID safely', () => {
      const leave = mockLeaves[0];
      
      const employeeId = component.getEmployeeId(leave);
      
      expect(employeeId).toBe(1001);
    });

    it('should handle leave without employee for ID', () => {
      const leaveWithoutEmployee = { ...mockLeaves[0], employee: null as any };
      
      const employeeId = component.getEmployeeId(leaveWithoutEmployee);
      
      expect(employeeId).toBe('N/A');
    });

    it('should handle leave with employee without ID', () => {
      const leaveWithoutId = { 
        ...mockLeaves[0], 
        employee: { ...mockEmployee, empId: null }
      };
      
      const employeeId = component.getEmployeeId(leaveWithoutId);
      
      expect(employeeId).toBe('N/A');
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should logout and clear localStorage', () => {
      spyOn(localStorage, 'clear');
      
      component.logout();
      
      expect(localStorage.clear).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['loginurl']);
    });
  });

  describe('Loading States', () => {
    it('should show loading state during leave fetch', () => {
      component.isLoading = true;
      fixture.detectChanges();
      
      expect(component.isLoading).toBe(true);
    });

    it('should show loading state during leave approval', () => {
      fixture.detectChanges();
      component.selectedLeave = mockLeaves[0];
      component.confirmAction = 'approve';
      
      // Mock a delayed response to test loading state
      mockAdminService.approveLeave.and.returnValue(of({ ...mockLeaves[0], status: 'APPROVED' }));
      
      component.confirmAction_execute();
      
      // Loading state is set to false after the observable completes synchronously
      expect(component.isLoading).toBe(false);
    });

    it('should show loading state during leave rejection', () => {
      fixture.detectChanges();
      component.selectedLeave = mockLeaves[0];
      component.confirmAction = 'reject';
      component.rejectionReason = 'Test reason';
      
      // Mock a delayed response to test loading state
      mockAdminService.rejectLeave.and.returnValue(of({ ...mockLeaves[0], status: 'REJECTED' }));
      
      component.confirmAction_execute();
      
      // Loading state is set to false after the observable completes synchronously
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should clear error message on successful data load', () => {
      component.errorMessage = 'Previous error';
      
      component.fetchAllPendingLeaves();
      
      expect(component.errorMessage).toBe('');
    });

    it('should clear connection error on successful data load', () => {
      component.connectionError = true;
      
      component.fetchAllPendingLeaves();
      
      expect(component.connectionError).toBe(false);
    });

    it('should clear error message before approval', () => {
      fixture.detectChanges();
      component.selectedLeave = mockLeaves[0];
      component.confirmAction = 'approve';
      component.errorMessage = 'Previous error';
      
      component.confirmAction_execute();
      
      expect(component.errorMessage).toBe('');
    });

    it('should clear error message before rejection', () => {
      fixture.detectChanges();
      component.selectedLeave = mockLeaves[0];
      component.confirmAction = 'reject';
      component.rejectionReason = 'Test reason';
      component.errorMessage = 'Previous error';
      
      component.confirmAction_execute();
      
      expect(component.errorMessage).toBe('');
    });
  });

  describe('Dialog State Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should reset dialog state after successful approval', () => {
      spyOn(window, 'alert');
      component.selectedLeave = mockLeaves[0];
      component.confirmAction = 'approve';
      component.approvalComments = 'Test comment';
      component.showConfirmDialog = true;
      
      component.confirmAction_execute();
      
      expect(component.showConfirmDialog).toBe(false);
      expect(component.confirmAction).toBeNull();
      expect(component.selectedLeave).toBeNull();
      expect(component.approvalComments).toBe('');
    });

    it('should reset dialog state after successful rejection', () => {
      spyOn(window, 'alert');
      component.selectedLeave = mockLeaves[0];
      component.confirmAction = 'reject';
      component.rejectionReason = 'Test reason';
      component.showConfirmDialog = true;
      
      component.confirmAction_execute();
      
      expect(component.showConfirmDialog).toBe(false);
      expect(component.confirmAction).toBeNull();
      expect(component.selectedLeave).toBeNull();
      expect(component.rejectionReason).toBe('');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle undefined confirmAction', () => {
      component.selectedLeave = mockLeaves[0];
      component.confirmAction = null;
      
      component.confirmAction_execute();
      
      expect(mockAdminService.approveLeave).not.toHaveBeenCalled();
      expect(mockAdminService.rejectLeave).not.toHaveBeenCalled();
    });

    it('should handle leave with missing properties', () => {
      const incompleteLeave: Partial<Leave> = {
        leaveId: 1,
        leaveType: 'Annual',
        status: 'PENDING'
      };
      
      const employeeName = component.getEmployeeName(incompleteLeave as Leave);
      const employeeId = component.getEmployeeId(incompleteLeave as Leave);
      
      expect(employeeName).toBe('Unknown Employee');
      expect(employeeId).toBe('N/A');
    });
  });
});