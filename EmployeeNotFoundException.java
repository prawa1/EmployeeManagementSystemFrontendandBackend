package com.example.demo.exception;

/**
 * Custom exception for employee not found scenarios.
 * Thrown when an employee with the specified ID does not exist.
 */
public class EmployeeNotFoundException extends RuntimeException {
    
    private int employeeId;
    
    /**
     * Constructor for employee not found exception
     * @param employeeId The employee ID that was not found
     */
    public EmployeeNotFoundException(int employeeId) {
        super("Employee not found with ID: " + employeeId);
        this.employeeId = employeeId;
    }
    
    /**
     * Constructor with custom message
     * @param message Custom error message
     */
    public EmployeeNotFoundException(String message) {
        super(message);
    }
    
    /**
     * Constructor with employee ID and custom message
     * @param employeeId The employee ID that was not found
     * @param message Custom error message
     */
    public EmployeeNotFoundException(int employeeId, String message) {
        super(message);
        this.employeeId = employeeId;
    }
    
    // Getter
    public int getEmployeeId() {
        return employeeId;
    }
}