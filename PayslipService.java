package com.example.demo.service;

import com.example.demo.dto.PayslipResponseDTO;
import com.example.demo.model.Payslip;

/**
 * Service interface for Payslip operations.
 * Provides methods for payslip calculation, generation, and retrieval.
 */
public interface PayslipService {
    
    /**
     * Get payslip data for an employee (latest available payslip)
     * @param empId Employee ID
     * @return PayslipResponseDTO containing payslip details
     * @throws RuntimeException if employee not found or no payslip data available
     */
    PayslipResponseDTO getPayslipByEmployeeId(int empId);
    
    /**
     * Get payslip data for an employee for a specific month and year
     * @param empId Employee ID
     * @param month Month name (e.g., "January")
     * @param year Year as string (e.g., "2025")
     * @return PayslipResponseDTO containing payslip details
     * @throws RuntimeException if employee not found or no payslip data available
     */
    PayslipResponseDTO getPayslipByEmployeeIdAndPeriod(int empId, String month, String year);
    
    /**
     * Generate and save a new payslip for an employee for a specific month and year
     * @param empId Employee ID
     * @param month Month name (e.g., "January")
     * @param year Year as string (e.g., "2025")
     * @return Generated Payslip entity
     * @throws RuntimeException if employee not found
     */
    Payslip generatePayslipForEmployee(int empId, String month, String year);
    
    /**
     * Calculate and save payslips for all employees for the current month
     * This method can be used for batch processing
     */
    void calculateAndSavePayslips();
}