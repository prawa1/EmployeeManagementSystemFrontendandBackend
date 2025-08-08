package com.example.demo.exception;

/**
 * Custom exception for invalid employee ID format scenarios.
 * Thrown when the provided employee ID is in an invalid format.
 */
public class InvalidEmployeeIdException extends RuntimeException {
    
    private String invalidId;
    
    /**
     * Constructor for invalid employee ID exception
     * @param invalidId The invalid employee ID that was provided
     */
    public InvalidEmployeeIdException(String invalidId) {
        super("Invalid employee ID format: " + invalidId);
        this.invalidId = invalidId;
    }
    

    
    /**
     * Constructor with invalid ID and custom message
     * @param invalidId The invalid employee ID
     * @param message Custom error message
     */
    public InvalidEmployeeIdException(String invalidId, String message) {
        super(message);
        this.invalidId = invalidId;
    }
    
    // Getter
    public String getInvalidId() {
        return invalidId;
    }
}