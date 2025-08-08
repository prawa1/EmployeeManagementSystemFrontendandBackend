package com.example.demo.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.EmployeeResponseDTO;
import com.example.demo.dto.EmployeeSettingsUpdateDTO;
import com.example.demo.dto.PayslipResponseDTO;
import com.example.demo.exception.InvalidEmployeeIdException;
import com.example.demo.model.Employee;
import com.example.demo.service.EmployeeService;
import com.example.demo.service.PayslipService;

import jakarta.validation.Valid;

@RestController
@CrossOrigin(origins="http://localhost:4200")
@RequestMapping("/employee/api")

public class EmployeeController {
    
    private static final Logger logger = LoggerFactory.getLogger(EmployeeController.class);
    
    @Autowired
    private EmployeeService employeeService;
    
    @Autowired
    private PayslipService payslipService;
    
    // 1. Add Employee
    @PostMapping("/add/{deptid}")
    public ResponseEntity<Employee> addEmployee(@Valid @RequestBody Employee employeewithoutId, @PathVariable("deptid") int deptId) {
        logger.info("Adding employee with department ID: {}", deptId);
        try {
            Employee employeewithId = employeeService.addEmployee(employeewithoutId, deptId);
            logger.info("Successfully added employee with ID: {} to department: {}", employeewithId.getEmpId(), deptId);
            return new ResponseEntity<>(employeewithId, HttpStatus.CREATED);
        } catch (Exception ex) {
            logger.error("Error adding employee to department {}: {}", deptId, ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

    // 2. Get All Employees
    @GetMapping("/all")
    public List<Employee> getAllEmployee() {
        logger.info("Fetching all employees with department information");
        try {
            List<Employee> employees = employeeService.getAllEmployee();
            logger.info("Successfully fetched {} employees", employees.size());
            return employees;
        } catch (Exception ex) {
            logger.error("Error fetching all employees: {}", ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }
    
    // Get Employee Count
    @GetMapping("/count")
    public ResponseEntity<Integer> getEmployeeCount() {
        logger.info("Fetching employee count");
        try {
            List<Employee> employees = employeeService.getAllEmployee();
            int count = employees.size();
            logger.info("Successfully fetched employee count: {}", count);
            return new ResponseEntity<>(count, HttpStatus.OK);
        } catch (Exception ex) {
            logger.error("Error fetching employee count: {}", ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

    // 3. Get Employee By ID
    @GetMapping("/get/{empid}")
    public ResponseEntity<EmployeeResponseDTO> getEmployeeById(@PathVariable("empid") int empId) {
        logger.info("Fetching employee with ID: {}", empId);
        try {
            Employee employee = employeeService.getEmployeeById(empId);
            EmployeeResponseDTO employeeResponse = EmployeeResponseDTO.fromEmployee(employee);
            logger.info("Successfully fetched employee with ID: {}", empId);
            return new ResponseEntity<>(employeeResponse, HttpStatus.OK);
        } catch (Exception ex) {
            logger.error("Error fetching employee with ID {}: {}", empId, ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

    // 4. Delete Employee By ID
    @DeleteMapping("/delete/{empid}")
    public ResponseEntity<String> deleteEmployeeById(@PathVariable("empid") int empId) {
        logger.info("Deleting employee with ID: {}", empId);
        try {
            employeeService.deleteEmployeeById(empId);
            logger.info("Successfully deleted employee with ID: {}", empId);
            return new ResponseEntity<>("Employee deleted successfully", HttpStatus.OK);
        } catch (Exception ex) {
            logger.error("Error deleting employee with ID {}: {}", empId, ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

    // 5. Update Employee By ID
    @PutMapping("/update/{empid}")
    public ResponseEntity<Employee> updateEmployeeById(@PathVariable("empid") int empId, @RequestBody Employee employee) {
        logger.info("Updating employee with ID: {}", empId);
        try {
            Employee updatedEmployee = employeeService.updateEmployeeById(empId, employee);
            logger.info("Successfully updated employee with ID: {}", empId);
            return new ResponseEntity<>(updatedEmployee, HttpStatus.CREATED);
        } catch (Exception ex) {
            logger.error("Error updating employee with ID {}: {}", empId, ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

    // 6. Employee Login
    @PostMapping("/login")
    public ResponseEntity<EmployeeResponseDTO> employeeLogin(@RequestBody Employee employee) {
        logger.info("Employee login attempt for email: {}", employee.getEmail());
        try {
            Employee emp = employeeService.employeeLogin(employee);
            if (emp != null) {
                EmployeeResponseDTO employeeResponse = EmployeeResponseDTO.fromEmployee(emp);
                logger.info("Successful login for employee ID: {}", emp.getEmpId());
                return new ResponseEntity<>(employeeResponse, HttpStatus.OK);
            } else {
                logger.warn("Failed login attempt for email: {}", employee.getEmail());
                return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
            }
        } catch (Exception ex) {
            logger.error("Error during login for email {}: {}", employee.getEmail(), ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }
    
    //7. add list of employees
    @PostMapping("/bulk-add")
    public ResponseEntity<List<Employee>> addMultipleEmployees(@RequestBody List<@Valid Employee> employees) {
        logger.info("Adding {} employees in bulk", employees.size());
        try {
            List<Employee> savedEmployees = employeeService.addMultipleEmployees(employees);
            logger.info("Successfully added {} employees in bulk", savedEmployees.size());
            return new ResponseEntity<>(savedEmployees, HttpStatus.CREATED);
        } catch (Exception ex) {
            logger.error("Error adding multiple employees: {}", ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

    // 8. Get Employee Payslip
    @GetMapping("/payslip/{empid}")
    public ResponseEntity<PayslipResponseDTO> getEmployeePayslip(@PathVariable("empid") String empIdStr) {
        logger.info("Received request for payslip with employee ID: {}", empIdStr);
        
        try {
            // Validate employee ID format - Requirement 4.4
            int empId;
            try {
                empId = Integer.parseInt(empIdStr);
                if (empId <= 0) {
                    throw new InvalidEmployeeIdException(empIdStr, "Employee ID must be a positive integer");
                }
            } catch (NumberFormatException e) {
                logger.warn("Invalid employee ID format received: {}", empIdStr);
                throw new InvalidEmployeeIdException(empIdStr, "Employee ID must be a valid integer");
            }
            
            // Get payslip data
            PayslipResponseDTO payslip = payslipService.getPayslipByEmployeeId(empId);
            logger.info("Successfully retrieved payslip for employee ID: {}", empId);
            return new ResponseEntity<>(payslip, HttpStatus.OK);
            
        } catch (InvalidEmployeeIdException ex) {
            // Let GlobalExceptionHandler handle this
            throw ex;
        } catch (Exception ex) {
            logger.error("Unexpected error while processing payslip request for employee ID: {}", empIdStr, ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

    // 9. Update Employee Settings
    @PutMapping("/settings/{empid}")
    public ResponseEntity<EmployeeResponseDTO> updateEmployeeSettings(
            @PathVariable("empid") int empId, 
            @Valid @RequestBody EmployeeSettingsUpdateDTO updateData) {
        logger.info("Updating employee settings for ID: {} with data: {}", empId, updateData);
        
        try {
            // Validate that at least one field is provided for update
            if (!updateData.hasValidUpdate()) {
                logger.warn("No valid fields provided for update for employee ID: {}", empId);
                throw new IllegalArgumentException("At least one field (name or phone number) must be provided for update");
            }
            
            Employee updatedEmployee = employeeService.updateEmployeeSettings(
                empId, updateData.getEmpName(), updateData.getPhoneNo());
            EmployeeResponseDTO employeeResponse = EmployeeResponseDTO.fromEmployee(updatedEmployee);
            logger.info("Successfully updated employee settings for ID: {}", empId);
            return new ResponseEntity<>(employeeResponse, HttpStatus.OK);
        } catch (Exception ex) {
            logger.error("Error updating employee settings for ID {}: {}", empId, ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

    // 10. Check Email Availability
    @GetMapping("/check-email")
    public ResponseEntity<Boolean> checkEmailAvailability(@RequestParam("email") String email) {
        logger.info("Checking email availability for: {}", email);
        try {
            boolean isAvailable = employeeService.isEmailAvailable(email);
            logger.info("Email availability check for {}: {}", email, isAvailable ? "available" : "taken");
            return new ResponseEntity<>(isAvailable, HttpStatus.OK);
        } catch (Exception ex) {
            logger.error("Error checking email availability for {}: {}", email, ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

    // 11. Check Phone Number Availability
    @GetMapping("/check-phone")
    public ResponseEntity<Boolean> checkPhoneAvailability(@RequestParam("phone") String phone) {
        logger.info("Checking phone number availability for: {}", phone);
        try {
            boolean isAvailable = employeeService.isPhoneAvailable(phone);
            logger.info("Phone availability check for {}: {}", phone, isAvailable ? "available" : "taken");
            return new ResponseEntity<>(isAvailable, HttpStatus.OK);
        } catch (Exception ex) {
            logger.error("Error checking phone availability for {}: {}", phone, ex.getMessage(), ex);
            throw ex; // Let GlobalExceptionHandler handle this
        }
    }

}