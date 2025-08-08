import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Employee, Department } from '../../model/employeemodel';
import { Adminservice } from '../../services/adminservice';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {
  employeeForm: FormGroup;
  departments: Department[] = [];
  submitError: string = '';
  submitSuccess: boolean = false;
  isLoading: boolean = false;
  isLoadingDepartments: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private adminService: Adminservice, 
    public router: Router
  ) {
    this.employeeForm = this.createEmployeeForm();
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  /**
   * Creates the reactive form with validation rules
   */
  private createEmployeeForm(): FormGroup {
    return this.formBuilder.group({
      empName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      phoneNo: ['', [
        Validators.required,
        Validators.pattern(/^\d{10}$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      password: ['', [
        Validators.required,
        Validators.pattern(/^[a-z][A-Z][0-9]{8,10}$/)
      ]],
      role: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      managerId: ['', [
        Validators.required,
        Validators.min(1)
      ]],
      salary: ['', [
        Validators.required,
        Validators.min(10000)
      ]],
      address: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(500)
      ]],
      joiningDate: ['', [
        Validators.required
      ]],
      gender: ['', [
        Validators.required
      ]],
      departmentId: ['', [
        Validators.required,
        Validators.min(1)
      ]],
      photo: [null]
    });
  }

  /**
   * Load departments from backend
   */
  private loadDepartments(): void {
    console.log('Loading departments...');
    this.isLoadingDepartments = true;
    this.adminService.getAllDepartments().subscribe({
      next: (departments: Department[]) => {
        console.log('Departments loaded:', departments);
        this.departments = departments;
        this.isLoadingDepartments = false;
      },
      error: (error: any) => {
        console.error('Failed to load departments:', error);
        this.isLoadingDepartments = false;
        // Show error message but don't block the form
        this.submitError = 'Failed to load departments. Please refresh the page and try again.';
      }
    });
  }

  /**
   * Get validation error message for a form field
   */
  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${this.getFieldDisplayName(fieldName)} is required`;
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['pattern']) {
      if (fieldName === 'phoneNo') {
        return 'Please enter a valid 10-digit phone number';
      } else if (fieldName === 'password') {
        return 'Password must start with lowercase, then uppercase, then 8-10 digits (e.g., aA12345678)';
      }
      return 'Invalid format';
    }
    if (errors['minlength']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `${this.getFieldDisplayName(fieldName)} cannot exceed ${errors['maxlength'].requiredLength} characters`;
    if (errors['min']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['min'].min}`;
    
    return 'Invalid input';
  }

  /**
   * Get display name for form fields
   */
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      empName: 'Name',
      phoneNo: 'Phone Number',
      email: 'Email',
      password: 'Password',
      role: 'Role',
      managerId: 'Manager ID',
      salary: 'Salary',
      address: 'Address',
      joiningDate: 'Joining Date',
      gender: 'Gender',
      departmentId: 'Department'
    };
    return displayNames[fieldName] || fieldName;
  }

  /**
   * Check if a field has validation errors and is touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Check if a field is valid and touched
   */
  isFieldValid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field && field.valid && field.touched);
  }

  /**
   * Handle file selection for photo upload
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!allowedTypes.includes(file.type)) {
        this.submitError = 'Please select a valid image file (JPEG, JPG, or PNG)';
        return;
      }
      
      if (file.size > maxSize) {
        this.submitError = 'File size must be less than 5MB';
        return;
      }
      
      this.employeeForm.patchValue({ photo: file });
      this.submitError = '';
    }
  }

  /**
   * Register employee with comprehensive validation and feedback
   */
  registerEmployee(): void {
    console.log('=== REGISTRATION ATTEMPT STARTED ===');
    console.log('Form valid:', this.employeeForm.valid);
    console.log('Form value:', this.employeeForm.value);
    console.log('Form errors:', this.employeeForm.errors);
    
    if (this.employeeForm.invalid) {
      console.log('Form validation failed');
      this.markAllFieldsAsTouched();
      this.submitError = 'Please correct the validation errors before submitting';
      this.scrollToFirstError();
      return;
    }

    this.isLoading = true;
    this.submitError = '';
    this.submitSuccess = false;

    const formData = this.employeeForm.value;
    console.log('Raw form data:', formData);
    
    // Create employee object exactly as backend expects
    const employee = {
      empName: formData.empName,
      phoneNo: formData.phoneNo,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      managerId: parseInt(formData.managerId),
      salary: parseFloat(formData.salary),
      address: formData.address,
      joiningDate: formData.joiningDate,
      gender: formData.gender,
      photo: formData.photo || null
    };

    const departmentId = parseInt(formData.departmentId);
    
    console.log('Employee object to send:', employee);
    console.log('Department ID:', departmentId);
    console.log('Backend endpoint will be:', `http://localhost:8082/employee/api/add/${departmentId}`);
    
    // Log each field individually for debugging
    console.log('Individual field values:');
    console.log('- empName:', employee.empName, typeof employee.empName);
    console.log('- phoneNo:', employee.phoneNo, typeof employee.phoneNo);
    console.log('- email:', employee.email, typeof employee.email);
    console.log('- password:', employee.password, typeof employee.password);
    console.log('- role:', employee.role, typeof employee.role);
    console.log('- managerId:', employee.managerId, typeof employee.managerId);
    console.log('- salary:', employee.salary, typeof employee.salary);
    console.log('- address:', employee.address, typeof employee.address);
    console.log('- joiningDate:', employee.joiningDate, typeof employee.joiningDate);
    console.log('- gender:', employee.gender, typeof employee.gender);
    console.log('- photo:', employee.photo);

    // Try multiple approaches to register the employee
    console.log('Attempting registration with direct HTTP call...');
    
    // First, try with the current employee object
    this.adminService.httpclient.post(`http://localhost:8082/employee/api/add/${departmentId}`, employee).subscribe({
      next: (response: any) => {
        console.log('=== REGISTRATION SUCCESS ===');
        console.log('Backend response:', response);
        this.isLoading = false;
        this.submitSuccess = true;
        this.submitError = '';
        
        // Show success alert
        alert(`✅ Employee registered successfully!\n\nEmployee ID: ${response.empId || 'Generated'}\nName: ${employee.empName}\nEmail: ${employee.email}\n\nRedirecting to employee list...`);
        
        // Reset form
        this.employeeForm.reset();
        this.employeeForm.markAsUntouched();
        
        // Redirect after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/viewemployeeurl']);
        }, 2000);
      },
      error: (error: any) => {
        console.log('=== REGISTRATION ERROR ===');
        console.error('Registration failed:', error);
        console.error('Error status:', error.status);
        console.error('Error statusText:', error.statusText);
        console.error('Error message:', error.message);
        console.error('Error body:', error.error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        // Try to extract more detailed error information
        if (error.error && typeof error.error === 'object') {
          console.error('Detailed error info:', error.error);
          if (error.error.message) {
            console.error('Backend error message:', error.error.message);
          }
          if (error.error.errors) {
            console.error('Backend validation errors:', error.error.errors);
          }
        }
        
        this.isLoading = false;
        this.handleRegistrationError(error);
        
        // Show error alert with more details
        let errorDetails = this.submitError;
        if (error.error && error.error.message) {
          errorDetails += `\n\nBackend says: ${error.error.message}`;
        }
        alert(`❌ Registration failed: ${errorDetails}`);
      }
    });
  }

  /**
   * Handle registration errors with specific error messages
   */
  private handleRegistrationError(error: any): void {
    if (error.status === 400) {
      this.submitError = 'Invalid employee data. Please check all fields and try again.';
    } else if (error.status === 409) {
      this.submitError = 'Employee with this email or phone number already exists';
    } else if (error.status === 0) {
      this.submitError = 'Cannot connect to server. Please check your internet connection.';
    } else if (error.status >= 500) {
      this.submitError = 'Server error occurred. Please try again later.';
    } else {
      this.submitError = `Registration failed (Error ${error.status}). Please try again.`;
    }
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.employeeForm.controls).forEach(key => {
      const control = this.employeeForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Scroll to the first form field with an error
   */
  private scrollToFirstError(): void {
    const firstErrorField = document.querySelector('.form-control.is-invalid, .form-select.is-invalid');
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (firstErrorField as HTMLElement).focus();
    }
  }

  /**
   * Reset form and validation states
   */
  resetForm(): void {
    this.employeeForm.reset();
    this.employeeForm.markAsUntouched();
    this.submitError = '';
    this.submitSuccess = false;
  }

  /**
   * Navigate to employee list
   */
  goToEmployeeList(): void {
    this.router.navigate(['/viewemployeeurl']);
  }

  /**
   * Register another employee (reset form and stay on page)
   */
  registerAnother(): void {
    this.submitSuccess = false;
    this.resetForm();
    this.scrollToTop();
  }

  /**
   * Scroll to the top of the form
   */
  private scrollToTop(): void {
    const formElement = document.querySelector('.card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['loginurl']);
  }
}