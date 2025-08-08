package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Data Transfer Object for Employee Settings Update requests.
 * This DTO handles validation for employee name and phone number updates.
 */
public class EmployeeSettingsUpdateDTO {
    
    @Size(min = 2, max = 30, message = "Name must be between 2 and 30 characters")
    @Pattern(regexp = "^[a-zA-Z\\s\\-']+$", message = "Name can only contain letters, spaces, hyphens, and apostrophes")
    private String empName;
    
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phoneNo;
    
    /**
     * Validates that at least one field is provided for update
     */
    public boolean hasValidUpdate() {
        return (empName != null && !empName.trim().isEmpty()) || 
               (phoneNo != null && !phoneNo.trim().isEmpty());
    }
    
    // Default constructor
    public EmployeeSettingsUpdateDTO() {
    }
    
    // Constructor with parameters
    public EmployeeSettingsUpdateDTO(String empName, String phoneNo) {
        this.empName = empName;
        this.phoneNo = phoneNo;
    }
    
    // Getters and Setters
    public String getEmpName() {
        return empName;
    }
    
    public void setEmpName(String empName) {
        this.empName = empName;
    }
    
    public String getPhoneNo() {
        return phoneNo;
    }
    
    public void setPhoneNo(String phoneNo) {
        this.phoneNo = phoneNo;
    }
    
    @Override
    public String toString() {
        return "EmployeeSettingsUpdateDTO{" +
                "empName='" + empName + '\'' +
                ", phoneNo='" + phoneNo + '\'' +
                '}';
    }
}