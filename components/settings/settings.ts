import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Adminservice } from '../../services/adminservice';
import { Employee } from '../../model/employeemodel';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  empId: any;
  employee: Employee = new Employee();
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Edit mode states for different fields
  editMode = {
    name: false,
    phone: false
  };
  
  // Edit values to store temporary changes
  editValues = {
    name: '',
    phone: ''
  };
  
  // Validation error messages
  validationErrors = {
    name: '',
    phone: ''
  };
  
  // Loading states for save operations
  saveLoading = {
    name: false,
    phone: false
  };
  
  // Success and error notifications
  notifications = {
    success: '',
    error: ''
  };
  
  // Store original values for rollback on API failure
  originalValues = {
    name: '',
    phone: ''
  };
  
  // Retry mechanism properties
  retryCount = {
    name: 0,
    phone: 0
  };
  
  maxRetries = 3;
  
  // Field highlighting for errors
  fieldErrors = {
    name: false,
    phone: false
  };
  
  // Validation timeout for debouncing
  private validationTimeout: any;

  constructor(private router: Router, private adminService: Adminservice) {}

  // Global keyboard event handler for accessibility
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Handle global keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          // Prevent default save behavior and save current field if in edit mode
          event.preventDefault();
          if (this.editMode.name) {
            this.saveField('name');
          } else if (this.editMode.phone) {
            this.saveField('phone');
          }
          break;
      }
    }
    
    // Handle escape key to cancel editing
    if (event.key === 'Escape') {
      if (this.editMode.name) {
        this.cancelEdit('name');
      } else if (this.editMode.phone) {
        this.cancelEdit('phone');
      }
    }
  }

  // Enhanced keyboard navigation for edit mode
  onKeyDown(event: KeyboardEvent, field: string, action: string): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (action === 'save') {
          this.saveField(field);
        } else if (action === 'cancel') {
          this.cancelEdit(field);
        } else if (action === 'edit') {
          this.toggleEditMode(field);
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (action === 'edit-input') {
          this.cancelEdit(field);
        }
        break;
      case ' ': // Space key
        if (action === 'logout') {
          event.preventDefault();
          this.logout();
        }
        break;
    }
  }

  // Focus management for better accessibility
  focusElement(elementId: string): void {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.focus();
      }
    }, 100);
  }

  ngOnInit(): void {
    this.empId = sessionStorage.getItem("empId");
    
    // Check for valid empId (not null, undefined, empty string, or whitespace)
    if (this.empId && this.empId.trim().length > 0) {
      this.loadEmployeeData();
    } else {
      this.errorMessage = 'Session expired. Please login again.';
      setTimeout(() => {
        this.logout();
      }, 3000);
    }
  }

  loadEmployeeData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.adminService.getEmployeeById(this.empId).subscribe({
      next: (data: any) => {
        this.employee = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employee data:', error);
        this.isLoading = false;
        
        if (error.status === 401) {
          this.errorMessage = 'Session expired. Please login again.';
          setTimeout(() => {
            this.logout();
          }, 3000);
        } else if (error.status === 404) {
          this.errorMessage = 'Employee data not found.';
        } else if (error.status === 500) {
          this.errorMessage = 'Server error occurred. Please try again later.';
        } else {
          this.errorMessage = 'Failed to load employee data. Please try again.';
        }
      }
    });
  }

  toggleEditMode(field: string): void {
    // Clear any existing notifications
    this.clearNotifications();
    
    if (field === 'name') {
      this.editMode.name = !this.editMode.name;
      if (this.editMode.name) {
        this.editValues.name = this.employee.empName as string;
        this.originalValues.name = this.employee.empName as string;
        this.validationErrors.name = '';
        // Focus the input field for better accessibility
        this.focusElement('employee-name-edit');
      }
    } else if (field === 'phone') {
      this.editMode.phone = !this.editMode.phone;
      if (this.editMode.phone) {
        this.editValues.phone = this.employee.phoneNo as string;
        this.originalValues.phone = this.employee.phoneNo as string;
        this.validationErrors.phone = '';
        // Focus the input field for better accessibility
        this.focusElement('employee-phone-edit');
      }
    }
  }

  // Real-time validation for name field with debouncing
  onNameInput(): void {
    // Reset retry count when user manually edits
    this.resetRetryCount('name');
    
    // Clear any existing timeout
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    
    // Debounce validation to avoid excessive calls
    this.validationTimeout = setTimeout(() => {
      this.validateName(this.editValues.name);
    }, 300);
  }

  // Real-time validation for phone field with debouncing
  onPhoneInput(): void {
    // Reset retry count when user manually edits
    this.resetRetryCount('phone');
    
    // Clear any existing timeout
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    
    // Debounce validation to avoid excessive calls
    this.validationTimeout = setTimeout(() => {
      this.validatePhone(this.editValues.phone);
    }, 300);
  }

  saveField(field: string): void {
    if (field === 'name') {
      if (this.validateName(this.editValues.name)) {
        this.saveNameField();
      }
    } else if (field === 'phone') {
      if (this.validatePhone(this.editValues.phone)) {
        this.savePhoneField();
      }
    }
  }

  private saveNameField(): void {
    // Check if value actually changed
    if (this.editValues.name.trim() === this.originalValues.name.trim()) {
      this.editMode.name = false;
      this.showSuccessNotification('No changes made to name');
      return;
    }

    this.saveLoading.name = true;
    this.clearNotifications();

    // Optimistic UI update
    const previousName = this.employee.empName;
    this.employee.empName = this.editValues.name.trim();

    const updateData = { empName: this.editValues.name.trim() };

    this.adminService.updateEmployeeSettings(parseInt(this.empId), updateData).subscribe({
      next: (updatedEmployee: Employee) => {
        this.saveLoading.name = false;
        this.editMode.name = false;
        
        // Update employee data with server response
        this.employee = updatedEmployee;
        this.showSuccessNotification('Name updated successfully!');
        
        // Clear edit values
        this.editValues.name = '';
        this.originalValues.name = '';
      },
      error: (error: any) => {
        this.saveLoading.name = false;
        
        // Rollback optimistic update
        this.employee.empName = previousName;
        
        // Handle different error types
        this.handleSaveError(error, 'name');
      }
    });
  }

  private savePhoneField(): void {
    // Clean phone number (remove any non-digits)
    const cleanPhone = this.editValues.phone.replace(/\D/g, '');
    
    // Check if value actually changed
    if (cleanPhone === this.originalValues.phone) {
      this.editMode.phone = false;
      this.showSuccessNotification('No changes made to phone number');
      return;
    }

    this.saveLoading.phone = true;
    this.clearNotifications();

    // Optimistic UI update
    const previousPhone = this.employee.phoneNo;
    this.employee.phoneNo = cleanPhone;

    const updateData = { phoneNo: cleanPhone };

    this.adminService.updateEmployeeSettings(parseInt(this.empId), updateData).subscribe({
      next: (updatedEmployee: Employee) => {
        this.saveLoading.phone = false;
        this.editMode.phone = false;
        
        // Update employee data with server response
        this.employee = updatedEmployee;
        this.showSuccessNotification('Phone number updated successfully!');
        
        // Clear edit values
        this.editValues.phone = '';
        this.originalValues.phone = '';
      },
      error: (error: any) => {
        this.saveLoading.phone = false;
        
        // Rollback optimistic update
        this.employee.phoneNo = previousPhone;
        
        // Handle different error types
        this.handleSaveError(error, 'phone');
      }
    });
  }

  private handleSaveError(error: any, field: string): void {
    console.error(`Error updating ${field}:`, error);
    
    // Set field error highlighting
    this.fieldErrors[field as keyof typeof this.fieldErrors] = true;
    
    // Handle specific error types with enhanced error recovery
    if (error.type === 'session_expired') {
      this.showErrorNotificationWithRetry('Session expired. Please login again.', field, false);
      setTimeout(() => {
        this.logout();
      }, 3000);
    } else if (error.type === 'phone_duplicate_error') {
      this.showErrorNotificationWithRetry('This phone number is already in use. Please choose a different number.', field, false);
      // Highlight the specific field with validation error
      this.validationErrors[field as keyof typeof this.validationErrors] = 'Phone number already exists';
    } else if (error.type === 'name_validation_error') {
      this.showErrorNotificationWithRetry(error.message, field, false);
      this.validationErrors.name = error.message;
    } else if (error.type === 'phone_validation_error') {
      this.showErrorNotificationWithRetry(error.message, field, false);
      this.validationErrors.phone = error.message;
    } else if (error.type === 'validation_error') {
      this.showErrorNotificationWithRetry('Invalid data provided. Please check your input and try again.', field, false);
    } else if (error.type === 'network_error' || error.type === 'timeout') {
      // These errors can be retried
      const canRetry = this.retryCount[field as keyof typeof this.retryCount] < this.maxRetries;
      this.showErrorNotificationWithRetry(
        error.type === 'network_error' 
          ? 'Network error. Please check your connection and try again.' 
          : 'Request timed out. Please try again.',
        field,
        canRetry
      );
    } else if (error.type === 'server_error') {
      // Server errors can sometimes be retried
      const canRetry = this.retryCount[field as keyof typeof this.retryCount] < this.maxRetries;
      this.showErrorNotificationWithRetry('Server error occurred. Please try again later.', field, canRetry);
    } else {
      // Generic errors can be retried
      const canRetry = this.retryCount[field as keyof typeof this.retryCount] < this.maxRetries;
      this.showErrorNotificationWithRetry(`Failed to update ${field}. Please try again.`, field, canRetry);
    }
  }

  private showErrorNotificationWithRetry(message: string, field: string, canRetry: boolean): void {
    let fullMessage = message;
    
    if (canRetry) {
      const remainingRetries = this.maxRetries - this.retryCount[field as keyof typeof this.retryCount];
      fullMessage += ` (${remainingRetries} retries remaining)`;
    }
    
    this.notifications.error = fullMessage;
    this.notifications.success = '';
  }

  // Retry mechanism for failed save operations
  retryFieldSave(field: string): void {
    if (this.retryCount[field as keyof typeof this.retryCount] >= this.maxRetries) {
      this.showErrorNotification(`Maximum retry attempts reached for ${field}. Please refresh the page and try again.`);
      return;
    }
    
    // Increment retry count
    this.retryCount[field as keyof typeof this.retryCount]++;
    
    // Clear field error highlighting
    this.fieldErrors[field as keyof typeof this.fieldErrors] = false;
    
    // Clear notifications
    this.clearNotifications();
    
    // Show retry notification
    this.showSuccessNotification(`Retrying ${field} update... (Attempt ${this.retryCount[field as keyof typeof this.retryCount]})`);
    
    // Retry the save operation
    this.saveField(field);
  }

  // Reset retry count when user manually edits field
  resetRetryCount(field: string): void {
    this.retryCount[field as keyof typeof this.retryCount] = 0;
    this.fieldErrors[field as keyof typeof this.fieldErrors] = false;
  }

  clearNotifications(): void {
    this.notifications.success = '';
    this.notifications.error = '';
  }

  showSuccessNotification(message: string): void {
    this.notifications.success = message;
    this.notifications.error = '';
    
    // Auto-hide success notification after 5 seconds
    setTimeout(() => {
      this.notifications.success = '';
    }, 5000);
  }

  showErrorNotification(message: string): void {
    this.notifications.error = message;
    this.notifications.success = '';
  }

  cancelEdit(field: string): void {
    if (field === 'name') {
      this.editMode.name = false;
      this.editValues.name = '';
      this.validationErrors.name = '';
    } else if (field === 'phone') {
      this.editMode.phone = false;
      this.editValues.phone = '';
      this.validationErrors.phone = '';
    }
  }

  validateName(name: string): boolean {
    this.validationErrors.name = '';
    
    if (!name || name.trim().length === 0) {
      this.validationErrors.name = 'Name cannot be empty';
      return false;
    }
    
    if (name.trim().length < 2) {
      this.validationErrors.name = 'Name must be at least 2 characters long';
      return false;
    }
    
    if (name.trim().length > 30) {
      this.validationErrors.name = 'Name cannot exceed 30 characters';
      return false;
    }
    
    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const namePattern = /^[a-zA-Z\s\-']+$/;
    if (!namePattern.test(name.trim())) {
      this.validationErrors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
      return false;
    }
    
    return true;
  }

  validatePhone(phone: string): boolean {
    this.validationErrors.phone = '';
    
    if (!phone || phone.trim().length === 0) {
      this.validationErrors.phone = 'Phone number cannot be empty';
      return false;
    }
    
    // Remove any spaces or special characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length !== 10) {
      this.validationErrors.phone = 'Phone number must be exactly 10 digits';
      return false;
    }
    
    // Check if it's all digits
    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(cleanPhone)) {
      this.validationErrors.phone = 'Phone number must contain only digits';
      return false;
    }
    
    return true;
  }

  updateEmployeeField(field: string, value: string): void {
    // TODO: This method will be implemented in later tasks to make API calls
    console.log(`Updating ${field} to ${value}`);
  }

  logout(): void {
    sessionStorage.clear();
    this.router.navigate(['employeeloginurl']);
  }
}
