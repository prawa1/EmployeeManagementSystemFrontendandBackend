package com.example.demo.service;

import java.util.List;
import java.util.Map;

/**
 * Service interface for handling data migration and validation operations
 */
public interface DataMigrationService {
    
    /**
     * Performs complete department data migration and validation
     * @return Migration result with status and details
     */
    MigrationResult performDepartmentMigration();
    
    /**
     * Validates all employee-department relationships
     * @return Validation result with details
     */
    ValidationResult validateEmployeeDepartmentRelationships();
    
    /**
     * Populates department table with common departments if empty
     * @return Number of departments created
     */
    int populateDefaultDepartments();
    
    /**
     * Updates employees with null or invalid department references
     * @return Number of employees updated
     */
    int updateEmployeesWithInvalidDepartments();
    
    /**
     * Gets summary of employee distribution across departments
     * @return Map of department name to employee count
     */
    Map<String, Integer> getDepartmentEmployeeSummary();
    
    /**
     * Migration result class
     */
    class MigrationResult {
        private boolean success;
        private String message;
        private int employeesUpdated;
        private int departmentsCreated;
        private List<String> validationErrors;
        
        public MigrationResult(boolean success, String message, int employeesUpdated, int departmentsCreated, List<String> validationErrors) {
            this.success = success;
            this.message = message;
            this.employeesUpdated = employeesUpdated;
            this.departmentsCreated = departmentsCreated;
            this.validationErrors = validationErrors;
        }
        
        // Getters
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public int getEmployeesUpdated() { return employeesUpdated; }
        public int getDepartmentsCreated() { return departmentsCreated; }
        public List<String> getValidationErrors() { return validationErrors; }
    }
    
    /**
     * Validation result class
     */
    class ValidationResult {
        private boolean valid;
        private List<String> errors;
        private Map<String, Object> statistics;
        
        public ValidationResult(boolean valid, List<String> errors, Map<String, Object> statistics) {
            this.valid = valid;
            this.errors = errors;
            this.statistics = statistics;
        }
        
        // Getters
        public boolean isValid() { return valid; }
        public List<String> getErrors() { return errors; }
        public Map<String, Object> getStatistics() { return statistics; }
    }
}