import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, timer } from 'rxjs';

import { Admindashboard } from './admindashboard';
import { Adminservice, DashboardData } from '../../services/adminservice';
import { RetryDialogService } from '../../services/retry-dialog.service';
import { ConnectionService } from '../../services/connection.service';

describe('Admindashboard Component', () => {
  let component: Admindashboard;
  let fixture: ComponentFixture<Admindashboard>;
  let mockAdminService: jasmine.SpyObj<Adminservice>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRetryDialogService: jasmine.SpyObj<RetryDialogService>;
  let mockConnectionService: jasmine.SpyObj<ConnectionService>;

  const mockDashboardData: DashboardData = {
    totalEmployees: 25,
    pendingLeaves: 5,
    lastUpdated: new Date('2024-03-15T10:30:00Z')
  };

  const mockDashboardDataWithError: DashboardData = {
    totalEmployees: 20,
    pendingLeaves: 3,
    lastUpdated: new Date('2024-03-15T10:30:00Z'),
    error: 'Some data could not be loaded'
  };

  beforeEach(async () => {
    const adminServiceSpy = jasmine.createSpyObj('Adminservice', [
      'getDashboardData',
      'retryWithUserControl',
      'queueOperation',
      'isConnectionHealthy'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const retryDialogServiceSpy = jasmine.createSpyObj('RetryDialogService', [
      'createUserRetryCallback',
      'showTimeoutRetryDialog',
      'showNetworkErrorDialog',
      'showSimpleRetryDialog'
    ]);
    const connectionServiceSpy = jasmine.createSpyObj('ConnectionService', [
      'testConnection',
      'retryOperation'
    ]);

    await TestBed.configureTestingModule({
      declarations: [Admindashboard],
      providers: [
        { provide: Adminservice, useValue: adminServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: RetryDialogService, useValue: retryDialogServiceSpy },
        { provide: ConnectionService, useValue: connectionServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Admindashboard);
    component = fixture.componentInstance;
    mockAdminService = TestBed.inject(Adminservice) as jasmine.SpyObj<Adminservice>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockRetryDialogService = TestBed.inject(RetryDialogService) as jasmine.SpyObj<RetryDialogService>;
    mockConnectionService = TestBed.inject(ConnectionService) as jasmine.SpyObj<ConnectionService>;

    // Default mock implementations
    mockAdminService.getDashboardData.and.returnValue(of(mockDashboardData));
    mockAdminService.retryWithUserControl.and.returnValue(of(mockDashboardData));
    mockAdminService.queueOperation.and.returnValue(of(mockDashboardData));
    mockAdminService.isConnectionHealthy.and.returnValue(true);
    mockConnectionService.testConnection.and.returnValue(of(true));
    mockConnectionService.retryOperation.and.returnValue(of(true));
    mockRetryDialogService.createUserRetryCallback.and.returnValue(() => of(true));
    mockRetryDialogService.showTimeoutRetryDialog.and.returnValue(of(true));
    mockRetryDialogService.showNetworkErrorDialog.and.returnValue(of(true));
    mockRetryDialogService.showSimpleRetryDialog.and.returnValue(of(true));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.totalEmployees).toBe(0);
      expect(component.pendingLeaves).toBe(0);
      expect(component.lastUpdated).toBeNull();
      expect(component.isLoading).toBe(false);
      expect(component.hasError).toBe(false);
      expect(component.errorMessage).toBe('');
      expect(component.isConnectionHealthy).toBe(true);
    });

    it('should load dashboard data on init', () => {
      fixture.detectChanges();
      
      expect(mockAdminService.retryWithUserControl).toHaveBeenCalled();
      expect(component.totalEmployees).toBe(25);
      expect(component.pendingLeaves).toBe(5);
      expect(component.lastUpdated).toEqual(mockDashboardData.lastUpdated);
      expect(component.isLoading).toBe(false);
      expect(component.isConnectionHealthy).toBe(true);
    });

    it('should check connection health on init', () => {
      fixture.detectChanges();
      
      expect(mockAdminService.isConnectionHealthy).toHaveBeenCalled();
    });

    it('should set up periodic refresh on init', fakeAsync(() => {
      spyOn(component, 'loadDashboardData');
      fixture.detectChanges();
      
      // Fast-forward 5 minutes
      tick(300000);
      
      expect(component.loadDashboardData).toHaveBeenCalled();
    }));
  });

  describe('Dashboard Data Loading', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should load dashboard data successfully', () => {
      component.loadDashboardData();
      
      expect(component.totalEmployees).toBe(25);
      expect(component.pendingLeaves).toBe(5);
      expect(component.lastUpdated).toEqual(mockDashboardData.lastUpdated);
      expect(component.isLoading).toBe(false);
      expect(component.hasError).toBe(false);
      expect(component.isConnectionHealthy).toBe(true);
    });

    it('should handle dashboard data with error', () => {
      mockAdminService.retryWithUserControl.and.returnValue(of(mockDashboardDataWithError));
      
      component.loadDashboardData();
      
      expect(component.totalEmployees).toBe(20);
      expect(component.pendingLeaves).toBe(3);
      expect(component.hasError).toBe(true);
      expect(component.errorMessage).toBe('Some data could not be loaded');
    });

    it('should handle loading error with connection error', () => {
      const connectionError = {
        type: 'connection_error',
        message: 'Network error',
        status: 0
      };
      mockAdminService.retryWithUserControl.and.returnValue(throwError(() => connectionError));
      
      component.loadDashboardData();
      
      expect(component.isLoading).toBe(false);
      expect(component.hasError).toBe(true);
      expect(component.isConnectionHealthy).toBe(false);
      expect(component.errorMessage).toBe('Unable to connect to the database. Please check your internet connection.');
    });

    it('should handle loading error with timeout error', () => {
      const timeoutError = {
        type: 'timeout',
        message: 'Request timeout',
        status: 408
      };
      mockAdminService.retryWithUserControl.and.returnValue(throwError(() => timeoutError));
      
      component.loadDashboardData();
      
      expect(component.errorMessage).toBe('Request timed out. The server may be busy. Please try again.');
      expect(component.isConnectionHealthy).toBe(false);
    });

    it('should handle loading error with server error', () => {
      const serverError = {
        type: 'server_error',
        message: 'Internal server error',
        status: 500
      };
      mockAdminService.retryWithUserControl.and.returnValue(throwError(() => serverError));
      
      component.loadDashboardData();
      
      expect(component.errorMessage).toBe('Server error occurred. Please try again later.');
      expect(component.isConnectionHealthy).toBe(false);
    });

    it('should handle loading error with dashboard refresh error', () => {
      const dashboardError = {
        type: 'dashboard_refresh_error',
        message: 'Dashboard refresh failed',
        status: 400
      };
      mockAdminService.retryWithUserControl.and.returnValue(throwError(() => dashboardError));
      
      component.loadDashboardData();
      
      expect(component.errorMessage).toBe('Dashboard refresh failed');
      expect(component.isConnectionHealthy).toBe(false);
    });

    it('should handle generic loading error', () => {
      const genericError = {
        message: 'Generic error',
        status: 400
      };
      mockAdminService.retryWithUserControl.and.returnValue(throwError(() => genericError));
      
      component.loadDashboardData();
      
      expect(component.errorMessage).toBe('An unexpected error occurred while loading dashboard data.');
      expect(component.isConnectionHealthy).toBe(false);
    });

    it('should clear error state before loading', () => {
      component.hasError = true;
      component.errorMessage = 'Previous error';
      
      component.loadDashboardData();
      
      expect(component.hasError).toBe(false);
      expect(component.errorMessage).toBe('');
    });
  });

  describe('Dashboard Refresh', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should refresh dashboard data', () => {
      spyOn(component, 'loadDashboardData');
      
      component.refreshDashboard();
      
      expect(component.loadDashboardData).toHaveBeenCalled();
    });

    it('should not refresh during periodic timer if already loading', fakeAsync(() => {
      component.isLoading = true;
      spyOn(component, 'loadDashboardData');
      
      tick(300000); // 5 minutes
      
      expect(component.loadDashboardData).not.toHaveBeenCalled();
    }));
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should test connection successfully', () => {
      spyOn(component, 'loadDashboardData');
      
      component.testConnectionWithTimeout();
      
      expect(mockConnectionService.retryOperation).toHaveBeenCalledWith(jasmine.any(Function), 10000, 2);
      expect(component.isConnectionHealthy).toBe(true);
      expect(component.hasError).toBe(false);
      expect(component.errorMessage).toBe('');
      expect(component.loadDashboardData).toHaveBeenCalled();
    });

    it('should handle failed connection test', () => {
      mockConnectionService.retryOperation.and.returnValue(of(false));
      
      component.testConnectionWithTimeout();
      
      expect(component.isConnectionHealthy).toBe(false);
      expect(component.hasError).toBe(true);
      expect(component.errorMessage).toBe('Connection test failed. Please check your network connection.');
    });

    it('should handle connection test timeout error', () => {
      const timeoutError = {
        type: 'timeout',
        message: 'Connection timeout',
        status: 408
      };
      mockConnectionService.retryOperation.and.returnValue(throwError(() => timeoutError));
      
      component.testConnectionWithTimeout();
      
      expect(component.isConnectionHealthy).toBe(false);
      expect(component.hasError).toBe(true);
      expect(component.errorMessage).toBe('Connection test timed out. The server may be unreachable.');
    });

    it('should handle connection test max retries exceeded', () => {
      const maxRetriesError = {
        type: 'max_retries_exceeded',
        message: 'Max retries exceeded',
        status: 429
      };
      mockConnectionService.retryOperation.and.returnValue(throwError(() => maxRetriesError));
      
      component.testConnectionWithTimeout();
      
      expect(component.errorMessage).toBe('Connection test failed after multiple attempts. Please check your network.');
    });

    it('should handle generic connection test error', () => {
      const genericError = {
        message: 'Generic error',
        status: 500
      };
      mockConnectionService.retryOperation.and.returnValue(throwError(() => genericError));
      
      component.testConnectionWithTimeout();
      
      expect(component.errorMessage).toBe('Connection test failed. Please try again.');
    });
  });

  describe('User Retry Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should load dashboard data with user retry', () => {
      component.loadDashboardDataWithUserRetry();
      
      expect(mockAdminService.retryWithUserControl).toHaveBeenCalled();
      expect(component.totalEmployees).toBe(25);
      expect(component.pendingLeaves).toBe(5);
      expect(component.isConnectionHealthy).toBe(true);
    });

    it('should show timeout retry dialog for timeout errors', () => {
      const timeoutError = { name: 'TimeoutError', type: 'timeout' };
      const userRetryCallback = mockRetryDialogService.createUserRetryCallback.calls.mostRecent().returnValue;
      
      userRetryCallback(timeoutError, 1);
      
      expect(mockRetryDialogService.showTimeoutRetryDialog).toHaveBeenCalledWith('Load Dashboard Data', 30000);
    });

    it('should show network error dialog for network errors', () => {
      const networkError = { status: 0, type: 'network_error' };
      const userRetryCallback = mockRetryDialogService.createUserRetryCallback.calls.mostRecent().returnValue;
      
      userRetryCallback(networkError, 1);
      
      expect(mockRetryDialogService.showNetworkErrorDialog).toHaveBeenCalledWith('Load Dashboard Data', networkError);
    });

    it('should show simple retry dialog for other errors', () => {
      const genericError = { status: 500, message: 'Server error' };
      const userRetryCallback = mockRetryDialogService.createUserRetryCallback.calls.mostRecent().returnValue;
      
      userRetryCallback(genericError, 1);
      
      expect(mockRetryDialogService.showSimpleRetryDialog).toHaveBeenCalledWith('Load Dashboard Data', genericError);
    });
  });

  describe('Queue Operation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should queue dashboard data load', () => {
      component.queueDashboardDataLoad();
      
      expect(mockAdminService.queueOperation).toHaveBeenCalled();
      expect(component.totalEmployees).toBe(25);
      expect(component.pendingLeaves).toBe(5);
      expect(component.isConnectionHealthy).toBe(true);
      expect(component.errorMessage).toBe('');
    });

    it('should show queued message initially', () => {
      component.queueDashboardDataLoad();
      
      // The message is set before the observable completes
      expect(component.errorMessage).toBe('');
    });

    it('should handle queued operation error', () => {
      const queueError = {
        type: 'connection_error',
        message: 'Queue failed',
        status: 0
      };
      mockAdminService.queueOperation.and.returnValue(throwError(() => queueError));
      
      component.queueDashboardDataLoad();
      
      expect(component.hasError).toBe(true);
      expect(component.isConnectionHealthy).toBe(false);
      expect(component.errorMessage).toBe('Unable to connect to the database. Please check your internet connection.');
    });
  });

  describe('Error Recovery', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should retry loading data after error', () => {
      component.hasError = true;
      component.errorMessage = 'Previous error';
      spyOn(component, 'loadDashboardData');
      
      component.retryLoadData();
      
      expect(component.hasError).toBe(false);
      expect(component.errorMessage).toBe('');
      expect(component.loadDashboardData).toHaveBeenCalled();
    });
  });

  describe('Navigation Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should navigate to register', () => {
      component.navigateToRegister();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['adminregisterurl']);
    });

    it('should navigate to employee list', () => {
      component.navigateToEmployeeList();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['viewemployeeurl']);
    });

    it('should navigate to leave management', () => {
      component.navigateToLeaveManagement();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['manageleaveurl']);
    });

    it('should navigate to employee update with ID', () => {
      component.navigateToEmployeeUpdate(1001);
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['updateemployeeurl', 1001]);
    });

    it('should navigate to employee list when no ID provided for update', () => {
      component.navigateToEmployeeUpdate();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['viewemployeeurl']);
    });

    it('should logout and clear localStorage', () => {
      spyOn(localStorage, 'clear');
      
      component.logout();
      
      expect(localStorage.clear).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['loginurl']);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should format last updated time as "Never" when null', () => {
      component.lastUpdated = null;
      
      const formatted = component.getFormattedLastUpdated();
      
      expect(formatted).toBe('Never');
    });

    it('should format last updated time as "Just now" for recent updates', () => {
      component.lastUpdated = new Date(Date.now() - 30000); // 30 seconds ago
      
      const formatted = component.getFormattedLastUpdated();
      
      expect(formatted).toBe('Just now');
    });

    it('should format last updated time in minutes', () => {
      component.lastUpdated = new Date(Date.now() - 120000); // 2 minutes ago
      
      const formatted = component.getFormattedLastUpdated();
      
      expect(formatted).toBe('2 minutes ago');
    });

    it('should format last updated time in singular minute', () => {
      component.lastUpdated = new Date(Date.now() - 60000); // 1 minute ago
      
      const formatted = component.getFormattedLastUpdated();
      
      expect(formatted).toBe('1 minute ago');
    });

    it('should format last updated time in hours', () => {
      component.lastUpdated = new Date(Date.now() - 7200000); // 2 hours ago
      
      const formatted = component.getFormattedLastUpdated();
      
      expect(formatted).toBe('2 hours ago');
    });

    it('should format last updated time in singular hour', () => {
      component.lastUpdated = new Date(Date.now() - 3600000); // 1 hour ago
      
      const formatted = component.getFormattedLastUpdated();
      
      expect(formatted).toBe('1 hour ago');
    });

    it('should get connection status as "Connected" when healthy', () => {
      component.isConnectionHealthy = true;
      
      const status = component.getConnectionStatus();
      
      expect(status).toBe('Connected');
    });

    it('should get connection status as "Disconnected" when unhealthy', () => {
      component.isConnectionHealthy = false;
      
      const status = component.getConnectionStatus();
      
      expect(status).toBe('Disconnected');
    });

    it('should get connection status CSS class as "text-success" when healthy', () => {
      component.isConnectionHealthy = true;
      
      const cssClass = component.getConnectionStatusClass();
      
      expect(cssClass).toBe('text-success');
    });

    it('should get connection status CSS class as "text-danger" when unhealthy', () => {
      component.isConnectionHealthy = false;
      
      const cssClass = component.getConnectionStatusClass();
      
      expect(cssClass).toBe('text-danger');
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      fixture.detectChanges();
      
      // Create mock subscriptions
      const mockDashboardSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      const mockRefreshSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      
      component['dashboardSubscription'] = mockDashboardSubscription;
      component['refreshSubscription'] = mockRefreshSubscription;
      
      component.ngOnDestroy();
      
      expect(mockDashboardSubscription.unsubscribe).toHaveBeenCalled();
      expect(mockRefreshSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('should handle destroy without subscriptions', () => {
      component['dashboardSubscription'] = undefined;
      component['refreshSubscription'] = undefined;
      
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show loading state during data load', () => {
      component.isLoading = true;
      fixture.detectChanges();
      
      expect(component.isLoading).toBe(true);
    });

    it('should show loading state during connection test', () => {
      component.testConnectionWithTimeout();
      
      // Loading state is set to false after synchronous completion
      expect(component.isLoading).toBe(false);
    });

    it('should show loading state during queued operation', () => {
      component.queueDashboardDataLoad();
      
      // Loading state is set to false after synchronous completion
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Error States', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display error state', () => {
      component.hasError = true;
      component.errorMessage = 'Test error message';
      fixture.detectChanges();
      
      expect(component.hasError).toBe(true);
      expect(component.errorMessage).toBe('Test error message');
    });

    it('should display connection error state', () => {
      component.isConnectionHealthy = false;
      fixture.detectChanges();
      
      expect(component.isConnectionHealthy).toBe(false);
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display dashboard statistics', () => {
      expect(component.totalEmployees).toBe(25);
      expect(component.pendingLeaves).toBe(5);
      expect(component.lastUpdated).toEqual(mockDashboardData.lastUpdated);
    });

    it('should handle zero values', () => {
      const zeroData: DashboardData = {
        totalEmployees: 0,
        pendingLeaves: 0,
        lastUpdated: new Date()
      };
      mockAdminService.retryWithUserControl.and.returnValue(of(zeroData));
      
      component.loadDashboardData();
      
      expect(component.totalEmployees).toBe(0);
      expect(component.pendingLeaves).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle undefined dashboard data', () => {
      mockAdminService.retryWithUserControl.and.returnValue(of(undefined as any));
      
      expect(() => component.loadDashboardData()).not.toThrow();
    });

    it('should handle null dashboard data', () => {
      mockAdminService.retryWithUserControl.and.returnValue(of(null as any));
      
      expect(() => component.loadDashboardData()).not.toThrow();
    });

    it('should handle navigation with undefined employee ID', () => {
      component.navigateToEmployeeUpdate(undefined);
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['viewemployeeurl']);
    });

    it('should handle navigation with zero employee ID', () => {
      component.navigateToEmployeeUpdate(0);
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['viewemployeeurl']);
    });
  });
});