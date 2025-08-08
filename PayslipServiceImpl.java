package com.example.demo.serviceimpl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dto.PayslipResponseDTO;
import com.example.demo.exception.DepartmentDataException;
import com.example.demo.exception.EmployeeNotFoundException;
import com.example.demo.exception.PayslipCalculationException;
import com.example.demo.exception.PayslipNotFoundException;
import com.example.demo.model.Employee;
import com.example.demo.model.Payslip;
import com.example.demo.repository.EmployeeRepository;
import com.example.demo.repository.PayslipRepository;
import com.example.demo.service.DepartmentValidationService;
import com.example.demo.service.PayslipService;

/**
 * Implementation of PayslipService with salary calculation logic.
 * Implements all salary calculation formulas as per requirements 3.1-3.10.
 */
@Service
@Transactional
public class PayslipServiceImpl implements PayslipService {
    
    private static final Logger logger = LoggerFactory.getLogger(PayslipServiceImpl.class);
    
    @Autowired
    private PayslipRepository payslipRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private DepartmentValidationService departmentValidationService;
    
    // Salary calculation constants as per requirements
    private static final BigDecimal BASIC_PAY_PERCENTAGE = new BigDecimal("0.60"); // 60% of total salary
    private static final BigDecimal HRA_PERCENTAGE = new BigDecimal("0.30"); // 30% of basic pay
    private static final BigDecimal MEDICAL_ALLOWANCE = new BigDecimal("2000.00"); // Fixed ₹2000
    private static final BigDecimal TRANSPORT_ALLOWANCE = new BigDecimal("3000.00"); // Fixed ₹3000
    private static final BigDecimal PF_PERCENTAGE = new BigDecimal("0.12"); // 12% of basic pay
    private static final BigDecimal ESI_PERCENTAGE = new BigDecimal("0.0075"); // 0.75% of gross salary
    private static final BigDecimal ESI_SALARY_LIMIT = new BigDecimal("25000.00"); // ESI applicable if gross ≤ ₹25000
    
    // Tax brackets for annual salary (simplified tax calculation)
    private static final BigDecimal TAX_EXEMPT_LIMIT = new BigDecimal("250000.00"); // ₹2.5 lakh exempt
    private static final BigDecimal TAX_RATE_5_PERCENT = new BigDecimal("0.05"); // 5% for 2.5L - 5L
    private static final BigDecimal TAX_RATE_20_PERCENT = new BigDecimal("0.20"); // 20% for 5L - 10L
    private static final BigDecimal TAX_RATE_30_PERCENT = new BigDecimal("0.30"); // 30% for above 10L
    
    @Override
    public PayslipResponseDTO getPayslipByEmployeeId(int empId) {
        logger.info("Fetching payslip for employee ID: {}", empId);
        
        try {
            // First check if employee exists using department-aware method
            Optional<Employee> employeeOpt = employeeRepository.findByIdWithDepartment(empId);
            if (!employeeOpt.isPresent()) {
                logger.warn("Employee not found with ID: {}", empId);
                throw new EmployeeNotFoundException(empId);
            }
            
            // Enhanced department validation and logging
            Employee employee = employeeOpt.get();
            try {
                departmentValidationService.validateDepartmentData(employee);
                String departmentName = departmentValidationService.handleDepartmentDataGracefully(employee, "get_payslip_by_employee_id");
                logger.debug("Employee {} department: {}", empId, departmentName);
            } catch (DepartmentDataException ex) {
                logger.warn("Department validation failed for employee {} during payslip fetch: {}", empId, ex.getMessage());
                departmentValidationService.logDepartmentIssue(empId, null, "VALIDATION_FAILED_PAYSLIP_FETCH");
            }
            
            // Try to find existing payslip (latest one) with department data
            Optional<Payslip> payslipOpt = payslipRepository.findLatestPayslipByEmployeeIdWithDepartment(empId);
            
            if (payslipOpt.isPresent()) {
                logger.info("Found existing payslip for employee ID: {}", empId);
                Payslip payslip = payslipOpt.get();
                
                // Verify department data is loaded in payslip
                if (payslip.getEmployee() != null && payslip.getEmployee().getDepartment() == null) {
                    logger.warn("Payslip found but department data is missing for employee {}", empId);
                }
                
                return PayslipResponseDTO.fromPayslip(payslip);
            } else {
                // Generate payslip for current month if none exists
                logger.info("No existing payslip found, generating new payslip for employee ID: {}", empId);
                LocalDate currentDate = LocalDate.now();
                String currentMonth = currentDate.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
                String currentYear = String.valueOf(currentDate.getYear());
                
                Payslip generatedPayslip = generatePayslipForEmployee(empId, currentMonth, currentYear);
                return PayslipResponseDTO.fromPayslip(generatedPayslip);
            }
        } catch (EmployeeNotFoundException ex) {
            throw ex; // Re-throw custom exceptions
        } catch (Exception ex) {
            logger.error("Error fetching payslip for employee ID: {}", empId, ex);
            throw new PayslipCalculationException(empId, "Error fetching payslip data", ex);
        }
    }
    
