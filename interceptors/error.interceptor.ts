import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Enhanced error interface for better error handling
 */
export interface EnhancedError extends Error {
  type: string;
  status: number;
  originalError?: any;
  validationErrors?: string[];
  dependencies?: string[];
}

/**
 * HTTP Error Interceptor for global error handling
 * Implements comprehensive error handling for different HTTP status codes
 * and provides user-friendly error messages for common failure scenarios
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  /**
   * Intercepts HTTP requests and handles errors globally
   * @param req HTTP request
   * @param next HTTP handler
   * @returns Observable<HttpEvent<any>>
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        return this.handleError(error);
      })
    );
  }

  /**
   * Handles different types of HTTP errors and provides enhanced error information
   * @param error HTTP error response
   * @returns Observable<never> Throws enhanced error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    let errorType = 'general';
    let validationErrors: string[] = [];

    // Handle different HTTP status codes
    switch (error.status) {
      case 0:
        errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
        errorType = 'network_error';
        break;

      case 400:
        errorMessage = this.extractValidationErrors(error);
        errorType = 'validation_error';
        validationErrors = this.getValidationErrorsList(error);
        break;

      case 401:
        errorMessage = 'Session expired or invalid credentials. Please login again.';
        errorType = 'session_expired';
        break;

      case 403:
        errorMessage = 'Access denied. You do not have permission to perform this action.';
        errorType = 'access_denied';
        break;

      case 404:
        errorMessage = this.getNotFoundMessage(error);
        errorType = 'not_found';
        break;

      case 409:
        errorMessage = this.getConflictMessage(error);
        errorType = 'conflict';
        break;

      case 422:
        errorMessage = 'The submitted data could not be processed. Please check your input.';
        errorType = 'unprocessable_entity';
        validationErrors = this.getValidationErrorsList(error);
        break;

      case 429:
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
        errorType = 'rate_limit';
        break;

      case 500:
        errorMessage = 'Internal server error. Please try again later or contact support.';
        errorType = 'server_error';
        break;

      case 502:
        errorMessage = 'Bad gateway. The server is temporarily unavailable.';
        errorType = 'bad_gateway';
        break;

      case 503:
        errorMessage = 'Service temporarily unavailable. Please try again in a few minutes.';
        errorType = 'service_unavailable';
        break;

      case 504:
        errorMessage = 'Gateway timeout. The request took too long to process.';
        errorType = 'gateway_timeout';
        break;

      default:
        if (error.status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
          errorType = 'server_error';
        } else if (error.status >= 400) {
          errorMessage = 'Client error occurred. Please check your request.';
          errorType = 'client_error';
        }
        break;
    }

    // Handle timeout errors specifically
    if (error.message?.includes('timeout') || (error as any).name === 'TimeoutError') {
      errorMessage = 'Request timed out. Please check your connection and try again.';
      errorType = 'timeout';
    }

    // Create enhanced error object
    const enhancedError = new Error(errorMessage) as EnhancedError;
    enhancedError.type = errorType;
    enhancedError.status = error.status;
    enhancedError.originalError = error;
    
    if (validationErrors.length > 0) {
      enhancedError.validationErrors = validationErrors;
    }

    // Log error for debugging (in development)
    if (!this.isProduction()) {
      console.error('HTTP Error Intercepted:', {
        status: error.status,
        message: errorMessage,
        type: errorType,
        url: error.url,
        originalError: error
      });
    }

    return throwError(() => enhancedError);
  }

  /**
   * Extracts validation error messages from HTTP error response
   * @param error HTTP error response
   * @returns string Formatted error message
   */
  private extractValidationErrors(error: HttpErrorResponse): string {
    let message = 'Invalid data provided. Please check your input.';

    if (error.error) {
      if (typeof error.error === 'string') {
        // Handle string error messages
        message = this.getSpecificValidationMessage(error.error);
      } else if (error.error.message) {
        // Handle error objects with message property
        message = error.error.message;
      } else if (error.error.errors) {
        // Handle validation errors array
        if (Array.isArray(error.error.errors)) {
          message = error.error.errors.join('; ');
        } else if (typeof error.error.errors === 'object') {
          // Handle field-specific validation errors
          const fieldErrors = Object.values(error.error.errors).flat();
          message = fieldErrors.join('; ');
        }
      } else if (error.error.validationErrors) {
        // Handle custom validation errors
        message = error.error.validationErrors.join('; ');
      }
    }

    return message;
  }

  /**
   * Gets specific validation error messages based on error content
   * @param errorString Error string from server
   * @returns string Specific error message
   */
  private getSpecificValidationMessage(errorString: string): string {
    const lowerError = errorString.toLowerCase();

    if (lowerError.includes('email')) {
      if (lowerError.includes('format') || lowerError.includes('invalid')) {
        return 'Please provide a valid email address format.';
      } else if (lowerError.includes('exists') || lowerError.includes('duplicate')) {
        return 'An employee with this email address already exists.';
      }
      return 'Email validation failed. Please check the email address.';
    }

    if (lowerError.includes('phone')) {
      if (lowerError.includes('format') || lowerError.includes('invalid')) {
        return 'Phone number must be exactly 10 digits.';
      } else if (lowerError.includes('exists') || lowerError.includes('duplicate')) {
        return 'An employee with this phone number already exists.';
      }
      return 'Phone number validation failed. Please check the phone number.';
    }

    if (lowerError.includes('salary')) {
      return 'Salary must be a positive number greater than 0.';
    }

    if (lowerError.includes('department')) {
      return 'Please select a valid department.';
    }

    if (lowerError.includes('name')) {
      return 'Employee name must be at least 2 characters long.';
    }

    if (lowerError.includes('password')) {
      return 'Password does not meet the required criteria.';
    }

    return errorString;
  }

  /**
   * Gets validation errors as an array
   * @param error HTTP error response
   * @returns string[] Array of validation errors
   */
  private getValidationErrorsList(error: HttpErrorResponse): string[] {
    const errors: string[] = [];

    if (error.error) {   
      if (typeof error.error === 'string') {
        errors.push(this.getSpecificValidationMessage(error.error));
      } else if (error.error.errors) {
        if (Array.isArray(error.error.errors)) {
          errors.push(...error.error.errors);
        } else if (typeof error.error.errors === 'object') {
          Object.values(error.error.errors).forEach(fieldErrors => {
            if (Array.isArray(fieldErrors)) {
              errors.push(...fieldErrors);
            } else {
              errors.push(String(fieldErrors));
            }
          });
        }
      } else if (error.error.validationErrors) {
        errors.push(...error.error.validationErrors);
      } else if (error.error.message) {
        errors.push(error.error.message);
      }
    }

    return errors.length > 0 ? errors : ['Validation failed. Please check your input.'];
  }

  /**
   * Gets specific not found error message based on URL
   * @param error HTTP error response
   * @returns string Specific not found message
   */
  private getNotFoundMessage(error: HttpErrorResponse): string {
    const url = error.url?.toLowerCase() || '';

    if (url.includes('employee')) {
      return 'Employee not found. The employee may have been deleted or does not exist.';
    }

    if (url.includes('department')) {
      return 'Department not found. Please select a valid department.';
    }

    if (url.includes('leave')) {
      return 'Leave request not found. The leave request may have been processed or deleted.';
    }

    if (url.includes('payslip')) {
      return 'Payslip not found. The payslip may not be generated yet.';
    }

    return 'The requested resource was not found. It may have been moved or deleted.';
  }

  /**
   * Gets specific conflict error message based on error content
   * @param error HTTP error response
   * @returns string Specific conflict message
   */
  private getConflictMessage(error: HttpErrorResponse): string {
    if (error.error && typeof error.error === 'string') {
      const lowerError = error.error.toLowerCase();

      if (lowerError.includes('email')) {
        return 'An employee with this email address already exists.';
      }

      if (lowerError.includes('phone')) {
        return 'An employee with this phone number already exists.';
      }

      if (lowerError.includes('dependencies') || lowerError.includes('dependent')) {
        return 'Cannot delete this record because it has dependent data (leaves, payslips, etc.).';
      }
    }

    return 'Data conflict occurred. The resource already exists or has dependencies.';
  }

  /**
   * Checks if the application is running in production mode
   * @returns boolean True if in production
   */
  private isProduction(): boolean {
    // This would typically check environment configuration
    // For now, we'll use a simple check
    return window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('127.0.0.1') &&
           !window.location.hostname.includes('dev');
  }
}