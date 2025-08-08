import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Adminservice, DashboardData } from '../../services/adminservice';
import { RetryDialogService } from '../../services/retry-dialog.service';
import { ConnectionService } from '../../services/connection.service';
import { Subscription, timer } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-admindashboard',
  standalone: false,
  templateUrl: './admindashboard.html',
  styleUrl: './admindashboard.css'
})
export class Admindashboard implements OnInit, OnDestroy {

  // Dashboard data properties
  totalEmployees: number = 0;
  pendingLeaves: number = 0;
  lastUpdated: Date | null = null;
  
  // UI state properties
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  isConnectionHealthy: boolean = true;
  
  // Subscription management
  private dashboardSubscription?: Subscription;
  private refreshSubscription?: Subscription;

  constructor(
    private router: Router,
    private adminService: Adminservice,
    private retryDialogService: RetryDialogService,
    private connectionService: ConnectionService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.checkConnectionHealth();
    // Set up periodic refresh every 5 minutes
    this.setupPeriodicRefresh();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.dashboardSubscription) {
      this.dashboardSubscription.unsubscribe();
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  /**
   * Load dashboard data from the service with retry functionality
   */
  loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    // Use retry operation with user control for dashboard data loading
    const operation = () => this.adminService.getDashboardData();
    const userRetryCallback = this.retryDialogService.createUserRetryCallback('Load Dashboard Data');

    this.dashboardSubscription = this.adminService.retryWithUserControl(operation, userRetryCallback).subscribe({
      next: (data: DashboardData) => {
        this.totalEmployees = data.totalEmployees;
        this.pendingLeaves = data.pendingLeaves;
        this.lastUpdated = data.lastUpdated;
        this.isLoading = false;
        this.isConnectionHealthy = true;
        
        if (data.error) {
          this.hasError = true;
          this.errorMessage = data.error;
        }
      },
      error: (error: any) => {
        console.error('Failed to load dashboard data after retry attempts:', error);
        this.isLoading = false;
        this.hasError = true;
        this.isConnectionHealthy = false;
        this.handleConnectionError(error);
      }
    });
  }

  /**
   * Refresh dashboard data manually
   */
  refreshDashboard(): void {
    this.loadDashboardData();
  }

  /**
   * Set up periodic refresh of dashboard data
   */
  private setupPeriodicRefresh(): void {
    // Refresh every 5 minutes (300000 ms)
    this.refreshSubscription = timer(300000, 300000).subscribe(() => {
      if (!this.isLoading) {
        this.loadDashboardData();
      }
    });
  }

  /**
   * Check database connection health
   */
  checkConnectionHealth(): void {
    this.isConnectionHealthy = this.adminService.isConnectionHealthy();
  }

  /**
   * Handle connection errors with user-friendly messages
   */
  handleConnectionError(error: any): void {
    this.isConnectionHealthy = false;
    
    switch (error.type) {
      case 'connection_error':
        this.errorMessage = 'Unable to connect to the database. Please check your internet connection.';
        break;
      case 'timeout':
        this.errorMessage = 'Request timed out. The server may be busy. Please try again.';
        break;
      case 'server_error':
        this.errorMessage = 'Server error occurred. Please try again later.';
        break;
      case 'dashboard_refresh_error':
        this.errorMessage = error.message;
        break;
      default:
        this.errorMessage = 'An unexpected error occurred while loading dashboard data.';
    }
  }

  /**
   * Retry loading dashboard data after error
   */
  retryLoadData(): void {
    this.hasError = false;
    this.errorMessage = '';
    this.loadDashboardData();
  }

