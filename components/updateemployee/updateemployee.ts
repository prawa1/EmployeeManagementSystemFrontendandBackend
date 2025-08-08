import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Employee } from '../../model/employeemodel';
import { Adminservice } from '../../services/adminservice';

@Component({
  selector: 'app-updateemployee',
  standalone: false,
  templateUrl: './updateemployee.html',
  styleUrl: './updateemployee.css'
})
export class Updateemployee implements OnInit {
  employeeId: number = 0;
  updateForm: FormGroup;
  originalEmployee: Employee | null = null;
  
  // Simple states
  submitError: string = '';
  submitSuccess: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private adminService: Adminservice
  ) {
    this.updateForm = this.createUpdateForm();
  }

  ngOnInit(): void {
    // Get employee ID from route parameters
    this.route.params.subscribe(params => {
      this.employeeId = parseInt(params['empid']);
      console.log('Update employee with ID:', this.employeeId);
      // Don't automatically load data - let user click button to fetch
    });
  }

  /**
   * Creates the reactive form for updating employee with comprehensive validation for all 9 editable fields
   */
  private createUpdateForm(): FormGroup {
    return this.formBuilder.group({
      // Read-only fields
      empId: [{value: '', disabled: true}], // Read-only field
      joiningDate: [{value: '', disabled: true}], // Read-only field
      department: [{value: '', disabled: true}], // Read-only field
      
      // Editable fields with validation
      empName: ['', [
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z\s]+$/) // Only letters and spaces
      ]],
      phoneNo: ['', [
        Validators.pattern(/^\d{10}$/) // Exactly 10 digits
      ]],
      email: ['', [
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) // Valid email format
      ]],
      password: ['', [
        Validators.pattern(/^[a-z][A-Z][0-9]{8,10}$/) // Lowercase, uppercase, 8-10 digits
      ]],
      role: ['', [
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      salary: ['', [
        Validators.min(10000),
        Validators.max(2500000),
        Validators.pattern(/^\d+$/) // Only positive numbers
      ]],
      address: ['', [
        Validators.minLength(10),
        Validators.maxLength(500)
      ]],
      gender: ['', [
        Validators.pattern(/^(Male|Female|Other)$/) // Only valid gender options
      ]],
      managerId: ['', [
        Validators.min(1),
        Validators.pattern(/^\d+$/) // Only positive integers
      ]]
    });
  }

  /**
   * Fetch employee data from backend (simple button click)
   */
  fetchEmployeeData(): void {
    console.log('=== FETCHING EMPLOYEE DATA ===');
    console.log('Employee ID:', this.employeeId);
    
    if (!this.employeeId || isNaN(this.employeeId)) {
      this.submitError = 'Please provide a valid employee ID';
      return;
    }

    this.submitError = '';
    this.submitSuccess = false;

    // Try primary method first
    this.adminService.getEmployeeForUpdate(this.employeeId).subscribe({
      next: (employee: Employee) => {
        console.log('=== EMPLOYEE DATA FETCHED ===');
        console.log('Employee data:', employee);
        this.originalEmployee = employee;

        // Populate form with ALL current employee data
        this.updateForm.patchValue({
          empId: employee.empId || '',
          empName: employee.empName || '',
          phoneNo: employee.phoneNo || '',
          email: employee.email || '',
          password: '', // Don't pre-fill password for security
          role: employee.role || '',
          salary: employee.salary || '',
          address: employee.address || '',
          gender: employee.gender || '',
          joiningDate: employee.joiningDate || '',
          managerId: employee.managerId || '',
          department: employee.department?.deptName || ''
        });
        
        this.submitSuccess = true;
        this.submitError = '';
        console.log('Form populated with employee data');
      },
      error: (error) => {
        console.log('=== PRIMARY FETCH FAILED, TRYING FALLBACK ===');
        console.error('Primary fetch failed:', error);
        
        // Try fallback method
        this.adminService.getAllEmployees().subscribe({
          next: (employees: Employee[]) => {
            console.log('All employees loaded for fallback:', employees);
            
            // Find the specific employee by ID
            const employee = employees.find(emp => emp.empId === this.employeeId);
            
            if (employee) {
              console.log('=== EMPLOYEE FOUND IN FALLBACK ===');
              this.originalEmployee = employee;

              // Populate form with employee data
              this.updateForm.patchValue({
                empId: employee.empId || '',
                empName: employee.empName || '',
                phoneNo: employee.phoneNo || '',
                email: employee.email || '',
                password: '',
                role: employee.role || '',
                salary: employee.salary || '',
                address: employee.address || '',
                gender: employee.gender || '',
                joiningDate: employee.joiningDate || '',
                managerId: employee.managerId || '',
                department: employee.department?.deptName || ''
              });
              
              this.submitSuccess = true;
              this.submitError = '';
              console.log('Form populated with fallback data');
            } else {
              this.submitError = 'Employee not found with ID: ' + this.employeeId;
            }
          },
          error: (fallbackError) => {
            console.error('Fallback fetch also failed:', fallbackError);
            this.submitError = 'Failed to fetch employee data. Please check the employee ID and try again.';
          }
        });
      }
    });
  }

  /**
   * Update employee with comprehensive validation for all 9 editable fields
   */
  updateEmployee(): void {
    console.log('=== UPDATE EMPLOYEE ATTEMPT ===');
    console.log('Form valid:', this.updateForm.valid);
    console.log('Form value:', this.updateForm.value);

    if (this.updateForm.invalid) {
      console.log('Form validation failed');
      this.markAllFieldsAsTouched();
      this.submitError = 'Please correct the validation errors before submitting';
      return;
    }

    if (!this.originalEmployee) {
      this.submitError = 'Original employee data not loaded. Please fetch employee data first.';
      return;
    }

    this.submitError = '';
    this.submitSuccess = false;

    const formData = this.updateForm.value;
    console.log('Form data to update:', formData);

    // Create updated employee object with all original data as base
    const updatedEmployee: any = {
      ...this.originalEmployee // Keep all original data as base
    };

    // Track which fields are being updated
    const updatedFields: string[] = [];

    // Update all 9 editable fields - only if they have valid values
    
    // 1. Employee Name
    if (formData.empName && formData.empName.trim() !== '' && formData.empName.trim() !== this.originalEmployee.empName) {
      updatedEmployee.empName = formData.empName.trim();
      updatedFields.push('Employee Name');
    }
    
    // 2. Phone Number
    if (formData.phoneNo && formData.phoneNo.trim() !== '' && formData.phoneNo.trim() !== this.originalEmployee.phoneNo) {
      updatedEmployee.phoneNo = formData.phoneNo.trim();
      updatedFields.push('Phone Number');
    }
    
    // 3. Email Address
    if (formData.email && formData.email.trim() !== '' && formData.email.trim() !== this.originalEmployee.email) {
      updatedEmployee.email = formData.email.trim();
      updatedFields.push('Email Address');
    }
    
    // 4. Password (always update if provided, never compare with original for security)
    if (formData.password && formData.password.trim() !== '') {
      updatedEmployee.password = formData.password.trim();
      updatedFields.push('Password');
    }
    
    // 5. Role
    if (formData.role && formData.role.trim() !== '' && formData.role.trim() !== this.originalEmployee.role) {
      updatedEmployee.role = formData.role.trim();
      updatedFields.push('Role');
    }
    
    // 6. Salary
    if (formData.salary && formData.salary > 0 && formData.salary !== this.originalEmployee.salary) {
      updatedEmployee.salary = formData.salary;
      updatedFields.push('Salary');
    }
    
    // 7. Address
    if (formData.address && formData.address.trim() !== '' && formData.address.trim() !== this.originalEmployee.address) {
      updatedEmployee.address = formData.address.trim();
      updatedFields.push('Address');
    }
    
    // 8. Gender
    if (formData.gender && formData.gender.trim() !== '' && formData.gender.trim() !== this.originalEmployee.gender) {
      updatedEmployee.gender = formData.gender.trim();
      updatedFields.push('Gender');
    }
    
    // 9. Manager ID
    if (formData.managerId && formData.managerId > 0 && formData.managerId !== this.originalEmployee.managerId) {
      updatedEmployee.managerId = formData.managerId;
      updatedFields.push('Manager ID');
    }

    console.log('Updated employee object:', updatedEmployee);
    console.log('Fields being updated:', updatedFields);

    // Validate that at least one field is being updated
    if (updatedFields.length === 0) {
      this.submitError = 'No changes detected. Please modify at least one field to update.';
      alert('⚠️ No changes detected. Please modify at least one field to update.');
      return;
    }

    // Use admin service method for update with proper error handling
    this.adminService.updateEmployee(this.employeeId, updatedEmployee).subscribe({
      next: (response: any) => {
        console.log('=== UPDATE SUCCESS ===');
        console.log('Backend response:', response);
        this.submitSuccess = true;
        this.submitError = '';

        // Show success alert with updated fields
        const updatedFieldsList = updatedFields.join(', ');
        alert(`✅ Employee updated successfully!\n\nUpdated fields (${updatedFields.length}): ${updatedFieldsList}`);

        // Refresh the employee data to show updated values
        setTimeout(() => {
          this.fetchEmployeeData();
        }, 1000);
      },
      error: (error: any) => {
        console.log('=== UPDATE ERROR ===');
        console.error('Update failed:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error body:', error.error);
        this.handleUpdateError(error);

        // Show error alert
        alert(`❌ Update failed: ${this.submitError}`);
      }
    });
  }

  /**
   * Handle update errors with specific error messages
   */
  private handleUpdateError(error: any): void {
    if (error.status === 400) {
      this.submitError = 'Invalid employee data. Please check all fields and try again.';
    } else if (error.status === 404) {
      this.submitError = 'Employee not found. The employee may have been deleted.';
    } else if (error.status === 409) {
      this.submitError = 'Phone number already exists for another employee.';
    } else if (error.status === 0) {
      this.submitError = 'Cannot connect to server. Please check your internet connection.';
    } else if (error.status >= 500) {
      this.submitError = 'Server error occurred. Please try again later.';
    } else {
      this.submitError = `Update failed (Error ${error.status}). Please try again.`;
    }
  }

  /**
   * Get validation error message for a form field with specific messages for all 9 editable fields
   */
  getFieldError(fieldName: string): string {
    const field = this.updateForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    const errors = field.errors;
    
    // Required field errors
    if (errors['required']) return `${this.getFieldDisplayName(fieldName)} is required`;
    
    // Pattern validation errors - specific for each field
    if (errors['pattern']) {
      switch (fieldName) {
        case 'empName':
          return 'Name can only contain letters and spaces';
        case 'phoneNo':
          return 'Phone number must be exactly 10 digits (e.g., 9876543210)';
        case 'email':
          return 'Please enter a valid email address (e.g., user@example.com)';
        case 'password':
          return 'Password must start with lowercase, then uppercase, then 8-10 digits (e.g., aA12345678)';
        case 'salary':
          return 'Salary must be a positive number only';
        case 'gender':
          return 'Please select a valid gender option (Male, Female, or Other)';
        case 'managerId':
          return 'Manager ID must be a positive number';
        default:
          return 'Invalid format';
      }
    }
    
    // Length validation errors
    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      switch (fieldName) {
        case 'empName':
          return `Name must be at least ${requiredLength} characters long`;
        case 'role':
          return `Role must be at least ${requiredLength} characters long`;
        case 'address':
          return `Address must be at least ${requiredLength} characters long`;
        default:
          return `${this.getFieldDisplayName(fieldName)} must be at least ${requiredLength} characters`;
      }
    }
    
    if (errors['maxlength']) {
      const maxLength = errors['maxlength'].requiredLength;
      switch (fieldName) {
        case 'empName':
          return `Name cannot exceed ${maxLength} characters`;
        case 'role':
          return `Role cannot exceed ${maxLength} characters`;
        case 'address':
          return `Address cannot exceed ${maxLength} characters`;
        default:
          return `${this.getFieldDisplayName(fieldName)} cannot exceed ${maxLength} characters`;
      }
    }
    
    // Min/Max value errors
    if (errors['min']) {
      const minValue = errors['min'].min;
      switch (fieldName) {
        case 'salary':
          return `Salary must be at least ₹${minValue.toLocaleString()}`;
        case 'managerId':
          return `Manager ID must be at least ${minValue}`;
        default:
          return `${this.getFieldDisplayName(fieldName)} must be at least ${minValue}`;
      }
    }
    
    if (errors['max']) {
      const maxValue = errors['max'].max;
      switch (fieldName) {
        case 'salary':
          return `Salary cannot exceed ₹${maxValue.toLocaleString()}`;
        default:
          return `${this.getFieldDisplayName(fieldName)} cannot exceed ${maxValue}`;
      }
    }
    
    // Email validation error
    if (errors['email']) {
      return 'Please enter a valid email address';
    }

    return 'Invalid input';
  }

  /**
   * Get display name for form fields
   */
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      empId: 'Employee ID',
      empName: 'Name',
      phoneNo: 'Phone Number',
      email: 'Email',
      password: 'Password',
      role: 'Role',
      salary: 'Salary',
      address: 'Address',
      gender: 'Gender',
      joiningDate: 'Joining Date',
      managerId: 'Manager ID',
      department: 'Department'
    };
    return displayNames[fieldName] || fieldName;
  }

  /**
   * Check if a field has validation errors and is touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.updateForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Check if a field is valid and touched
   */
  isFieldValid(fieldName: string): boolean {
    const field = this.updateForm.get(fieldName);
    return !!(field && field.valid && field.touched);
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.updateForm.controls).forEach(key => {
      const control = this.updateForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Reset form to original employee data
   */
  resetForm(): void {
    if (this.originalEmployee) {
      this.updateForm.patchValue({
        empId: this.originalEmployee.empId || '',
        empName: this.originalEmployee.empName || '',
        phoneNo: this.originalEmployee.phoneNo || '',
        email: this.originalEmployee.email || '',
        password: '', // Don't pre-fill password for security
        role: this.originalEmployee.role || '',
        salary: this.originalEmployee.salary || '',
        address: this.originalEmployee.address || '',
        gender: this.originalEmployee.gender || '',
        joiningDate: this.originalEmployee.joiningDate || '',
        managerId: this.originalEmployee.managerId || '',
        department: this.originalEmployee.department?.deptName || ''
      });
    }
    this.updateForm.markAsUntouched();
    this.submitError = '';
    this.submitSuccess = false;
  }

  /**
   * Navigate back to employee list
   */
  goBack(): void {
    this.router.navigate(['/viewemployeeurl']);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['loginurl']);
  }
}