    @Override
    public PayslipResponseDTO getPayslipByEmployeeIdAndPeriod(int empId, String month, String year) {
        logger.info("Fetching payslip for employee ID: {} for period: {} {}", empId, month, year);
        
        try {
            // First check if employee exists using department-aware method
            Optional<Employee> employeeOpt = employeeRepository.findByIdWithDepartment(empId);
            if (!employeeOpt.isPresent()) {
                logger.warn("Employee not found with ID: {}", empId);
                throw new EmployeeNotFoundException(empId);
            }
            
            // Enhanced department validation and logging
            Employee employee = employeeOpt.get();
            try {
                departmentValidationService.validateDepartmentData(employee);
                String departmentName = departmentValidationService.handleDepartmentDataGracefully(employee, "get_payslip_by_period");
                logger.debug("Employee {} department: {} for period {} {}", empId, departmentName, month, year);
            } catch (DepartmentDataException ex) {
                logger.warn("Department validation failed for employee {} during payslip fetch for period {} {}: {}", 
                    empId, month, year, ex.getMessage());
                departmentValidationService.logDepartmentIssue(empId, null, "VALIDATION_FAILED_PAYSLIP_PERIOD_FETCH");
            }
            
            // Try to find existing payslip for the specific period with department data
            Optional<Payslip> payslipOpt = payslipRepository.findByEmployeeIdAndMonthYearWithDepartment(empId, month, year);
            
            if (payslipOpt.isPresent()) {
                logger.info("Found existing payslip for employee ID: {} for period: {} {}", empId, month, year);
                Payslip payslip = payslipOpt.get();
                
                // Verify department data is loaded in payslip
                if (payslip.getEmployee() != null && payslip.getEmployee().getDepartment() == null) {
                    logger.warn("Payslip found but department data is missing for employee {} for period {} {}", 
                        empId, month, year);
                }
                
                return PayslipResponseDTO.fromPayslip(payslip);
            } else {
                // Generate payslip for the requested period if none exists
                logger.info("No existing payslip found, generating new payslip for employee ID: {} for period: {} {}", empId, month, year);
                Payslip generatedPayslip = generatePayslipForEmployee(empId, month, year);
                return PayslipResponseDTO.fromPayslip(generatedPayslip);
            }
        } catch (EmployeeNotFoundException ex) {
            throw ex; // Re-throw custom exceptions
        } catch (Exception ex) {
            logger.error("Error fetching payslip for employee ID: {} for period: {} {}", empId, month, year, ex);
            throw new PayslipCalculationException(empId, "Error fetching payslip data for specific period", ex);
        }
    }
    