  /**
   * Test connection with timeout handling
   */
  testConnectionWithTimeout(): void {
    this.isLoading = true;
    
    // Use connection service with custom timeout (10 seconds)
    const operation = () => this.connectionService.testConnection();
    
    this.connectionService.retryOperation(operation, 10000, 2).subscribe({
      next: (isHealthy) => {
        this.isLoading = false;
        this.isConnectionHealthy = isHealthy;
        
        if (isHealthy) {
          this.errorMessage = '';
          this.hasError = false;
          // Refresh dashboard data if connection is healthy
          this.loadDashboardData();
        } else {
          this.hasError = true;
          this.errorMessage = 'Connection test failed. Please check your network connection.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.isConnectionHealthy = false;
        this.hasError = true;
        
        if (error.type === 'timeout') {
          this.errorMessage = 'Connection test timed out. The server may be unreachable.';
        } else if (error.type === 'max_retries_exceeded') {
          this.errorMessage = 'Connection test failed after multiple attempts. Please check your network.';
        } else {
          this.errorMessage = 'Connection test failed. Please try again.';
        }
      }
    });
  }

  /**
   * Load dashboard data with user retry option for network errors
   */
  loadDashboardDataWithUserRetry(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    const operation = () => this.adminService.getDashboardData();
    
    // Create user retry callback that shows different dialogs based on error type
    const userRetryCallback = (error: any, attemptNumber: number) => {
      if (error.name === 'TimeoutError' || error.type === 'timeout') {
        return this.retryDialogService.showTimeoutRetryDialog('Load Dashboard Data', 30000);
      } else if (error.status === 0 || error.type === 'network_error') {
        return this.retryDialogService.showNetworkErrorDialog('Load Dashboard Data', error);
      } else {
        return this.retryDialogService.showSimpleRetryDialog('Load Dashboard Data', error);
      }
    };

    this.dashboardSubscription = this.adminService.retryWithUserControl(operation, userRetryCallback).subscribe({
      next: (data: DashboardData) => {
        this.totalEmployees = data.totalEmployees;
        this.pendingLeaves = data.pendingLeaves;
        this.lastUpdated = data.lastUpdated;
        this.isLoading = false;
        this.isConnectionHealthy = true;
        
        if (data.error) {
          this.hasError = true;
          this.errorMessage = data.error;
        }
      },
      error: (error: any) => {
        console.error('Failed to load dashboard data after user retry:', error);
        this.isLoading = false;
        this.hasError = true;
        this.isConnectionHealthy = false;
        this.handleConnectionError(error);
      }
    });
  }

  /**
   * Queue dashboard data loading for when connection is restored
   */
  queueDashboardDataLoad(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = 'Operation queued. Will execute when connection is restored...';

    const operation = () => this.adminService.getDashboardData();
    
    this.dashboardSubscription = this.adminService.queueOperation(operation).subscribe({
      next: (data: DashboardData) => {
        this.totalEmployees = data.totalEmployees;
        this.pendingLeaves = data.pendingLeaves;
        this.lastUpdated = data.lastUpdated;
        this.isLoading = false;
        this.isConnectionHealthy = true;
        this.errorMessage = '';
        
        if (data.error) {
          this.hasError = true;
          this.errorMessage = data.error;
        }
      },
      error: (error: any) => {
        console.error('Queued dashboard data load failed:', error);
        this.isLoading = false;
        this.hasError = true;
        this.isConnectionHealthy = false;
        this.handleConnectionError(error);
      }
    });
  }

  // ===== NAVIGATION METHODS =====

  /**
   * Navigate to employee registration
   */
  navigateToRegister(): void {
    this.router.navigate(['adminregisterurl']);
  }

  /**
   * Navigate to employee list/view
   */
  navigateToEmployeeList(): void {
    this.router.navigate(['viewemployeeurl']);
  }

  /**
   * Navigate to leave management
   */
  navigateToLeaveManagement(): void {
    this.router.navigate(['manageleaveurl']);
  }



  /**
   * Logout and clear session
   */
  logout(): void {
    localStorage.clear();
    this.router.navigate(['loginurl']);
  }

  // ===== UTILITY METHODS =====

  /**
   * Get formatted last updated time
   */
  getFormattedLastUpdated(): string {
    if (!this.lastUpdated) {
      return 'Never';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - this.lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Get connection status text
   */
  getConnectionStatus(): string {
    return this.isConnectionHealthy ? 'Connected' : 'Disconnected';
  }

  /**
   * Get connection status CSS class
   */
  getConnectionStatusClass(): string {
    return this.isConnectionHealthy ? 'text-success' : 'text-danger';
  }
}
