package com.example.demo.exception;

import java.util.HashMap;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ResponseStatus(HttpStatus.BAD_REQUEST)
	@ExceptionHandler(ResourceNotFoundException.class)
	public HashMap<String,String> handleException(ResourceNotFoundException ex)
	{
		HashMap<String,String> errorList = new HashMap<>();
		errorList.put("errorMessage", ex.getMessage());//Student studentId 5 not found 
		return errorList;
	}
	

	
	// Payslip-specific exception handlers
	
	/**
	 * Handle EmployeeNotFoundException - Requirement 4.1
	 * Returns HTTP 404 with error message "Employee not found"
	 */
	@ExceptionHandler(EmployeeNotFoundException.class)
	public ResponseEntity<HashMap<String, String>> handleEmployeeNotFoundException(EmployeeNotFoundException ex) {
		logger.error("Employee not found: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("error", "Employee not found");
		errorResponse.put("message", ex.getMessage());
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		
		return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
	}
	
	/**
	 * Handle PayslipNotFoundException - Requirement 4.2
	 * Returns HTTP 404 with error message "No payslip data found for this employee"
	 */
	@ExceptionHandler(PayslipNotFoundException.class)
	public ResponseEntity<HashMap<String, String>> handlePayslipNotFoundException(PayslipNotFoundException ex) {
		logger.error("Payslip not found: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("error", "No payslip data found for this employee");
		errorResponse.put("message", ex.getMessage());
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		
		return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
	}
	
	/**
	 * Handle InvalidEmployeeIdException - Requirement 4.4
	 * Returns HTTP 400 with error message "Invalid employee ID format"
	 */
	@ExceptionHandler(InvalidEmployeeIdException.class)
	public ResponseEntity<HashMap<String, String>> handleInvalidEmployeeIdException(InvalidEmployeeIdException ex) {
		logger.error("Invalid employee ID format: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("error", "Invalid employee ID format");
		errorResponse.put("message", ex.getMessage());
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		
		return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
	}
	
	/**
	 * Handle PayslipCalculationException
	 * Returns HTTP 500 with error message "Internal server error"
	 */
	@ExceptionHandler(PayslipCalculationException.class)
	public ResponseEntity<HashMap<String, String>> handlePayslipCalculationException(PayslipCalculationException ex) {
		logger.error("Payslip calculation error: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("error", "Internal server error");
		errorResponse.put("message", "Error occurred during payslip calculation");
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		
		return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
	}
	
	/**
	 * Handle DataAccessException - Requirement 4.3
	 * Returns HTTP 500 with error message "Internal server error"
	 */
	@ExceptionHandler(DataAccessException.class)
	public ResponseEntity<HashMap<String, String>> handleDataAccessException(DataAccessException ex) {
		logger.error("Database connection/access error: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("error", "Internal server error");
		errorResponse.put("message", "Database connection failed");
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		
		return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
	}
	
	/**
	 * Handle generic RuntimeException for payslip-related operations
	 * Returns HTTP 500 with error message "Internal server error"
	 */
	@ExceptionHandler(RuntimeException.class)
	public ResponseEntity<HashMap<String, String>> handleRuntimeException(RuntimeException ex) {
		logger.error("Runtime exception occurred: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("error", "Internal server error");
		errorResponse.put("message", "An unexpected error occurred");
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		
		return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
	}
	
	/**
	 * Handle DepartmentDataException - Department-related data issues
	 * Returns HTTP 422 with error message about department data problems
	 */
	@ExceptionHandler(DepartmentDataException.class)
	public ResponseEntity<HashMap<String, String>> handleDepartmentDataException(DepartmentDataException ex) {
		logger.error("Department data issue: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("error", "Department data issue");
		errorResponse.put("message", ex.getMessage());
		errorResponse.put("employeeId", ex.getEmployeeId() != null ? ex.getEmployeeId().toString() : "unknown");
		errorResponse.put("departmentId", ex.getDepartmentId() != null ? ex.getDepartmentId().toString() : "unknown");
		errorResponse.put("issueType", ex.getIssueType() != null ? ex.getIssueType() : "unknown");
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		
		return new ResponseEntity<>(errorResponse, HttpStatus.UNPROCESSABLE_ENTITY);
	}
	
	/**
	 * Handle DataIntegrityViolationException - for duplicate phone numbers and constraint violations
	 * Returns HTTP 409 with specific error message for phone number duplicates
	 */
	@ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
	public ResponseEntity<HashMap<String, String>> handleDataIntegrityViolationException(
			org.springframework.dao.DataIntegrityViolationException ex) {
		logger.error("Data integrity violation: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		errorResponse.put("status", "409");
		errorResponse.put("path", "/employee/api/settings");
		
		// Check if it's a phone number duplicate error
		String message = ex.getMessage();
		if (message != null && (message.contains("phone") || message.contains("phoneNo") || 
				message.contains("UK_") || message.contains("unique"))) {
			errorResponse.put("error", "Phone number already exists");
			errorResponse.put("message", "This phone number is already in use. Please choose a different number.");
			
			// Add field-specific error for frontend
			HashMap<String, String> fieldErrors = new HashMap<>();
			fieldErrors.put("phoneNo", "Phone number must be unique");
			errorResponse.put("fieldErrors", fieldErrors.toString());
		} else {
			errorResponse.put("error", "Data constraint violation");
			errorResponse.put("message", "The provided data violates database constraints");
		}
		
		return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
	}
	
	/**
	 * Enhanced MethodArgumentNotValidException handler for employee settings validation
	 * Returns HTTP 400 with detailed field-level validation errors
	 */
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<HashMap<String, Object>> handleValidationException(MethodArgumentNotValidException ex) {
		logger.error("Validation failed: {}", ex.getMessage());
		
		HashMap<String, Object> errorResponse = new HashMap<>();
		HashMap<String, String> fieldErrors = new HashMap<>();
		
		// Extract field-level validation errors
		List<FieldError> errors = ex.getBindingResult().getFieldErrors();
		for (FieldError error : errors) {
			String fieldName = error.getField();
			String errorMessage = error.getDefaultMessage();
			
			// Customize error messages for better user experience
			if ("empName".equals(fieldName)) {
				if (errorMessage.contains("blank")) {
					errorMessage = "Name cannot be empty";
				} else if (errorMessage.contains("size") || errorMessage.contains("characters")) {
					errorMessage = "Name must be between 2 and 30 characters";
				}
			} else if ("phoneNo".equals(fieldName)) {
				if (errorMessage.contains("blank")) {
					errorMessage = "Phone number cannot be empty";
				} else if (errorMessage.contains("digits") || errorMessage.contains("10")) {
					errorMessage = "Phone number must be exactly 10 digits";
				}
			}
			
			fieldErrors.put(fieldName, errorMessage);
		}
		
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		errorResponse.put("status", "400");
		errorResponse.put("error", "Validation Failed");
		errorResponse.put("message", "Invalid input data provided");
		errorResponse.put("path", "/employee/api/settings");
		errorResponse.put("fieldErrors", fieldErrors);
		
		return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
	}
	
	/**
	 * Handle IllegalArgumentException - for custom validation errors
	 * Returns HTTP 400 with specific validation error message
	 */
	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<HashMap<String, String>> handleIllegalArgumentException(IllegalArgumentException ex) {
		logger.error("Illegal argument: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		errorResponse.put("status", "400");
		errorResponse.put("error", "Invalid input");
		errorResponse.put("message", ex.getMessage());
		errorResponse.put("path", "/employee/api/settings");
		
		return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
	}
	
	/**
	 * Handle generic Exception - Requirement 4.5
	 * Returns HTTP 500 with error message "Internal server error"
	 * Logs detailed error information for debugging
	 */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<HashMap<String, String>> handleGenericException(Exception ex) {
		logger.error("Unexpected exception occurred: {}", ex.getMessage(), ex);
		
		HashMap<String, String> errorResponse = new HashMap<>();
		errorResponse.put("error", "Internal server error");
		errorResponse.put("message", "An unexpected system error occurred");
		errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
		
		return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
	}
	 }