    @Override
    public Payslip generatePayslipForEmployee(int empId, String month, String year) {
        logger.info("Generating payslip for employee ID: {} for period: {} {}", empId, month, year);
        
        try {
            // Fetch employee with department data
            Optional<Employee> employeeOpt = employeeRepository.findByIdWithDepartment(empId);
            if (!employeeOpt.isPresent()) {
                logger.warn("Employee not found with ID: {} during payslip generation", empId);
                throw new EmployeeNotFoundException(empId);
            }
            
            Employee employee = employeeOpt.get();
            
            // Enhanced department validation and logging during payslip generation
            try {
                departmentValidationService.validateDepartmentData(employee);
                String departmentName = departmentValidationService.handleDepartmentDataGracefully(employee, "generate_payslip");
                logger.debug("Generating payslip for employee {} in department: {} for period {} {}", 
                    empId, departmentName, month, year);
            } catch (DepartmentDataException ex) {
                logger.warn("Department validation failed for employee {} during payslip generation for period {} {}: {}", 
                    empId, month, year, ex.getMessage());
                departmentValidationService.logDepartmentIssue(empId, null, "VALIDATION_FAILED_PAYSLIP_GENERATION");
            }
            
            // Check if payslip already exists for this period using department-aware method
            Optional<Payslip> existingPayslip = payslipRepository.findByEmployeeIdAndMonthYearWithDepartment(empId, month, year);
            if (existingPayslip.isPresent()) {
                logger.info("Payslip already exists for employee ID: {} for period: {} {}", empId, month, year);
                Payslip existing = existingPayslip.get();
                
                // Verify department data is loaded in existing payslip
                if (existing.getEmployee() != null && existing.getEmployee().getDepartment() == null) {
                    logger.warn("Existing payslip found but department data is missing for employee {} for period {} {}", 
                        empId, month, year);
                }
                
                return existing; // Return existing payslip
            }
            
            // Create new payslip with calculated values
            Payslip payslip = new Payslip(employee, month, year);
            
            // Calculate salary components
            calculateSalaryComponents(payslip, employee.getSalary());
            
            // Save and return the payslip
            Payslip savedPayslip = payslipRepository.save(payslip);
            logger.info("Successfully generated and saved payslip for employee ID: {} for period: {} {}", empId, month, year);
            return savedPayslip;
            
        } catch (EmployeeNotFoundException ex) {
            throw ex; // Re-throw custom exceptions
        } catch (Exception ex) {
            logger.error("Error generating payslip for employee ID: {} for period: {} {}", empId, month, year, ex);
            throw new PayslipCalculationException(empId, "Error generating payslip", ex);
        }
    }
    
    @Override
    public void calculateAndSavePayslips() {
        logger.info("Starting bulk payslip generation for all employees");
        
        try {
            // Get current month and year
            LocalDate currentDate = LocalDate.now();
            String currentMonth = currentDate.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            String currentYear = String.valueOf(currentDate.getYear());
            
            // Get all employees with department data
            List<Employee> employees = employeeRepository.findAllWithDepartment();
            logger.info("Found {} employees for payslip generation", employees.size());
            
            int successCount = 0;
            int errorCount = 0;
            
            // Generate payslips for all employees with enhanced department validation
            for (Employee employee : employees) {
                try {
                    // Enhanced department validation and logging during bulk generation
                    try {
                        departmentValidationService.validateDepartmentData(employee);
                        String departmentName = departmentValidationService.handleDepartmentDataGracefully(employee, "bulk_payslip_generation");
                        logger.debug("Generating payslip for employee {} in department: {}", 
                            employee.getEmpId(), departmentName);
                    } catch (DepartmentDataException ex) {
                        logger.warn("Department validation failed for employee {} during bulk payslip generation: {}", 
                            employee.getEmpId(), ex.getMessage());
                        departmentValidationService.logDepartmentIssue(employee.getEmpId(), null, "VALIDATION_FAILED_BULK_GENERATION");
                    }
                    
                    generatePayslipForEmployee(employee.getEmpId(), currentMonth, currentYear);
                    successCount++;
                } catch (Exception e) {
                    // Log error but continue with other employees
                    logger.error("Error generating payslip for employee {}: {}", employee.getEmpId(), e.getMessage(), e);
                    departmentValidationService.logDepartmentIssue(employee.getEmpId(), null, "BULK_GENERATION_ERROR");
                    errorCount++;
                }
            }
            
            logger.info("Bulk payslip generation completed. Success: {}, Errors: {}", successCount, errorCount);
            
        } catch (Exception ex) {
            logger.error("Error during bulk payslip generation", ex);
            throw new PayslipCalculationException("Error during bulk payslip generation", ex);
        }
    }
    
