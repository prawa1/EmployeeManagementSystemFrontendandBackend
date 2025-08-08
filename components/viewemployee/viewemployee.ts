import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adminservice, PagedResponse } from '../../services/adminservice';
import { Employee } from '../../model/employeemodel';
import { DeleteConfirmationData } from '../delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-viewemployee',
  standalone: false,
  templateUrl: './viewemployee.html',
  styleUrl: './viewemployee.css'
})
export class Viewemployee implements OnInit{

  employee: Employee[] = [];
  
  // Pagination properties
  currentPage: number = 0; // 0-based for backend
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  
  // Loading and error states
  isLoading: boolean = false;
  loadError: string | null = null;
  
  // Search and filtering properties
  searchQuery: string = '';
  isSearching: boolean = false;
  searchError: string | null = null;
  private searchTimeout: any;
  private searchDebounceTime: number = 300; // 300ms debounce
  
  // Sorting properties
  sortBy: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  sortableFields = [
    { key: 'empId', label: 'Employee ID' },
    { key: 'empName', label: 'Name' },
    { key: 'role', label: 'Designation' },
    { key: 'phoneNo', label: 'Phone Number' },
    { key: 'joiningDate', label: 'Date of Joining' },
    { key: 'email', label: 'Email' },
    { key: 'salary', label: 'Salary' }
  ];
  
  // Legacy pagination support (for ngx-pagination)
  p: number = 1; // 1-based for ngx-pagination
  count: number = 10;
  
  // Confirmation dialog properties
  showDeleteDialog = false;
  deleteConfirmationData: DeleteConfirmationData = {
    employee: new Employee(),
    dependencies: [],
    hasDependencies: false
  };
  isLoadingDependencies = false;
  deleteError: string | null = null;

  constructor(private router:Router,private adminservice:Adminservice,private cdr:ChangeDetectorRef){}

  ngOnInit(): void {
    console.log('ViewEmployee component initialized');
    this.loadEmployees();
  }

