import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';

import { Updateemployee } from './updateemployee';
import { Adminservice } from '../../services/adminservice';
import { Employee, Department } from '../../model/employeemodel';

describe('Updateemployee Component', () => {
  let component: Updateemployee;
  let fixture: ComponentFixture<Updateemployee>;
  let mockAdminService: jasmine.SpyObj<Adminservice>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;

  const mockDepartments: Department[] = [
    { deptId: 1, deptName: 'Human Resources', deptDescription: 'HR Department' },
    { deptId: 2, deptName: 'Information Technology', deptDescription: 'IT Department' },
    { deptId: 3, deptName: 'Finance', deptDescription: 'Finance Department' }
  ];

  const mockEmployee: Employee = {
    empId: 1001,
    empName: 'John Doe',
    phoneNo: '1234567890',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'Developer',
    managerId: 1,
    salary: 50000,
    address: '123 Main Street, City, State',
    joiningDate: '2024-01-15',
    gender: 'Male',
    department: mockDepartments[1]
  };

  beforeEach(async () => {
    const adminServiceSpy = jasmine.createSpyObj('Adminservice', [
      'getEmployeeForUpdate',
      'getAllDepartments',
      'updateEmployeeById',
      'checkEmailExistsForUpdate',
      'checkPhoneExistsForUpdate'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const changeDetectorRefSpy = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('1001')
        }
      }
    };

    await TestBed.configureTestingModule({
      declarations: [Updateemployee],
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: Adminservice, useValue: adminServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ChangeDetectorRef, useValue: changeDetectorRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Updateemployee);
    component = fixture.componentInstance;
    mockAdminService = TestBed.inject(Adminservice) as jasmine.SpyObj<Adminservice>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockChangeDetectorRef = TestBed.inject(ChangeDetectorRef) as jasmine.SpyObj<ChangeDetectorRef>;

    // Default mock implementations
    mockAdminService.getEmployeeForUpdate.and.returnValue(of(mockEmployee));
    mockAdminService.getAllDepartments.and.returnValue(of(mockDepartments));
    mockAdminService.updateEmployeeById.and.returnValue(of(mockEmployee));
    mockAdminService.checkEmailExistsForUpdate.and.returnValue(of(false));
    mockAdminService.checkPhoneExistsForUpdate.and.returnValue(of(false));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with employee ID from route', () => {
      fixture.detectChanges();
      
      expect(component.empId).toBe(1001);
      expect(mockActivatedRoute.snapshot.paramMap.get).toHaveBeenCalledWith('empid');
    });

    it('should load employee data on init', () => {
      fixture.detectChanges();
      
      expect(mockAdminService.getEmployeeForUpdate).toHaveBeenCalledWith(1001);
      expect(component.originalEmployee).toEqual(mockEmployee);
      expect(component.isLoading).toBe(false);
    });

    it('should load departments on init', () => {
      fixture.detectChanges();
      
      expect(mockAdminService.getAllDepartments).toHaveBeenCalled();
      expect(component.departments).toEqual(mockDepartments);
    });

    it('should handle invalid employee ID', () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue(null);
      
      fixture.detectChanges();
      
      expect(component.loadError).toBe('Invalid employee ID');
    });

    it('should populate form with employee data', () => {
      fixture.detectChanges();
      
      expect(component.employeeForm.get('empName')?.value).toBe(mockEmployee.empName);
      expect(component.employeeForm.get('email')?.value).toBe(mockEmployee.email);
      expect(component.employeeForm.get('phoneNo')?.value).toBe(mockEmployee.phoneNo);
      expect(component.employeeForm.get('salary')?.value).toBe(mockEmployee.salary);
      expect(component.employeeForm.get('departmentId')?.value).toBe(mockEmployee.department?.deptId);
    });
  });

  describe('Data Loading Error Handling', () => {
    it('should handle employee not found error', () => {
      const notFoundError = {
        type: 'not_found',
        message: 'Employee not found',
        status: 404
      };
      mockAdminService.getEmployeeForUpdate.and.returnValue(throwError(() => notFoundError));
      
      fixture.detectChanges();
      
      expect(component.loadError).toBe('Employee not found');
      expect(component.isLoading).toBe(false);
    });

    it('should handle connection error during data loading', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Connection failed',
        status: 0
      };
      mockAdminService.getEmployeeForUpdate.and.returnValue(throwError(() => connectionError));
      
      fixture.detectChanges();
      
      expect(component.connectionError).toBe(true);
      expect(component.loadError).toBe('Unable to connect to server. Please check your connection.');
      expect(component.isLoading).toBe(false);
    });

    it('should handle timeout error during data loading', () => {
      const timeoutError = {
        type: 'timeout',
        message: 'Request timeout',
        status: 408
      };
      mockAdminService.getEmployeeForUpdate.and.returnValue(throwError(() => timeoutError));
      
      fixture.detectChanges();
      
      expect(component.connectionError).toBe(true);
      expect(component.loadError).toBe('Unable to connect to server. Please check your connection.');
    });

    it('should handle generic error during data loading', () => {
      const genericError = {
        message: 'Generic error',
        status: 500
      };
      mockAdminService.getEmployeeForUpdate.and.returnValue(throwError(() => genericError));
      
      fixture.detectChanges();
      
      expect(component.loadError).toBe('Generic error');
      expect(component.isLoading).toBe(false);
    });

    it('should use fallback departments when department loading fails', () => {
      mockAdminService.getAllDepartments.and.returnValue(throwError(() => ({ message: 'Failed to load' })));
      
      fixture.detectChanges();
      
      expect(component.departments.length).toBe(5);
      expect(component.departments[0].deptName).toBe('Human Resources');
      expect(component.departments[1].deptName).toBe('Information Technology');
    });
  });

  describe('Retry Functionality', () => {
    it('should retry loading employee data', () => {
      component.retryAttempts = 1;
      component.maxRetryAttempts = 3;
      
      component.retryLoad();
      
      expect(component.retryAttempts).toBe(2);
      expect(mockAdminService.getEmployeeForUpdate).toHaveBeenCalledWith(1001);
    });

    it('should not retry when max attempts reached', () => {
      component.retryAttempts = 3;
      component.maxRetryAttempts = 3;
      const initialCallCount = mockAdminService.getEmployeeForUpdate.calls.count();
      
      component.retryLoad();
      
      expect(mockAdminService.getEmployeeForUpdate.calls.count()).toBe(initialCallCount);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should validate required fields', () => {
      component.employeeForm.patchValue({
        empName: '',
        email: '',
        phoneNo: '',
        salary: ''
      });
      component.employeeForm.markAllAsTouched();
      
      expect(component.getFieldError('empName')).toBe('Name is required');
      expect(component.getFieldError('email')).toBe('Email is required');
      expect(component.getFieldError('phoneNo')).toBe('Phone Number is required');
      expect(component.getFieldError('salary')).toBe('Salary is required');
    });

    it('should validate email format', () => {
      const emailControl = component.employeeForm.get('email');
      emailControl?.setValue('invalid-email');
      emailControl?.markAsTouched();
      
      expect(component.getFieldError('email')).toBe('Please enter a valid email address');
    });

    it('should validate phone number format', () => {
      const phoneControl = component.employeeForm.get('phoneNo');
      phoneControl?.setValue('123456789');
      phoneControl?.markAsTouched();
      
      expect(component.getFieldError('phoneNo')).toBe('Phone number must be exactly 10 digits');
    });

    it('should validate salary as positive number', () => {
      const salaryControl = component.employeeForm.get('salary');
      salaryControl?.setValue('0');
      salaryControl?.markAsTouched();
      
      expect(component.getFieldError('salary')).toBe('Salary must be greater than 0');
    });

    it('should validate name pattern', () => {
      const nameControl = component.employeeForm.get('empName');
      nameControl?.setValue('John123');
      nameControl?.markAsTouched();
      
      expect(component.getFieldError('empName')).toBe('Name can only contain letters and spaces');
    });
  });

  describe('Real-time Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should validate email uniqueness in real-time', fakeAsync(() => {
      const emailControl = component.employeeForm.get('email');
      mockAdminService.checkEmailExistsForUpdate.and.returnValue(of(true));
      
      emailControl?.setValue('existing@example.com');
      tick(500); // Wait for debounce
      
      expect(mockAdminService.checkEmailExistsForUpdate).toHaveBeenCalledWith('existing@example.com', 1001);
      expect(component.emailValidationError).toBe('Another employee with this email already exists');
      expect(emailControl?.hasError('duplicate')).toBe(true);
    }));

    it('should validate phone uniqueness in real-time', fakeAsync(() => {
      const phoneControl = component.employeeForm.get('phoneNo');
      mockAdminService.checkPhoneExistsForUpdate.and.returnValue(of(true));
      
      phoneControl?.setValue('9876543210');
      tick(500); // Wait for debounce
      
      expect(mockAdminService.checkPhoneExistsForUpdate).toHaveBeenCalledWith('9876543210', 1001);
      expect(component.phoneValidationError).toBe('Another employee with this phone number already exists');
      expect(phoneControl?.hasError('duplicate')).toBe(true);
    }));

    it('should not validate if email has not changed', fakeAsync(() => {
      const emailControl = component.employeeForm.get('email');
      
      emailControl?.setValue(mockEmployee.email); // Same as original
      tick(500);
      
      expect(mockAdminService.checkEmailExistsForUpdate).not.toHaveBeenCalled();
      expect(component.emailValidationError).toBeNull();
    }));

    it('should not validate if phone has not changed', fakeAsync(() => {
      const phoneControl = component.employeeForm.get('phoneNo');
      
      phoneControl?.setValue(mockEmployee.phoneNo); // Same as original
      tick(500);
      
      expect(mockAdminService.checkPhoneExistsForUpdate).not.toHaveBeenCalled();
      expect(component.phoneValidationError).toBeNull();
    }));

    it('should handle validation service errors gracefully', fakeAsync(() => {
      const emailControl = component.employeeForm.get('email');
      mockAdminService.checkEmailExistsForUpdate.and.returnValue(throwError(() => ({ message: 'Service error' })));
      
      emailControl?.setValue('test@example.com');
      tick(500);
      
      expect(component.emailValidationError).toBeNull();
      expect(component.isValidatingEmail).toBe(false);
    }));
  });

  describe('Change Detection', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should detect changes when form values are modified', () => {
      component.employeeForm.patchValue({
        empName: 'Jane Doe'
      });
      
      expect(component.hasChanges()).toBe(true);
    });

    it('should detect no changes when form values are same as original', () => {
      // Form is already populated with original values
      expect(component.hasChanges()).toBe(false);
    });

    it('should detect password changes', () => {
      component.employeeForm.patchValue({
        password: 'newpassword123'
      });
      
      expect(component.hasChanges()).toBe(true);
    });

    it('should detect department changes', () => {
      component.employeeForm.patchValue({
        departmentId: 3
      });
      
      expect(component.hasChanges()).toBe(true);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should prevent submission with invalid form', () => {
      component.employeeForm.patchValue({ empName: '' }); // Make form invalid
      
      component.onSubmit();
      
      expect(mockAdminService.updateEmployeeById).not.toHaveBeenCalled();
      expect(component.employeeForm.get('empName')?.touched).toBe(true);
    });

    it('should prevent submission when no changes detected', () => {
      // Form has no changes from original
      component.onSubmit();
      
      expect(component.submitError).toBe('No changes detected');
      expect(mockAdminService.updateEmployeeById).not.toHaveBeenCalled();
    });

    it('should submit successfully with valid changes', fakeAsync(() => {
      const updatedEmployee = { ...mockEmployee, empName: 'Jane Doe' };
      mockAdminService.updateEmployeeById.and.returnValue(of(updatedEmployee));
      
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      component.onSubmit();
      tick();
      
      expect(mockAdminService.updateEmployeeById).toHaveBeenCalledWith(1001, jasmine.any(Object));
      expect(component.successMessage).toBe('Employee updated successfully!');
      expect(component.isSubmitting).toBe(false);
      
      // Should navigate after delay
      tick(2000);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/viewemployeeurl']);
    }));

    it('should handle validation error during submission', () => {
      const validationError = {
        type: 'validation_error',
        message: 'Invalid data',
        status: 400,
        validationErrors: ['Email format invalid']
      };
      mockAdminService.updateEmployeeById.and.returnValue(throwError(() => validationError));
      
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      component.onSubmit();
      
      expect(component.submitError).toBe('Invalid data');
      expect(component.isSubmitting).toBe(false);
    });

    it('should handle conflict error during submission', () => {
      const conflictError = {
        type: 'conflict',
        message: 'Duplicate data',
        status: 409
      };
      mockAdminService.updateEmployeeById.and.returnValue(throwError(() => conflictError));
      
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      component.onSubmit();
      
      expect(component.submitError).toBe('Another employee with this email or phone number already exists');
      expect(component.isSubmitting).toBe(false);
    });

    it('should handle not found error during submission', () => {
      const notFoundError = {
        type: 'not_found',
        message: 'Employee not found',
        status: 404
      };
      mockAdminService.updateEmployeeById.and.returnValue(throwError(() => notFoundError));
      
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      component.onSubmit();
      
      expect(component.submitError).toBe('Employee not found');
      expect(component.isSubmitting).toBe(false);
    });

    it('should handle connection error during submission', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Network error',
        status: 0
      };
      mockAdminService.updateEmployeeById.and.returnValue(throwError(() => connectionError));
      
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      component.onSubmit();
      
      expect(component.connectionError).toBe(true);
      expect(component.submitError).toBe('Unable to connect to server. Please check your connection and try again.');
      expect(component.isSubmitting).toBe(false);
    });
  });

  describe('Navigation and Form Reset', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should cancel without confirmation when no changes', () => {
      spyOn(window, 'confirm');
      
      component.onCancel();
      
      expect(window.confirm).not.toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/viewemployeeurl']);
    });

    it('should show confirmation when changes exist', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      
      component.onCancel();
      
      expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to leave?');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/viewemployeeurl']);
    });

    it('should not navigate when user cancels confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      
      component.onCancel();
      
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should reset form to original values', () => {
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      component.submitError = 'Some error';
      component.successMessage = 'Success';
      
      component.resetForm();
      
      expect(component.employeeForm.get('empName')?.value).toBe(mockEmployee.empName);
      expect(component.submitError).toBeNull();
      expect(component.successMessage).toBeNull();
      expect(component.emailValidationError).toBeNull();
      expect(component.phoneValidationError).toBeNull();
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return correct field labels', () => {
      expect(component['getFieldLabel']('empName')).toBe('Name');
      expect(component['getFieldLabel']('phoneNo')).toBe('Phone Number');
      expect(component['getFieldLabel']('email')).toBe('Email');
      expect(component['getFieldLabel']('unknownField')).toBe('unknownField');
    });

    it('should mark all form fields as touched', () => {
      component['markFormGroupTouched']();
      
      Object.keys(component.employeeForm.controls).forEach(key => {
        expect(component.employeeForm.get(key)?.touched).toBe(true);
      });
    });

    it('should handle field errors correctly', () => {
      const nameControl = component.employeeForm.get('empName');
      
      // No error when field is not touched
      nameControl?.setValue('');
      expect(component.getFieldError('empName')).toBeNull();
      
      // Show error when field is touched and invalid
      nameControl?.markAsTouched();
      expect(component.getFieldError('empName')).toBe('Name is required');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during data loading', () => {
      component.isLoading = true;
      fixture.detectChanges();
      
      expect(component.isLoading).toBe(true);
    });

    it('should show submitting state during form submission', () => {
      fixture.detectChanges();
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      
      // Mock a delayed response
      mockAdminService.updateEmployeeById.and.returnValue(of(mockEmployee));
      
      component.onSubmit();
      
      expect(component.isSubmitting).toBe(true);
    });

    it('should show validation loading states', fakeAsync(() => {
      fixture.detectChanges();
      const emailControl = component.employeeForm.get('email');
      
      emailControl?.setValue('test@example.com');
      
      expect(component.isValidatingEmail).toBe(true);
      
      tick(500);
      
      expect(component.isValidatingEmail).toBe(false);
    }));
  });

  describe('Error Recovery', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should clear errors when form is reset', () => {
      component.submitError = 'Some error';
      component.emailValidationError = 'Email error';
      component.phoneValidationError = 'Phone error';
      
      component.resetForm();
      
      expect(component.submitError).toBeNull();
      expect(component.emailValidationError).toBeNull();
      expect(component.phoneValidationError).toBeNull();
    });

    it('should clear success message on new submission', () => {
      component.successMessage = 'Previous success';
      component.employeeForm.patchValue({ empName: 'Jane Doe' });
      
      component.onSubmit();
      
      expect(component.successMessage).toBeNull();
    });
  });
});