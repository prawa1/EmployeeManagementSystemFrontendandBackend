package com.example.demo.dto;

import java.math.BigDecimal;

import com.example.demo.model.Payslip;

/**
 * Data Transfer Object for Payslip API responses.
 * This DTO matches the frontend PayslipData interface structure exactly.
 */
public class PayslipResponseDTO {
    
    private int empId;
    private String empName;
    private String department;
    private String month;
    private String year;
    
    // Earnings
    private double basicPay;
    private double hra;
    private double medicalAllowance;
    private double transportAllowance;
    private double otherAllowances;
    private double grossSalary;
    
    // Deductions
    private double pf;
    private double esi;
    private double taxDeductions;
    private double otherDeductions;
    private double totalDeductions;
    
    // Net Salary
    private double netSalary;
    
    // Default constructor
    public PayslipResponseDTO() {
    }
    
    // Constructor with all fields
    public PayslipResponseDTO(int empId, String empName, String department, String month, String year,
                             double basicPay, double hra, double medicalAllowance, double transportAllowance,
                             double otherAllowances, double grossSalary, double pf, double esi,
                             double taxDeductions, double otherDeductions, double totalDeductions, double netSalary) {
        this.empId = empId;
        this.empName = empName;
        this.department = department;
        this.month = month;
        this.year = year;
        this.basicPay = basicPay;
        this.hra = hra;
        this.medicalAllowance = medicalAllowance;
        this.transportAllowance = transportAllowance;
        this.otherAllowances = otherAllowances;
        this.grossSalary = grossSalary;
        this.pf = pf;
        this.esi = esi;
        this.taxDeductions = taxDeductions;
        this.otherDeductions = otherDeductions;
        this.totalDeductions = totalDeductions;
        this.netSalary = netSalary;
    }
    
    // Utility constructor from Payslip entity with enhanced null-safety
    public PayslipResponseDTO(Payslip payslip) {
        if (payslip != null && payslip.getEmployee() != null) {
            this.empId = payslip.getEmployee().getEmpId();
            this.empName = payslip.getEmployee().getEmpName() != null ? 
                          payslip.getEmployee().getEmpName() : "Unknown Employee";
            
            // Enhanced department handling with graceful degradation
            this.department = getDepartmentNameSafely(payslip.getEmployee());
            
            this.month = payslip.getMonth() != null ? payslip.getMonth() : "Unknown";
            this.year = payslip.getYear() != null ? payslip.getYear() : "Unknown";
            this.basicPay = convertBigDecimalToDouble(payslip.getBasicPay());
            this.hra = convertBigDecimalToDouble(payslip.getHra());
            this.medicalAllowance = convertBigDecimalToDouble(payslip.getMedicalAllowance());
            this.transportAllowance = convertBigDecimalToDouble(payslip.getTransportAllowance());
            this.otherAllowances = convertBigDecimalToDouble(payslip.getOtherAllowances());
            this.grossSalary = convertBigDecimalToDouble(payslip.getGrossSalary());
            this.pf = convertBigDecimalToDouble(payslip.getPf());
            this.esi = convertBigDecimalToDouble(payslip.getEsi());
            this.taxDeductions = convertBigDecimalToDouble(payslip.getTaxDeductions());
            this.otherDeductions = convertBigDecimalToDouble(payslip.getOtherDeductions());
            this.totalDeductions = convertBigDecimalToDouble(payslip.getTotalDeductions());
            this.netSalary = convertBigDecimalToDouble(payslip.getNetSalary());
        } else {
            // Initialize with default values if payslip or employee is null
            this.empId = 0;
            this.empName = "Unknown Employee";
            this.department = "Department Not Assigned";
            this.month = "Unknown";
            this.year = "Unknown";
            this.basicPay = 0.0;
            this.hra = 0.0;
            this.medicalAllowance = 0.0;
            this.transportAllowance = 0.0;
            this.otherAllowances = 0.0;
            this.grossSalary = 0.0;
            this.pf = 0.0;
            this.esi = 0.0;
            this.taxDeductions = 0.0;
            this.otherDeductions = 0.0;
            this.totalDeductions = 0.0;
            this.netSalary = 0.0;
        }
    }
    
    // Utility method to safely convert BigDecimal to double
    private double convertBigDecimalToDouble(BigDecimal value) {
        return value != null ? value.doubleValue() : 0.0;
    }
    