  /**
   * Load employees with pagination support
   * @param page Page number (0-based)
   * @param size Page size
   */
  loadEmployees(page: number = 0, size: number = this.pageSize): void {
    console.log('Loading employees - page:', page, 'size:', size);
    this.isLoading = true;
    this.loadError = null;
    
    // Use the simple getAllEmployees method since backend returns array directly
    this.adminservice.getAllEmployees().subscribe({
      next: (employees: Employee[]) => {
        console.log('Raw employees data received:', employees);
        
        if (employees && Array.isArray(employees)) {
          // Handle client-side pagination since backend doesn't support it yet
          this.totalElements = employees.length;
          this.totalPages = Math.ceil(employees.length / this.pageSize);
          this.currentPage = page;
          
          // Apply client-side pagination
          const startIndex = page * this.pageSize;
          const endIndex = startIndex + this.pageSize;
          this.employee = employees.slice(startIndex, endIndex);
          
          // Update legacy pagination properties for ngx-pagination compatibility
          this.p = this.currentPage + 1; // Convert to 1-based
          this.count = this.pageSize;
          
          console.log('Processed employees:', {
            total: this.totalElements,
            totalPages: this.totalPages,
            currentPage: this.currentPage,
            displayedEmployees: this.employee.length,
            employees: this.employee
          });
        } else {
          console.warn('Invalid employees data received:', employees);
          this.employee = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.currentPage = 0;
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.isLoading = false;
        this.employee = [];
        this.totalElements = 0;
        this.totalPages = 0;
        
        // Handle specific error types
        if (error.status === 0) {
          this.loadError = 'Unable to connect to the server. Please check your connection and try again.';
        } else if (error.status >= 500) {
          this.loadError = 'Server error occurred. Please try again later.';
        } else if (error.status === 404) {
          this.loadError = 'Employee data not found.';
        } else {
          this.loadError = 'An error occurred while loading employees. Please try again.';
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Legacy method for backward compatibility
   */
  loadEmployee(): void {
    this.loadEmployees();
  }

  /**
   * Handle page change event
   * @param page New page number (1-based from ngx-pagination)
   */
  onPageChange(page: number): void {
    const zeroBasedPage = page - 1; // Convert to 0-based
    
    // Use search if there's a search query, otherwise use regular pagination
    if (this.searchQuery.trim()) {
      this.performSearch(zeroBasedPage, this.pageSize);
    } else if (this.sortBy) {
      this.loadEmployeesWithSort(zeroBasedPage, this.pageSize);
    } else {
      this.loadEmployees(zeroBasedPage, this.pageSize);
    }
  }

  /**
   * Handle page size change
   * @param newSize New page size
   */
  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.count = newSize; // Update legacy property
    
    // Reset to first page with new size, maintaining search/sort state
    if (this.searchQuery.trim()) {
      this.performSearch(0, newSize);
    } else if (this.sortBy) {
      this.loadEmployeesWithSort(0, newSize);
    } else {
      this.loadEmployees(0, newSize);
    }
  }

  /**
   * Refresh the employee list
   */
  refreshEmployees(): void {
    if (this.searchQuery.trim()) {
      this.performSearch(this.currentPage, this.pageSize);
    } else {
      this.loadEmployees(this.currentPage, this.pageSize);
    }
  }

  /**
   * Handle search input with debouncing
   * @param query Search query
   */
  onSearchInput(query: string): void {
    this.searchQuery = query;
    this.searchError = null;
    
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Set new timeout for debounced search
    this.searchTimeout = setTimeout(() => {
      this.performSearch(0, this.pageSize); // Reset to first page on new search
    }, this.searchDebounceTime);
  }

  /**
   * Perform search with pagination
   * @param page Page number (0-based)
   * @param size Page size
   */
  performSearch(page: number = 0, size: number = this.pageSize): void {
    const query = this.searchQuery.trim();
    
    if (!query) {
      // If search query is empty, load all employees
      this.loadEmployees(page, size);
      return;
    }
    
    console.log('Performing search for:', query);
    this.isSearching = true;
    this.searchError = null;
    
    // Use simple search since backend might not support pagination for search
    this.adminservice.searchEmployees(query).subscribe({
      next: (employees: Employee[]) => {
        console.log('Search results received:', employees);
        
        if (employees && Array.isArray(employees)) {
          // Apply client-side sorting if specified
          let sortedEmployees = employees;
          if (this.sortBy) {
            sortedEmployees = this.sortEmployeesClientSide(employees, this.sortBy, this.sortDirection);
          }
          
          // Handle client-side pagination for search results
          this.totalElements = sortedEmployees.length;
          this.totalPages = Math.ceil(sortedEmployees.length / this.pageSize);
          this.currentPage = page;
          
          // Apply client-side pagination
          const startIndex = page * this.pageSize;
          const endIndex = startIndex + this.pageSize;
          this.employee = sortedEmployees.slice(startIndex, endIndex);
          
          // Update legacy pagination properties
          this.p = this.currentPage + 1;
          this.count = this.pageSize;
          
          console.log('Processed search results:', {
            total: this.totalElements,
            totalPages: this.totalPages,
            currentPage: this.currentPage,
            displayedEmployees: this.employee.length
          });
        } else {
          this.employee = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.currentPage = 0;
        }
        
        this.isSearching = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Search error:', error);
        this.isSearching = false;
        this.employee = [];
        this.totalElements = 0;
        this.totalPages = 0;
        
        // Handle specific error types
        if (error.status === 0) {
          this.searchError = 'Unable to connect to the server. Please check your connection and try again.';
        } else if (error.status >= 500) {
          this.searchError = 'Server error occurred during search. Please try again later.';
        } else {
          this.searchError = 'An error occurred while searching. Please try again.';
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Clear search and reload all employees
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.searchError = null;
    
    // Clear any pending search timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Reset to first page and load all employees
    this.loadEmployees(0, this.pageSize);
  }

  /**
   * Handle sorting
   * @param field Field to sort by
   */
  onSort(field: string): void {
    if (this.sortBy === field) {
      // Toggle sort direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new sort field with ascending direction
      this.sortBy = field;
      this.sortDirection = 'asc';
    }
    
    // Perform search or load with new sorting
    if (this.searchQuery.trim()) {
      this.performSearch(0, this.pageSize); // Reset to first page on sort change
    } else {
      this.loadEmployeesWithSort(0, this.pageSize);
    }
  }

  /**
   * Load employees with sorting
   * @param page Page number (0-based)
   * @param size Page size
   */
  loadEmployeesWithSort(page: number = 0, size: number = this.pageSize): void {
    console.log('Loading employees with sort - page:', page, 'size:', size, 'sortBy:', this.sortBy, 'direction:', this.sortDirection);
    this.isLoading = true;
    this.loadError = null;
    
    // Get all employees and apply client-side sorting and pagination
    this.adminservice.getAllEmployees().subscribe({
      next: (employees: Employee[]) => {
        console.log('Raw employees data received for sorting:', employees);
        
        if (employees && Array.isArray(employees)) {
          // Apply client-side sorting if sortBy is specified
          let sortedEmployees = employees;
          if (this.sortBy) {
            sortedEmployees = this.sortEmployeesClientSide(employees, this.sortBy, this.sortDirection);
          }
          
          // Handle client-side pagination
          this.totalElements = sortedEmployees.length;
          this.totalPages = Math.ceil(sortedEmployees.length / this.pageSize);
          this.currentPage = page;
          
          // Apply client-side pagination
          const startIndex = page * this.pageSize;
          const endIndex = startIndex + this.pageSize;
          this.employee = sortedEmployees.slice(startIndex, endIndex);
          
          // Update legacy pagination properties
          this.p = this.currentPage + 1;
          this.count = this.pageSize;
          
          console.log('Processed sorted employees:', {
            total: this.totalElements,
            totalPages: this.totalPages,
            currentPage: this.currentPage,
            displayedEmployees: this.employee.length,
            sortBy: this.sortBy,
            sortDirection: this.sortDirection
          });
        } else {
          console.warn('Invalid employees data received for sorting:', employees);
          this.employee = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.currentPage = 0;
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading employees with sort:', error);
        this.isLoading = false;
        this.employee = [];
        this.totalElements = 0;
        this.totalPages = 0;
        
        // Handle specific error types
        if (error.status === 0) {
          this.loadError = 'Unable to connect to the server. Please check your connection and try again.';
        } else if (error.status >= 500) {
          this.loadError = 'Server error occurred. Please try again later.';
        } else {
          this.loadError = 'An error occurred while loading employees. Please try again.';
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Client-side sorting of employees
   * @param employees Array of employees to sort
   * @param sortBy Field to sort by
   * @param sortDirection Sort direction
   * @returns Sorted array of employees
   */
  private sortEmployeesClientSide(employees: Employee[], sortBy: string, sortDirection: 'asc' | 'desc'): Employee[] {
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
        case 'empId':
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
   * Get sort icon for a field
   * @param field Field name
   * @returns CSS class for sort icon
   */
  getSortIcon(field: string): string {
    if (this.sortBy !== field) {
      return 'fas fa-sort text-muted';
    }
    return this.sortDirection === 'asc' ? 'fas fa-sort-up text-primary' : 'fas fa-sort-down text-primary';
  }

  /**
   * Get human-readable label for sort field
   * @param field Field name
   * @returns Human-readable label
   */
  getSortFieldLabel(field: string): string {
    const fieldMap: { [key: string]: string } = {
      'empId': 'Employee ID',
      'empName': 'Name',
      'role': 'Designation',
      'phoneNo': 'Phone Number',
      'joiningDate': 'Date of Joining',
      'email': 'Email',
      'salary': 'Salary'
    };
    return fieldMap[field] || field;
  }

  /**
   * Track by function for ngFor to improve performance
   * @param index Index of the item
   * @param employee Employee object
   * @returns Unique identifier for the employee
   */
  trackByEmployeeId(index: number, employee: Employee): number | null {
    return employee.empId;
  }

  /**
   * Get visible page numbers for pagination
   * @returns Array of page numbers to display
   */
  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const totalPages = this.totalPages;
    const currentPage = this.currentPage + 1; // Convert to 1-based
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate start and end pages
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Adjust start page if we're near the end
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  /**
   * Expose Math object to template
   */
  Math = Math;

  viewEmployee(empId: any) {
    // For now, let's show an alert with employee details
    // In a real application, you'd want to show a modal or navigate to a details page
    const employee = this.employee.find(emp => emp.empId === empId);
    if (employee) {
      const details = `
Employee Details:
- ID: ${employee.empId}
- Name: ${employee.empName}
- Email: ${employee.email}
- Phone: ${employee.phoneNo}
- Role: ${employee.role}
- Salary: ₹${employee.salary?.toLocaleString()}
- Address: ${employee.address}
- Joining Date: ${employee.joiningDate}
- Gender: ${employee.gender}
- Department: ${employee.department?.deptName || 'N/A'}
      `;
      alert(details);
    } else {
      alert('Employee details not found.');
    }
  }

  updateEmployee(empId:any){
    console.log('Update employee clicked with ID:', empId);
    if (!empId) {
      alert('Error: Invalid employee ID');
      return;
    }
    this.router.navigate(['updateemployeeurl',empId]);
  }

  deleteEmployee(empId: any, empName: any) {
    console.log('=== DELETE EMPLOYEE ATTEMPT ===');
    console.log('Employee ID:', empId);
    console.log('Employee Name:', empName);
    
    if (!empId) {
      alert('Error: Invalid employee ID');
      return;
    }
    
    // Simple confirmation dialog
    if (!confirm(`Are you sure you want to delete employee "${empName}" (ID: ${empId})?\n\nThis action cannot be undone.`)) {
      console.log('Delete cancelled by user');
      return;
    }
    
    console.log('User confirmed deletion, proceeding...');
    this.isLoading = true;
    this.loadError = null;
    
    // Create the delete request with proper headers
    const deleteUrl = `http://localhost:8082/employee/api/delete/${empId}`;
    console.log('Delete URL:', deleteUrl);
    
    // Use direct HTTP call with explicit success/error handling
    this.adminservice.httpclient.delete(deleteUrl, { 
      observe: 'response',  // Get full response including status
      responseType: 'text'  // Expect text response to avoid JSON parsing issues
    }).subscribe({
      next: (response) => {
        console.log('=== DELETE SUCCESS ===');
        console.log('Full response:', response);
        console.log('Status code:', response.status);
        console.log('Response body:', response.body);
        
        // Check if the status is actually successful
        if (response.status === 200 || response.status === 204) {
          this.isLoading = false;
          alert(`✅ Employee "${empName}" has been deleted successfully!`);
          console.log('Refreshing employee list...');
          this.loadEmployees();
        } else {
          console.log('Unexpected status code:', response.status);
          this.handleDeleteError(response.status, 'Unexpected response status');
        }
      },
      error: (error) => {
        console.log('=== DELETE ERROR ===');
        console.error('Delete failed:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error type:', error.type);
        console.error('Full error object:', error);
        
        this.isLoading = false;
        
        // Handle the error based on status code
        if (error.status === 200) {
          // This is the bug - status 200 should not be an error
          console.log('Status 200 incorrectly treated as error - treating as success');
          alert(`✅ Employee "${empName}" has been deleted successfully!`);
          this.loadEmployees();
        } else {
          this.handleDeleteError(error.status, error.message);
        }
      }
    });
  }
  
  private handleDeleteError(status: number, message: string) {
    let errorMessage = 'Failed to delete employee. ';
    
    switch (status) {
      case 404:
        errorMessage += 'Employee not found.';
        break;
      case 409:
        errorMessage += 'Cannot delete employee due to existing dependencies (leaves, payslips, etc.).';
        break;
      case 0:
        errorMessage += 'Unable to connect to server.';
        break;
      case 500:
        errorMessage += 'Internal server error.';
        break;
      default:
        errorMessage += `Server error (${status}): ${message}`;
        break;
    }
    
    alert(`❌ ${errorMessage}`);
    this.loadError = errorMessage;
    this.cdr.detectChanges();
  }

  onDeleteConfirmed(confirmed: boolean) {
    if (confirmed && !this.deleteConfirmationData.hasDependencies) {
      const empId = this.deleteConfirmationData.employee.empId;
      if (empId === null) {
        console.error('Employee ID is null');
        return;
      }
      
      // Proceed with deletion
      this.adminservice.deleteEmployeeById(empId).subscribe({
        next: () => {
          this.refreshEmployees(); // Use the new pagination method
          this.showDeleteDialog = false;
          this.deleteError = null;
          this.cdr.detectChanges();
          
          // Show success message
          alert(`Employee ${this.deleteConfirmationData.employee.empName} has been deleted successfully.`);
        },
        error: (error) => {
          console.error('Delete failed:', error);
          this.showDeleteDialog = false;
          
          // Handle specific error types
          if (error.type === 'dependency_error') {
            this.deleteError = error.message;
          } else if (error.type === 'not_found') {
            this.deleteError = 'Employee not found. It may have already been deleted.';
          } else if (error.type === 'connection_error') {
            this.deleteError = 'Unable to connect to the server. Please check your connection and try again.';
          } else {
            this.deleteError = 'An error occurred while deleting the employee. Please try again.';
          }
          
          alert(this.deleteError);
          this.cdr.detectChanges();
        }
      });
    }
  }

  onDeleteCancelled() {
    this.showDeleteDialog = false;
    this.deleteError = null;
    this.cdr.detectChanges();
  }

   logout() {
    
    localStorage.clear();
    this.router.navigate(['loginurl']);
  }


}
