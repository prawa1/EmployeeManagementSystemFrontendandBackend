package com.example.demo.exception;

/**
 * Custom exception for payslip calculation errors.
 * Thrown when there are errors during salary calculation or payslip generation.
 */
public class PayslipCalculationException extends RuntimeException {
    
    private int employeeId;
    private String calculationStep;
    
    /**
     * Constructor for payslip calculation exception
     * @param employeeId The employee ID for which calculation failed
     * @param calculationStep The step where calculation failed
     */
    public PayslipCalculationException(int employeeId, String calculationStep) {
        super("Payslip calculation failed for employee ID: " + employeeId + " at step: " + calculationStep);
        this.employeeId = employeeId;
        this.calculationStep = calculationStep;
    }
    
    /**
     * Constructor with custom message
     * @param message Custom error message
     */
    public PayslipCalculationException(String message) {
        super(message);
    }
    
    /**
     * Constructor with cause
     * @param message Error message
     * @param cause The underlying cause
     */
    public PayslipCalculationException(String message, Throwable cause) {
        super(message, cause);
    }
    
    /**
     * Constructor with employee ID, message and cause
     * @param employeeId The employee ID
     * @param message Error message
     * @param cause The underlying cause
     */
    public PayslipCalculationException(int employeeId, String message, Throwable cause) {
        super(message, cause);
        this.employeeId = employeeId;
    }
    
    // Getters
    public int getEmployeeId() {
        return employeeId;
    }
    
    public String getCalculationStep() {
        return calculationStep;
    }
}