    /**
     * Safely extracts department name from employee with graceful degradation
     * @param employee The employee object
     * @return Safe department name with fallback handling
     */
    private String getDepartmentNameSafely(com.example.demo.model.Employee employee) {
        if (employee == null) {
            return "Department Not Assigned";
        }
        
        try {
            com.example.demo.model.Department department = employee.getDepartment();
            
            if (department == null) {
                return "Department Not Assigned";
            }
            
            String departmentName = department.getDeptName();
            
            if (departmentName == null || departmentName.trim().isEmpty()) {
                return "Department Not Assigned";
            }
            
            return departmentName.trim();
            
        } catch (Exception ex) {
            // Log error but don't break the DTO creation
            System.err.println("Error extracting department name for employee " + 
                employee.getEmpId() + ": " + ex.getMessage());
            return "Department Not Assigned";
        }
    }
    
    // Static factory method for creating DTO from Payslip entity
    public static PayslipResponseDTO fromPayslip(Payslip payslip) {
        return new PayslipResponseDTO(payslip);
    }
    
    // Getters and Setters
    public int getEmpId() {
        return empId;
    }
    
    public void setEmpId(int empId) {
        this.empId = empId;
    }
    
    public String getEmpName() {
        return empName;
    }
    
    public void setEmpName(String empName) {
        this.empName = empName;
    }
    
    public String getDepartment() {
        return department;
    }
    
    public void setDepartment(String department) {
        this.department = department;
    }
    
    public String getMonth() {
        return month;
    }
    
    public void setMonth(String month) {
        this.month = month;
    }
    
    public String getYear() {
        return year;
    }
    
    public void setYear(String year) {
        this.year = year;
    }
    
    public double getBasicPay() {
        return basicPay;
    }
    
    public void setBasicPay(double basicPay) {
        this.basicPay = basicPay;
    }
    
    public double getHra() {
        return hra;
    }
    
    public void setHra(double hra) {
        this.hra = hra;
    }
    
    public double getMedicalAllowance() {
        return medicalAllowance;
    }
    
    public void setMedicalAllowance(double medicalAllowance) {
        this.medicalAllowance = medicalAllowance;
    }
    
    public double getTransportAllowance() {
        return transportAllowance;
    }
    
    public void setTransportAllowance(double transportAllowance) {
        this.transportAllowance = transportAllowance;
    }
    
    public double getOtherAllowances() {
        return otherAllowances;
    }
    
    public void setOtherAllowances(double otherAllowances) {
        this.otherAllowances = otherAllowances;
    }
    
    public double getGrossSalary() {
        return grossSalary;
    }
    
    public void setGrossSalary(double grossSalary) {
        this.grossSalary = grossSalary;
    }
    
    public double getPf() {
        return pf;
    }
    
    public void setPf(double pf) {
        this.pf = pf;
    }
    
    public double getEsi() {
        return esi;
    }
    
    public void setEsi(double esi) {
        this.esi = esi;
    }
    
    public double getTaxDeductions() {
        return taxDeductions;
    }
    
    public void setTaxDeductions(double taxDeductions) {
        this.taxDeductions = taxDeductions;
    }
    
    public double getOtherDeductions() {
        return otherDeductions;
    }
    
    public void setOtherDeductions(double otherDeductions) {
        this.otherDeductions = otherDeductions;
    }
    
    public double getTotalDeductions() {
        return totalDeductions;
    }
    
    public void setTotalDeductions(double totalDeductions) {
        this.totalDeductions = totalDeductions;
    }
    
    public double getNetSalary() {
        return netSalary;
    }
    
    public void setNetSalary(double netSalary) {
        this.netSalary = netSalary;
    }
    
    @Override
    public String toString() {
        return "PayslipResponseDTO{" +
                "empId=" + empId +
                ", empName='" + empName + '\'' +
                ", department='" + department + '\'' +
                ", month='" + month + '\'' +
                ", year='" + year + '\'' +
                ", basicPay=" + basicPay +
                ", hra=" + hra +
                ", medicalAllowance=" + medicalAllowance +
                ", transportAllowance=" + transportAllowance +
                ", otherAllowances=" + otherAllowances +
                ", grossSalary=" + grossSalary +
                ", pf=" + pf +
                ", esi=" + esi +
                ", taxDeductions=" + taxDeductions +
                ", otherDeductions=" + otherDeductions +
                ", totalDeductions=" + totalDeductions +
                ", netSalary=" + netSalary +
                '}';
    }
}