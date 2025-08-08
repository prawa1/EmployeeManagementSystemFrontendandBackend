package com.example.demo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.exception.DepartmentDataException;
import com.example.demo.model.Department;
import com.example.demo.model.Employee;

/**
 * Service for validating and handling department-related data operations.
 * Provides centralized error handling and logging for department data issues.
 */
@Service
public class DepartmentValidationService {
    
    private static final Logger logger = LoggerFactory.getLogger(DepartmentValidationService.class);
    
    // Constants for department fallback values
    public static final String DEFAULT_DEPARTMENT_NAME = "Department Not Assigned";
    public static final String UNKNOWN_DEPARTMENT = "Unknown Department";
    
    /**
     * Validates and safely extracts department name from employee
     * @param employee The employee object
     * @return Safe department name with fallback handling
     */
    public String getSafeDepartmentName(Employee employee) {
        if (employee == null) {
            logger.warn("Employee is null when extracting department name");
            return DEFAULT_DEPARTMENT_NAME;
        }
        
        try {
            Department department = employee.getDepartment();
            
            if (department == null) {
                logger.warn("Employee {} has null department reference", employee.getEmpId());
                logDepartmentIssue(employee.getEmpId(), null, "NULL_DEPARTMENT_REFERENCE");
                return DEFAULT_DEPARTMENT_NAME;
            }
            
            String departmentName = department.getDeptName();
            
            if (departmentName == null || departmentName.trim().isEmpty()) {
                logger.warn("Employee {} has department with null/empty name. Department ID: {}", 
                    employee.getEmpId(), department.getDeptId());
                logDepartmentIssue(employee.getEmpId(), department.getDeptId(), "EMPTY_DEPARTMENT_NAME");
                return DEFAULT_DEPARTMENT_NAME;
            }
            
            // Log successful department name extraction for debugging
            logger.debug("Successfully extracted department name '{}' for employee {}", 
                departmentName, employee.getEmpId());
            
            return departmentName.trim();
            
        } catch (Exception ex) {
            logger.error("Unexpected error extracting department name for employee {}: {}", 
                employee.getEmpId(), ex.getMessage(), ex);
            logDepartmentIssue(employee.getEmpId(), null, "DEPARTMENT_EXTRACTION_ERROR");
            return DEFAULT_DEPARTMENT_NAME;
        }
    }
    
    /**
     * Validates department data integrity for an employee
     * @param employee The employee to validate
     * @throws DepartmentDataException if critical department data issues are found
     */
    public void validateDepartmentData(Employee employee) throws DepartmentDataException {
        if (employee == null) {
            throw new DepartmentDataException("Cannot validate department data for null employee");
        }
        
        Integer empId = employee.getEmpId();
        Department department = employee.getDepartment();
        
        // Check for null department reference
        if (department == null) {
            logger.warn("Employee {} has no department assigned", empId);
            logDepartmentIssue(empId, null, "NULL_DEPARTMENT_VALIDATION");
            // Don't throw exception for null department - this is handled gracefully
            return;
        }
        
        // Check for invalid department ID
        int deptId = department.getDeptId();
        if (deptId <= 0) {
            logger.error("Employee {} has department with invalid ID: {}", empId, deptId);
            logDepartmentIssue(empId, deptId, "INVALID_DEPARTMENT_ID");
            throw new DepartmentDataException(empId, deptId, "Invalid department ID");
        }
        
        // Check for missing department name
        if (department.getDeptName() == null || department.getDeptName().trim().isEmpty()) {
            logger.error("Employee {} has department {} with null/empty name", empId, department.getDeptId());
            logDepartmentIssue(empId, department.getDeptId(), "MISSING_DEPARTMENT_NAME");
            // Don't throw exception - handle gracefully with fallback
        }
        
        logger.debug("Department data validation passed for employee {} with department {}", 
            empId, department.getDeptId());
    }
    
    /**
     * Checks if department data is available and valid
     * @param employee The employee to check
     * @return true if department data is available and valid, false otherwise
     */
    public boolean isDepartmentDataAvailable(Employee employee) {
        if (employee == null) {
            return false;
        }
        
        Department department = employee.getDepartment();
        if (department == null) {
            return false;
        }
        
        return department.getDeptId() > 0 && 
               department.getDeptName() != null && 
               !department.getDeptName().trim().isEmpty();
    }
    
    /**
     * Logs department-related issues for monitoring and debugging
     * @param employeeId The employee ID with the issue
     * @param departmentId The department ID (can be null)
     * @param issueType The type of issue encountered
     */
    public void logDepartmentIssue(Integer employeeId, Integer departmentId, String issueType) {
        try {
            String logMessage = String.format(
                "DEPARTMENT_ISSUE: Employee=%s, Department=%s, Issue=%s", 
                employeeId != null ? employeeId : "unknown",
                departmentId != null ? departmentId : "null",
                issueType != null ? issueType : "unknown"
            );
            
            logger.warn(logMessage);
            
            // Additional structured logging for monitoring systems
            logger.warn("Department issue detected - Employee ID: {}, Department ID: {}, Issue Type: {}", 
                employeeId, departmentId, issueType);
                
        } catch (Exception ex) {
            // Ensure logging errors don't break the main flow
            logger.error("Error logging department issue: {}", ex.getMessage());
        }
    }
    
    /**
     * Handles department data gracefully with fallback logic
     * @param employee The employee object
     * @param context Additional context for logging (e.g., "payslip_generation", "profile_display")
     * @return Safe department name with appropriate fallback
     */
    public String handleDepartmentDataGracefully(Employee employee, String context) {
        if (employee == null) {
            logger.warn("Handling department data for null employee in context: {}", context);
            return DEFAULT_DEPARTMENT_NAME;
        }
        
        try {
            String departmentName = getSafeDepartmentName(employee);
            
            // Log context-specific information
            if (DEFAULT_DEPARTMENT_NAME.equals(departmentName)) {
                logger.info("Using fallback department name for employee {} in context: {}", 
                    employee.getEmpId(), context);
            } else {
                logger.debug("Successfully handled department data for employee {} in context: {} - Department: {}", 
                    employee.getEmpId(), context, departmentName);
            }
            
            return departmentName;
            
        } catch (Exception ex) {
            logger.error("Error handling department data gracefully for employee {} in context {}: {}", 
                employee.getEmpId(), context, ex.getMessage(), ex);
            logDepartmentIssue(employee.getEmpId(), null, "GRACEFUL_HANDLING_ERROR");
            return DEFAULT_DEPARTMENT_NAME;
        }
    }
    
    /**
     * Validates department reference integrity (checks if department exists in database)
     * This method can be extended to include database validation if needed
     * @param departmentId The department ID to validate
     * @return true if department reference is valid, false otherwise
     */
    public boolean isValidDepartmentReference(Integer departmentId) {
        if (departmentId == null || departmentId <= 0) {
            logger.debug("Invalid department ID: {}", departmentId);
            return false;
        }
        
        // For now, just validate the ID format
        // This can be extended to include actual database lookup if needed
        logger.debug("Department ID {} appears to be valid format", departmentId);
        return true;
    }
}