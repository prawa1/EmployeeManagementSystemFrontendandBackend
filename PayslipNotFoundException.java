package com.example.demo.exception;

/**
 * Custom exception for payslip not found scenarios.
 * Thrown when payslip data is not available for an employee.
 */
public class PayslipNotFoundException extends RuntimeException {
    
    private int employeeId;
    private String month;
    private String year;
    
    /**
     * Constructor for general payslip not found exception
     * @param employeeId The employee ID for which payslip was not found
     */
    public PayslipNotFoundException(int employeeId) {
        super("No payslip data found for employee ID: " + employeeId);
        this.employeeId = employeeId;
    }
    
    /**
     * Constructor for specific period payslip not found exception
     * @param employeeId The employee ID
     * @param month The month for which payslip was not found
     * @param year The year for which payslip was not found
     */
    public PayslipNotFoundException(int employeeId, String month, String year) {
        super("No payslip data found for employee ID: " + employeeId + " for " + month + " " + year);
        this.employeeId = employeeId;
        this.month = month;
        this.year = year;
    }
    
    /**
     * Constructor with custom message
     * @param message Custom error message
     */
    public PayslipNotFoundException(String message) {
        super(message);
    }
    
    // Getters
    public int getEmployeeId() {
        return employeeId;
    }
    
    public String getMonth() {
        return month;
    }
    
    public String getYear() {
        return year;
    }
}