    /**
     * Calculate all salary components based on employee's base salary
     * Implements requirements 3.1 through 3.10
     */
    private void calculateSalaryComponents(Payslip payslip, float employeeSalary) {
        logger.debug("Calculating salary components for employee salary: {}", employeeSalary);
        
        try {
            if (employeeSalary <= 0) {
                throw new PayslipCalculationException("Invalid employee salary: " + employeeSalary);
            }
            
            BigDecimal totalSalary = new BigDecimal(String.valueOf(employeeSalary));
            
            // Requirement 3.1: Basic pay = 60% of total salary
            BigDecimal basicPay = totalSalary.multiply(BASIC_PAY_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
            payslip.setBasicPay(basicPay);
            
            // Requirement 3.2: HRA = 30% of basic pay
            BigDecimal hra = basicPay.multiply(HRA_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
            payslip.setHra(hra);
            
            // Requirement 3.3: Medical allowance = ₹2000 (fixed)
            payslip.setMedicalAllowance(MEDICAL_ALLOWANCE);
            
            // Requirement 3.4: Transport allowance = ₹3000 (fixed)
            payslip.setTransportAllowance(TRANSPORT_ALLOWANCE);
            
            // Other allowances (default to 0)
            payslip.setOtherAllowances(BigDecimal.ZERO);
            
            // Requirement 3.8: Gross salary = sum of all earnings
            BigDecimal grossSalary = basicPay
                .add(hra)
                .add(MEDICAL_ALLOWANCE)
                .add(TRANSPORT_ALLOWANCE)
                .add(payslip.getOtherAllowances());
            payslip.setGrossSalary(grossSalary);
            
            // Requirement 3.5: PF = 12% of basic pay
            BigDecimal pf = basicPay.multiply(PF_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
            payslip.setPf(pf);
            
            // Requirement 3.6: ESI = 0.75% of gross salary (if gross ≤ ₹25000)
            BigDecimal esi = BigDecimal.ZERO;
            if (grossSalary.compareTo(ESI_SALARY_LIMIT) <= 0) {
                esi = grossSalary.multiply(ESI_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
            }
            payslip.setEsi(esi);
            
            // Requirement 3.7: Tax deductions based on annual salary
            BigDecimal taxDeductions = calculateTaxDeductions(totalSalary);
            payslip.setTaxDeductions(taxDeductions);
            
            // Other deductions (default to 0)
            payslip.setOtherDeductions(BigDecimal.ZERO);
            
            // Requirement 3.9: Total deductions = sum of all deductions
            BigDecimal totalDeductions = pf
                .add(esi)
                .add(taxDeductions)
                .add(payslip.getOtherDeductions());
            payslip.setTotalDeductions(totalDeductions);
            
            // Requirement 3.10: Net salary = gross salary - total deductions
            BigDecimal netSalary = grossSalary.subtract(totalDeductions);
            payslip.setNetSalary(netSalary);
            
            logger.debug("Successfully calculated salary components. Net salary: {}", netSalary);
            
        } catch (PayslipCalculationException ex) {
            throw ex; // Re-throw custom exceptions
        } catch (Exception ex) {
            logger.error("Error calculating salary components for employee salary: {}", employeeSalary, ex);
            throw new PayslipCalculationException("Error during salary calculation", ex);
        }
    }
    
    /**
     * Calculate tax deductions based on annual salary using standard tax brackets
     * This is a simplified tax calculation for demonstration
     */
    private BigDecimal calculateTaxDeductions(BigDecimal monthlySalary) {
        // Convert monthly to annual salary
        BigDecimal annualSalary = monthlySalary.multiply(new BigDecimal("12"));
        
        BigDecimal annualTax = BigDecimal.ZERO;
        
        // Tax calculation based on brackets
        if (annualSalary.compareTo(TAX_EXEMPT_LIMIT) > 0) {
            // Calculate tax for different brackets
            BigDecimal taxableAmount = annualSalary.subtract(TAX_EXEMPT_LIMIT);
            
            // 5% tax bracket (2.5L - 5L)
            BigDecimal bracket1Limit = new BigDecimal("250000.00"); // 2.5L additional
            if (taxableAmount.compareTo(bracket1Limit) > 0) {
                annualTax = annualTax.add(bracket1Limit.multiply(TAX_RATE_5_PERCENT));
                taxableAmount = taxableAmount.subtract(bracket1Limit);
                
                // 20% tax bracket (5L - 10L)
                BigDecimal bracket2Limit = new BigDecimal("500000.00"); // 5L additional
                if (taxableAmount.compareTo(bracket2Limit) > 0) {
                    annualTax = annualTax.add(bracket2Limit.multiply(TAX_RATE_20_PERCENT));
                    taxableAmount = taxableAmount.subtract(bracket2Limit);
                    
                    // 30% tax bracket (above 10L)
                    annualTax = annualTax.add(taxableAmount.multiply(TAX_RATE_30_PERCENT));
                } else {
                    annualTax = annualTax.add(taxableAmount.multiply(TAX_RATE_20_PERCENT));
                }
            } else {
                annualTax = annualTax.add(taxableAmount.multiply(TAX_RATE_5_PERCENT));
            }
        }
        
        // Convert annual tax to monthly tax deduction
        BigDecimal monthlyTax = annualTax.divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);
        
        return monthlyTax;
    }
}