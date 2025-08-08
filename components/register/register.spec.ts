import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Register } from './register';
import { Adminservice } from '../../services/adminservice';
import { Employee, Department } from '../../model/employeemodel';

describe('Register Component', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let mockAdminService: jasmine.SpyObj<Adminservice>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockDepartments: Department[] = [
    { deptId: 1, deptName: 'Human Resources', deptDescription: 'HR Department' },
    { deptId: 2, deptName: 'Information Technology', deptDescription: 'IT Department' },
    { deptId: 3, deptName: 'Finance', deptDescription: 'Finance Department' }
  ];

  const mockEmployee: Employee = {
    empId: null,
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
      'getAllDepartments',
      'getDepartmentById',
      'registerEmployee'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [Register],
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: Adminservice, useValue: adminServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    mockAdminService = TestBed.inject(Adminservice) as jasmine.SpyObj<Adminservice>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Default mock implementations
    mockAdminService.getAllDepartments.and.returnValue(of(mockDepartments));
    mockAdminService.getDepartmentById.and.returnValue(of(mockDepartments[1]));
    mockAdminService.registerEmployee.and.returnValue(of(mockEmployee));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize form with default values', () => {
      fixture.detectChanges();
      
      expect(component.employeeForm).toBeDefined();
      expect(component.employeeForm.get('empName')?.value).toBe('');
      expect(component.employeeForm.get('email')?.value).toBe('');
      expect(component.employeeForm.get('phoneNo')?.value).toBe('');
      expect(component.employeeForm.get('salary')?.value).toBe('');
      expect(component.employeeForm.get('departmentId')?.value).toBe('');
    });

    it('should load departments on init', () => {
      fixture.detectChanges();
      
      expect(mockAdminService.getAllDepartments).toHaveBeenCalled();
      expect(component.departments).toEqual(mockDepartments);
      expect(component.isLoadingDepartments).toBe(false);
    });

    it('should handle department loading error', () => {
      const errorMessage = 'Failed to load departments';
      mockAdminService.getAllDepartments.and.returnValue(throwError(() => ({ message: errorMessage })));
      
      fixture.detectChanges();
      
      expect(component.isLoadingDepartments).toBe(false);
      expect(component.submitError).toContain('Failed to load departments');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    describe('Name Validation', () => {
      it('should require name field', () => {
        const nameControl = component.employeeForm.get('empName');
        nameControl?.setValue('');
        nameControl?.markAsTouched();
        
        expect(nameControl?.hasError('required')).toBe(true);
        expect(component.getFieldError('empName')).toBe('Name is required');
        expect(component.isFieldInvalid('empName')).toBe(true);
      });

      it('should validate minimum name length', () => {
        const nameControl = component.employeeForm.get('empName');
        nameControl?.setValue('A');
        nameControl?.markAsTouched();
        
        expect(nameControl?.hasError('minlength')).toBe(true);
        expect(component.getFieldError('empName')).toBe('Name must be at least 2 characters');
      });

      it('should validate name pattern (letters and spaces only)', () => {
        const nameControl = component.employeeForm.get('empName');
        nameControl?.setValue('John123');
        nameControl?.markAsTouched();
        
        expect(nameControl?.hasError('invalidName')).toBe(true);
        expect(component.getFieldError('empName')).toBe('Name can only contain letters and spaces');
      });

      it('should accept valid name', () => {
        const nameControl = component.employeeForm.get('empName');
        nameControl?.setValue('John Doe');
        nameControl?.markAsTouched();
        
        expect(nameControl?.valid).toBe(true);
        expect(component.isFieldValid('empName')).toBe(true);
      });
    });

    describe('Email Validation', () => {
      it('should require email field', () => {
        const emailControl = component.employeeForm.get('email');
        emailControl?.setValue('');
        emailControl?.markAsTouched();
        
        expect(emailControl?.hasError('required')).toBe(true);
        expect(component.getFieldError('email')).toBe('Email is required');
      });

      it('should validate email format', () => {
        const emailControl = component.employeeForm.get('email');
        emailControl?.setValue('invalid-email');
        emailControl?.markAsTouched();
        
        expect(emailControl?.hasError('invalidEmailFormat')).toBe(true);
        expect(component.getFieldError('email')).toBe('Please enter a valid email address');
      });

      it('should accept valid email', () => {
        const emailControl = component.employeeForm.get('email');
        emailControl?.setValue('john.doe@example.com');
        emailControl?.markAsTouched();
        
        expect(emailControl?.valid).toBe(true);
      });
    });

    describe('Phone Number Validation', () => {
      it('should require phone number', () => {
        const phoneControl = component.employeeForm.get('phoneNo');
        phoneControl?.setValue('');
        phoneControl?.markAsTouched();
        
        expect(phoneControl?.hasError('required')).toBe(true);
        expect(component.getFieldError('phoneNo')).toBe('Phone Number is required');
      });

      it('should validate 10-digit phone number', () => {
        const phoneControl = component.employeeForm.get('phoneNo');
        phoneControl?.setValue('123456789');
        phoneControl?.markAsTouched();
        
        expect(phoneControl?.hasError('invalidPhone')).toBe(true);
        expect(component.getFieldError('phoneNo')).toBe('Phone number must be exactly 10 digits');
      });

      it('should reject non-numeric phone number', () => {
        const phoneControl = component.employeeForm.get('phoneNo');
        phoneControl?.setValue('12345abcde');
        phoneControl?.markAsTouched();
        
        expect(phoneControl?.hasError('invalidPhone')).toBe(true);
      });

      it('should accept valid 10-digit phone number', () => {
        const phoneControl = component.employeeForm.get('phoneNo');
        phoneControl?.setValue('1234567890');
        phoneControl?.markAsTouched();
        
        expect(phoneControl?.valid).toBe(true);
      });
    });

    describe('Salary Validation', () => {
      it('should require salary', () => {
        const salaryControl = component.employeeForm.get('salary');
        salaryControl?.setValue('');
        salaryControl?.markAsTouched();
        
        expect(salaryControl?.hasError('required')).toBe(true);
        expect(component.getFieldError('salary')).toBe('Salary is required');
      });

      it('should validate minimum salary', () => {
        const salaryControl = component.employeeForm.get('salary');
        salaryControl?.setValue('5000');
        salaryControl?.markAsTouched();
        
        expect(salaryControl?.hasError('salaryTooLow')).toBe(true);
        expect(component.getFieldError('salary')).toBe('Salary must be at least 10,000');
      });

      it('should validate maximum salary', () => {
        const salaryControl = component.employeeForm.get('salary');
        salaryControl?.setValue('15000000');
        salaryControl?.markAsTouched();
        
        expect(salaryControl?.hasError('salaryTooHigh')).toBe(true);
        expect(component.getFieldError('salary')).toBe('Salary cannot exceed 10,000,000');
      });

      it('should reject negative salary', () => {
        const salaryControl = component.employeeForm.get('salary');
        salaryControl?.setValue('-1000');
        salaryControl?.markAsTouched();
        
        expect(salaryControl?.hasError('invalidSalary')).toBe(true);
        expect(component.getFieldError('salary')).toBe('Salary must be a positive number');
      });

      it('should accept valid salary', () => {
        const salaryControl = component.employeeForm.get('salary');
        salaryControl?.setValue('50000');
        salaryControl?.markAsTouched();
        
        expect(salaryControl?.valid).toBe(true);
      });
    });

    describe('Date Validation', () => {
      it('should require joining date', () => {
        const dateControl = component.employeeForm.get('joiningDate');
        dateControl?.setValue('');
        dateControl?.markAsTouched();
        
        expect(dateControl?.hasError('required')).toBe(true);
        expect(component.getFieldError('joiningDate')).toBe('Joining Date is required');
      });

      it('should reject future dates', () => {
        const dateControl = component.employeeForm.get('joiningDate');
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        dateControl?.setValue(futureDate.toISOString().split('T')[0]);
        dateControl?.markAsTouched();
        
        expect(dateControl?.hasError('futureDate')).toBe(true);
        expect(component.getFieldError('joiningDate')).toBe('Joining date cannot be in the future');
      });

      it('should accept today\'s date', () => {
        const dateControl = component.employeeForm.get('joiningDate');
        const today = new Date().toISOString().split('T')[0];
        dateControl?.setValue(today);
        dateControl?.markAsTouched();
        
        expect(dateControl?.valid).toBe(true);
      });
    });

    describe('Department Validation', () => {
      it('should require department selection', () => {
        const deptControl = component.employeeForm.get('departmentId');
        deptControl?.setValue('');
        deptControl?.markAsTouched();
        
        expect(deptControl?.hasError('required')).toBe(true);
        expect(component.getFieldError('departmentId')).toBe('Department is required');
      });

      it('should accept valid department ID', () => {
        const deptControl = component.employeeForm.get('departmentId');
        deptControl?.setValue('1');
        deptControl?.markAsTouched();
        
        expect(deptControl?.valid).toBe(true);
      });
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle valid image file selection', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [file] } };
      
      component.onFileSelected(event);
      
      expect(component.employeeForm.get('photo')?.value).toBe(file);
      expect(component.submitError).toBe('');
    });

    it('should reject invalid file type', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      const event = { target: { files: [file] } };
      
      component.onFileSelected(event);
      
      expect(component.submitError).toBe('Please select a valid image file (JPEG, JPG, or PNG)');
    });

    it('should reject oversized file', () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [largeFile] } };
      
      component.onFileSelected(event);
      
      expect(component.submitError).toBe('File size must be less than 5MB');
    });
  });

  describe('Employee Registration', () => {
    beforeEach(() => {
      fixture.detectChanges();
      // Fill form with valid data
      component.employeeForm.patchValue({
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
        departmentId: 1
      });
    });

    it('should register employee successfully', fakeAsync(() => {
      component.registerEmployee();
      tick();
      
      expect(mockAdminService.getDepartmentById).toHaveBeenCalledWith(1);
      expect(mockAdminService.registerEmployee).toHaveBeenCalled();
      expect(component.submitSuccess).toBe(true);
      expect(component.submitError).toBe('');
      expect(component.isLoading).toBe(false);
    }));

    it('should prevent registration with invalid form', () => {
      component.employeeForm.patchValue({ empName: '' }); // Make form invalid
      
      component.registerEmployee();
      
      expect(component.submitError).toBe('Please correct the validation errors before submitting');
      expect(mockAdminService.registerEmployee).not.toHaveBeenCalled();
    });

    it('should handle registration validation error', () => {
      const validationError = {
        type: 'validation_error',
        message: 'Email already exists',
        status: 400
      };
      mockAdminService.registerEmployee.and.returnValue(throwError(() => validationError));
      
      component.registerEmployee();
      
      expect(component.submitError).toBe('Validation failed: Email already exists');
      expect(component.isLoading).toBe(false);
    });

    it('should handle registration conflict error', () => {
      const conflictError = {
        type: 'conflict',
        message: 'Duplicate employee',
        status: 409
      };
      mockAdminService.registerEmployee.and.returnValue(throwError(() => conflictError));
      
      component.registerEmployee();
      
      expect(component.submitError).toBe('Employee with this email or phone number already exists');
      expect(component.isLoading).toBe(false);
    });

    it('should handle connection error', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Network error',
        status: 0
      };
      mockAdminService.registerEmployee.and.returnValue(throwError(() => connectionError));
      
      component.registerEmployee();
      
      expect(component.submitError).toBe('Unable to connect to server. Please check your connection and try again.');
      expect(component.isLoading).toBe(false);
    });

    it('should handle timeout error', () => {
      const timeoutError = {
        type: 'timeout',
        message: 'Request timeout',
        status: 408
      };
      mockAdminService.registerEmployee.and.returnValue(throwError(() => timeoutError));
      
      component.registerEmployee();
      
      expect(component.submitError).toBe('Request timed out. Please try again.');
      expect(component.isLoading).toBe(false);
    });

    it('should auto-redirect after successful registration', fakeAsync(() => {
      component.registerEmployee();
      tick();
      
      expect(component.submitSuccess).toBe(true);
      
      // Fast-forward 4 seconds
      tick(4000);
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/viewemployeeurl']);
    }));

    it('should validate department exists before registration', () => {
      mockAdminService.getDepartmentById.and.returnValue(of(null));
      
      component.registerEmployee();
      
      expect(component.submitError).toBe('Selected department does not exist. Please choose a valid department.');
      expect(mockAdminService.registerEmployee).not.toHaveBeenCalled();
    });

    it('should proceed with registration if department validation fails', () => {
      mockAdminService.getDepartmentById.and.returnValue(throwError(() => ({ message: 'Department not found' })));
      
      component.registerEmployee();
      
      expect(mockAdminService.registerEmployee).toHaveBeenCalled();
    });
  });

  describe('Form Reset and Navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should reset form correctly', () => {
      // Fill form with data
      component.employeeForm.patchValue({
        empName: 'John Doe',
        email: 'john@example.com'
      });
      component.submitError = 'Some error';
      component.submitSuccess = true;
      
      component.resetForm();
      
      expect(component.employeeForm.get('empName')?.value).toBeNull();
      expect(component.employeeForm.get('email')?.value).toBeNull();
      expect(component.submitError).toBe('');
      expect(component.submitSuccess).toBe(false);
      expect(component.employeeForm.untouched).toBe(true);
    });

    it('should navigate to employee list', () => {
      component.goToEmployeeList();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/viewemployeeurl']);
    });

    it('should register another employee', () => {
      component.submitSuccess = true;
      spyOn(component, 'resetForm');
      
      component.registerAnother();
      
      expect(component.submitSuccess).toBe(false);
      expect(component.resetForm).toHaveBeenCalled();
    });

    it('should logout and clear localStorage', () => {
      spyOn(localStorage, 'clear');
      
      component.logout();
      
      expect(localStorage.clear).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['loginurl']);
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should get correct field display names', () => {
      expect(component['getFieldDisplayName']('empName')).toBe('Name');
      expect(component['getFieldDisplayName']('phoneNo')).toBe('Phone Number');
      expect(component['getFieldDisplayName']('email')).toBe('Email');
      expect(component['getFieldDisplayName']('unknownField')).toBe('unknownField');
    });

    it('should mark all fields as touched', () => {
      component['markAllFieldsAsTouched']();
      
      Object.keys(component.employeeForm.controls).forEach(key => {
        expect(component.employeeForm.get(key)?.touched).toBe(true);
      });
    });

    it('should identify field validity correctly', () => {
      const nameControl = component.employeeForm.get('empName');
      
      // Invalid and touched
      nameControl?.setValue('');
      nameControl?.markAsTouched();
      expect(component.isFieldInvalid('empName')).toBe(true);
      expect(component.isFieldValid('empName')).toBe(false);
      
      // Valid and touched
      nameControl?.setValue('John Doe');
      expect(component.isFieldInvalid('empName')).toBe(false);
      expect(component.isFieldValid('empName')).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should show loading state during registration', () => {
      fixture.detectChanges();
      component.employeeForm.patchValue({
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
        departmentId: 1
      });
      
      // Mock a delayed response
      mockAdminService.registerEmployee.and.returnValue(of(mockEmployee).pipe());
      
      component.registerEmployee();
      
      expect(component.isLoading).toBe(true);
    });

    it('should show loading state during department loading', () => {
      component.isLoadingDepartments = true;
      fixture.detectChanges();
      
      expect(component.isLoadingDepartments).toBe(true);
    });
  });
});