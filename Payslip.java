package com.example.demo.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "payslip_table", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id", "payslip_month", "payslip_year"}))
public class Payslip {
    
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "payslip_seq")
    @SequenceGenerator(name = "payslip_seq", sequenceName = "payslip_sequence_table", allocationSize = 1, initialValue = 1)
    @Column(name = "payslip_id")
    private Long payslipId;
    
    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    @NotNull(message = "Employee is required")
    private Employee employee;
    
    @Column(name = "payslip_month", nullable = false, length = 20)
    @NotNull(message = "Month is required")
    @Size(min = 3, max = 20, message = "Month must be between 3 and 20 characters")
    private String month;
    
    @Column(name = "payslip_year", nullable = false, length = 4)
    @NotNull(message = "Year is required")
    @Size(min = 4, max = 4, message = "Year must be 4 characters")
    private String year;
    
    // Earnings
    @Column(name = "basic_pay", precision = 10, scale = 2, nullable = false)
    @NotNull(message = "Basic pay is required")
    @DecimalMin(value = "0.0", message = "Basic pay must be non-negative")
    private BigDecimal basicPay;
    
    @Column(name = "hra", precision = 10, scale = 2, nullable = false)
    @NotNull(message = "HRA is required")
    @DecimalMin(value = "0.0", message = "HRA must be non-negative")
    private BigDecimal hra;
    
    @Column(name = "medical_allowance", precision = 10, scale = 2, nullable = false)
    @NotNull(message = "Medical allowance is required")
    @DecimalMin(value = "0.0", message = "Medical allowance must be non-negative")
    private BigDecimal medicalAllowance;
    
    @Column(name = "transport_allowance", precision = 10, scale = 2, nullable = false)
    @NotNull(message = "Transport allowance is required")
    @DecimalMin(value = "0.0", message = "Transport allowance must be non-negative")
    private BigDecimal transportAllowance;
    
    @Column(name = "other_allowances", precision = 10, scale = 2, nullable = false)
    @DecimalMin(value = "0.0", message = "Other allowances must be non-negative")
    private BigDecimal otherAllowances = BigDecimal.ZERO;
    
    @Column(name = "gross_salary", precision = 10, scale = 2, nullable = false)
    @NotNull(message = "Gross salary is required")
    @DecimalMin(value = "0.0", message = "Gross salary must be non-negative")
    private BigDecimal grossSalary;
    
    // Deductions
    @Column(name = "pf", precision = 10, scale = 2, nullable = false)
    @NotNull(message = "PF is required")
    @DecimalMin(value = "0.0", message = "PF must be non-negative")
    private BigDecimal pf;
    
    @Column(name = "esi", precision = 10, scale = 2, nullable = false)
    @DecimalMin(value = "0.0", message = "ESI must be non-negative")
    private BigDecimal esi = BigDecimal.ZERO;
    
    @Column(name = "tax_deductions", precision = 10, scale = 2, nullable = false)
    @DecimalMin(value = "0.0", message = "Tax deductions must be non-negative")
    private BigDecimal taxDeductions = BigDecimal.ZERO;
    
    @Column(name = "other_deductions", precision = 10, scale = 2, nullable = false)
    @DecimalMin(value = "0.0", message = "Other deductions must be non-negative")
    private BigDecimal otherDeductions = BigDecimal.ZERO;
    
    @Column(name = "total_deductions", precision = 10, scale = 2, nullable = false)
    @NotNull(message = "Total deductions is required")
    @DecimalMin(value = "0.0", message = "Total deductions must be non-negative")
    private BigDecimal totalDeductions;
    
    @Column(name = "net_salary", precision = 10, scale = 2, nullable = false)
    @NotNull(message = "Net salary is required")
    @DecimalMin(value = "0.0", message = "Net salary must be non-negative")
    private BigDecimal netSalary;
    
    @Column(name = "created_date", nullable = false)
    private LocalDateTime createdDate;
    
    // Default constructor
    public Payslip() {
    }
    
    // Constructor with required fields
    public Payslip(Employee employee, String month, String year) {
        this.employee = employee;
        this.month = month;
        this.year = year;
    }
    
    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getPayslipId() {
        return payslipId;
    }
    
    public void setPayslipId(Long payslipId) {
        this.payslipId = payslipId;
    }
    
    public Employee getEmployee() {
        return employee;
    }
    
    public void setEmployee(Employee employee) {
        this.employee = employee;
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
    
    public BigDecimal getBasicPay() {
        return basicPay;
    }
    
    public void setBasicPay(BigDecimal basicPay) {
        this.basicPay = basicPay;
    }
    
    public BigDecimal getHra() {
        return hra;
    }
    
    public void setHra(BigDecimal hra) {
        this.hra = hra;
    }
    
    public BigDecimal getMedicalAllowance() {
        return medicalAllowance;
    }
    
    public void setMedicalAllowance(BigDecimal medicalAllowance) {
        this.medicalAllowance = medicalAllowance;
    }
    
    public BigDecimal getTransportAllowance() {
        return transportAllowance;
    }
    
    public void setTransportAllowance(BigDecimal transportAllowance) {
        this.transportAllowance = transportAllowance;
    }
    
    public BigDecimal getOtherAllowances() {
        return otherAllowances;
    }
    
    public void setOtherAllowances(BigDecimal otherAllowances) {
        this.otherAllowances = otherAllowances;
    }
    
    public BigDecimal getGrossSalary() {
        return grossSalary;
    }
    
    public void setGrossSalary(BigDecimal grossSalary) {
        this.grossSalary = grossSalary;
    }
    
    public BigDecimal getPf() {
        return pf;
    }
    
    public void setPf(BigDecimal pf) {
        this.pf = pf;
    }
    
    public BigDecimal getEsi() {
        return esi;
    }
    
    public void setEsi(BigDecimal esi) {
        this.esi = esi;
    }
    
    public BigDecimal getTaxDeductions() {
        return taxDeductions;
    }
    
    public void setTaxDeductions(BigDecimal taxDeductions) {
        this.taxDeductions = taxDeductions;
    }
    
    public BigDecimal getOtherDeductions() {
        return otherDeductions;
    }
    
    public void setOtherDeductions(BigDecimal otherDeductions) {
        this.otherDeductions = otherDeductions;
    }
    
    public BigDecimal getTotalDeductions() {
        return totalDeductions;
    }
    
    public void setTotalDeductions(BigDecimal totalDeductions) {
        this.totalDeductions = totalDeductions;
    }
    
    public BigDecimal getNetSalary() {
        return netSalary;
    }
    
    public void setNetSalary(BigDecimal netSalary) {
        this.netSalary = netSalary;
    }
    
    public LocalDateTime getCreatedDate() {
        return createdDate;
    }
    
    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }
    
    @Override
    public String toString() {
        return "Payslip{" +
                "payslipId=" + payslipId +
                ", employee=" + (employee != null ? employee.getEmpId() : null) +
                ", month='" + month + '\'' +
                ", year='" + year + '\'' +
                ", basicPay=" + basicPay +
                ", grossSalary=" + grossSalary +
                ", totalDeductions=" + totalDeductions +
                ", netSalary=" + netSalary +
                ", createdDate=" + createdDate +
                '}';
    }
}