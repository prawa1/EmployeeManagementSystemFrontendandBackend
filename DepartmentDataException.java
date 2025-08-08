package com.example.demo.exception;

/**
 * Custom exception for department data related issues.
 * Thrown when there are problems with department data integrity or availability.
 */
public class DepartmentDataException extends RuntimeException {
    
    private Integer employeeId;
    private Integer departmentId;
    private String issueType;
    
    /**
     * Constructor for general department data exception
     * @param message Custom error message
     */
    public DepartmentDataException(String message) {
        super(message);
    }
    
    /**
     * Constructor with employee ID and issue type
     * @param employeeId The employee ID with department issues
     * @param issueType The type of department issue
     */
    public DepartmentDataException(Integer employeeId, String issueType) {
        super("Department data issue for employee ID: " + employeeId + " - " + issueType);
        this.employeeId = employeeId;
        this.issueType = issueType;
    }
    
    /**
     * Constructor with employee ID, department ID and issue type
     * @param employeeId The employee ID
     * @param departmentId The department ID with issues
     * @param issueType The type of department issue
     */
    public DepartmentDataException(Integer employeeId, Integer departmentId, String issueType) {
        super("Department data issue for employee ID: " + employeeId + 
              ", department ID: " + departmentId + " - " + issueType);
        this.employeeId = employeeId;
        this.departmentId = departmentId;
        this.issueType = issueType;
    }
    
    /**
     * Constructor with cause
     * @param message Error message
     * @param cause The underlying cause
     */
    public DepartmentDataException(String message, Throwable cause) {
        super(message, cause);
    }
    
    /**
     * Constructor with employee ID, issue type and cause
     * @param employeeId The employee ID
     * @param issueType The type of department issue
     * @param cause The underlying cause
     */
    public DepartmentDataException(Integer employeeId, String issueType, Throwable cause) {
        super("Department data issue for employee ID: " + employeeId + " - " + issueType, cause);
        this.employeeId = employeeId;
        this.issueType = issueType;
    }
    
    // Getters
    public Integer getEmployeeId() {
        return employeeId;
    }
    
    public Integer getDepartmentId() {
        return departmentId;
    }
    
    public String getIssueType() {
        return issueType;
    }
}