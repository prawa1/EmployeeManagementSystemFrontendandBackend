import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Adminservice, Leave } from '../../services/adminservice';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manageleave',
  standalone: false,
  templateUrl: './manageleave.html',
  styleUrl: './manageleave.css'
})
export class Manageleave implements OnInit{
  pendingLeaves: Leave[] = [];
  p: number = 1;
  count: number = 5;
  isLoading: boolean = false;
  errorMessage: string = '';
  connectionError: boolean = false;

  constructor(
    private adminService: Adminservice,
    private cdr: ChangeDetectorRef, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchAllPendingLeaves();
  }

  /**
   * Fetch all pending leave requests with error handling
   */
  fetchAllPendingLeaves(): void {
    console.log('Fetching pending leaves...');
    this.isLoading = true;
    this.errorMessage = '';
    this.connectionError = false;

    this.adminService.getPendingLeaves().subscribe({
      next: (data: any[]) => {
        console.log('Raw pending leaves data from backend:', data);
        
        // Process and normalize the data to match our interface
        this.pendingLeaves = this.normalizeLeaveData(data || []);
        
        console.log('Processed pending leaves:', this.pendingLeaves);
        console.log('First leave object structure:', this.pendingLeaves[0]);
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error fetching pending leaves:', error);
        this.isLoading = false;
        this.handleError(error);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Normalize leave data from backend to match frontend interface
   */
  private normalizeLeaveData(rawData: any[]): Leave[] {
    return rawData.map((leave, index) => {
      console.log(`Processing leave object ${index + 1}:`, leave);
      console.log('Available fields in leave object:', Object.keys(leave));
      
      // Handle different possible field name mappings from backend
      const normalizedLeave: Leave = {
        leaveId: leave.leaveId || leave.id || leave.leave_id || leave.Id || leave.ID,
        employee: leave.employee || {
          empId: leave.employeeId || leave.employee_id || leave.empId || leave.emp_id,
          empName: leave.employeeName || leave.employee_name || leave.empName || leave.emp_name || 'Unknown',
          email: leave.employeeEmail || leave.employee_email || leave.email || '',
          phoneNo: leave.employeePhone || leave.employee_phone || leave.phoneNo || leave.phone_no || '',
          role: leave.employeeRole || leave.employee_role || leave.role || '',
          managerId: 0,
          salary: 0,
          address: '',
          joiningDate: '',
          gender: '',
          department: null
        },
        leaveType: leave.leaveType || leave.leave_type || leave.type || 'General',
        startDate: leave.startDate || leave.start_date || leave.fromDate || leave.from_date || leave.startdate || '',
        endDate: leave.endDate || leave.end_date || leave.toDate || leave.to_date || leave.enddate || '',
        reason: leave.reason || leave.description || leave.leaveReason || leave.leave_reason || '',
        status: leave.status || leave.leaveStatus || leave.leave_status || 'PENDING',
        appliedDate: leave.appliedDate || leave.applied_date || leave.createdDate || leave.created_date || leave.applicationDate || '',
        approvedBy: leave.approvedBy || leave.approved_by || leave.approverId,
        approvedDate: leave.approvedDate || leave.approved_date || leave.approvalDate,
        comments: leave.comments || leave.remarks || leave.adminComments
      };
      
      console.log(`Normalized leave object ${index + 1}:`, normalizedLeave);
      console.log(`Leave ID found: ${normalizedLeave.leaveId}`);
      console.log(`Employee name found: ${normalizedLeave.employee.empName}`);
      
      return normalizedLeave;
    });
  }

  /**
   * Handle errors with user-friendly messages
   */
  private handleError(error: any): void {
    if (error.status === 0) {
      this.connectionError = true;
      this.errorMessage = 'Unable to connect to the server. Please check your connection and try again.';
    } else if (error.status === 500) {
      this.errorMessage = 'Server error occurred. Please try again later.';
    } else {
      this.errorMessage = error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Direct approve leave method
   */
  approveLeave(leave: Leave): void {
    console.log('=== APPROVE LEAVE ATTEMPT ===');
    console.log('Leave object:', leave);
    console.log('Leave ID:', leave.leaveId);
    console.log('Employee:', leave.employee);
    
    if (!leave.leaveId) {
      console.error('Invalid leave ID');
      alert('Error: Invalid leave ID');
      return;
    }
    
    // Show confirmation dialog
    if (!confirm(`Are you sure you want to approve leave request for ${this.getEmployeeName(leave)}?`)) {
      return;
    }
    
    console.log('Calling direct HTTP PUT to approve leave with ID:', leave.leaveId);
    console.log('Backend endpoint will be: http://localhost:8082/leave/api/approve/' + leave.leaveId);
    
    this.isLoading = true;
    this.errorMessage = '';
    
    // Try direct HTTP call first
    const requestBody = { comments: 'Approved by admin' };
    console.log('Request body:', requestBody);
    
    this.adminService.httpclient.put(`http://localhost:8082/leave/api/approve/${leave.leaveId}`, requestBody).subscribe({
      next: (response) => {
        console.log('=== APPROVE SUCCESS ===');
        console.log('Backend response:', response);
        this.isLoading = false;
        alert('✅ Leave request approved successfully!');
        this.fetchAllPendingLeaves(); // Refresh the list
      },
      error: (error) => {
        console.log('=== APPROVE ERROR WITH PUT ===');
        console.error('PUT request failed, trying POST:', error);
        
        // Try POST method if PUT fails
        this.adminService.httpclient.post(`http://localhost:8082/leave/api/approve/${leave.leaveId}`, requestBody).subscribe({
          next: (response) => {
            console.log('=== APPROVE SUCCESS WITH POST ===');
            console.log('Backend response:', response);
            this.isLoading = false;
            alert('✅ Leave request approved successfully!');
            this.fetchAllPendingLeaves(); // Refresh the list
          },
          error: (postError) => {
            console.log('=== APPROVE ERROR WITH POST ===');
            console.error('POST request also failed:', postError);
            
            // Try without request body
            this.adminService.httpclient.put(`http://localhost:8082/leave/api/approve/${leave.leaveId}`, {}).subscribe({
              next: (response) => {
                console.log('=== APPROVE SUCCESS WITHOUT BODY ===');
                console.log('Backend response:', response);
                this.isLoading = false;
                alert('✅ Leave request approved successfully!');
                this.fetchAllPendingLeaves(); // Refresh the list
              },
              error: (finalError) => {
                console.log('=== FINAL APPROVE ERROR ===');
                console.error('All attempts failed:', finalError);
                this.isLoading = false;
                alert(`❌ Failed to approve leave request. Error: ${finalError.status} - ${finalError.statusText || finalError.message}`);
                this.handleError(finalError);
              }
            });
          }
        });
      }
    });
  }

  /**
   * Direct reject leave method
   */
  rejectLeave(leave: Leave): void {
    console.log('Rejecting leave with ID:', leave.leaveId);
    if (!leave.leaveId) {
      console.error('Invalid leave ID');
      alert('Error: Invalid leave ID');
      return;
    }
    
    // Show confirmation dialog
    const reason = prompt(`Please provide a reason for rejecting ${this.getEmployeeName(leave)}'s leave request:`);
    if (reason === null) { // User cancelled
      return;
    }
    if (!reason.trim()) {
      alert('Rejection reason is required.');
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    this.adminService.rejectLeave(leave.leaveId, reason).subscribe({
      next: (response) => {
        console.log('Leave rejected successfully:', response);
        this.isLoading = false;
        alert('✅ Leave request rejected successfully!');
        this.fetchAllPendingLeaves(); // Refresh the list
      },
      error: (error) => {
        console.error('Error rejecting leave:', error);
        this.isLoading = false;
        alert('❌ Failed to reject leave request. Please try again.');
        this.handleError(error);
      }
    });
  }

  /**
   * Retry connection when there's a connection error
   */
  retryConnection(): void {
    this.fetchAllPendingLeaves();
  }

  /**
   * Get formatted date string
   */
  getFormattedDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  /**
   * Get employee name safely
   */
  getEmployeeName(leave: Leave): string {
    return (leave.employee?.empName ? leave.employee.empName.toString() : 'Unknown Employee');
  }

  /**
   * Get employee ID safely
   */
  getEmployeeId(leave: Leave): number | string {
    return leave.employee?.empId || 'N/A';
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['loginurl']);
  }
}