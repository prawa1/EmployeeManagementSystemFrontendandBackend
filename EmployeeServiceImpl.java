package com.example.demo.serviceimpl;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.exception.DepartmentDataException;
import com.example.demo.model.Department;
import com.example.demo.model.Employee;
import com.example.demo.repository.EmployeeRepository;
import com.example.demo.service.DatabaseConnectionService;
import com.example.demo.service.DepartmentService;
import com.example.demo.service.DepartmentValidationService;
import com.example.demo.service.EmployeeService;

import jakarta.validation.Valid;

@Service
public class EmployeeServiceImpl implements EmployeeService{
	
	private static final Logger logger = LoggerFactory.getLogger(EmployeeServiceImpl.class);
	
	@Autowired
	private EmployeeRepository employeeRepository;
	
	@Autowired
	private DepartmentService departmentService;
	
	@Autowired
	private DepartmentValidationService departmentValidationService;
	
	@Autowired
	private DatabaseConnectionService databaseConnectionService;
	
	@Override
	public Employee addEmployee(Employee employee, int deptId) {
		logger.info("Adding employee with department ID: {}", deptId);
		try {
			// Validate department ID format
			if (!departmentValidationService.isValidDepartmentReference(deptId)) {
				logger.error("Invalid department ID format: {}", deptId);
				departmentValidationService.logDepartmentIssue(null, deptId, "INVALID_DEPARTMENT_ID_FORMAT");
				throw new DepartmentDataException(null, deptId, "Invalid department ID format");
			}
			
			Department department = departmentService.getDepartmentById(deptId);
			if (department == null) {
				logger.warn("Department not found with ID: {}, proceeding without department assignment", deptId);
				departmentValidationService.logDepartmentIssue(null, deptId, "DEPARTMENT_NOT_FOUND_ON_ADD");
			}
			
			employee.setDepartment(department);
			
			// Use connection retry logic for database save operation
			Employee savedEmployee = databaseConnectionService.executeWithRetry(
				() -> employeeRepository.save(employee),
				"addEmployee"
			);
			
			// Validate department data after saving
			try {
				departmentValidationService.validateDepartmentData(savedEmployee);
				logger.info("Successfully added employee with ID: {} and validated department data", savedEmployee.getEmpId());
			} catch (DepartmentDataException ex) {
				logger.warn("Employee added but department data validation failed: {}", ex.getMessage());
				// Don't fail the operation, just log the issue
			}
			
			return savedEmployee;
		} catch (DepartmentDataException ex) {
			throw ex; // Re-throw department-specific exceptions
		} catch (Exception ex) {
			logger.error("Error adding employee with department ID: {}", deptId, ex);
			throw new RuntimeException("Failed to add employee: " + ex.getMessage(), ex);
		}
	}
	
	@Override
	public List<Employee> getAllEmployee() {
		logger.info("Fetching all employees with department information");
		try {
			// Use connection retry logic for database fetch operation
			List<Employee> employees = databaseConnectionService.executeWithRetry(
				() -> employeeRepository.findAllWithDepartment(),
				"getAllEmployees"
			);
			
			// Enhanced department validation and logging for each employee
			employees.forEach(employee -> {
				try {
					departmentValidationService.validateDepartmentData(employee);
					String departmentName = departmentValidationService.handleDepartmentDataGracefully(employee, "get_all_employees");
					logger.debug("Employee {} department: {}", employee.getEmpId(), departmentName);
				} catch (DepartmentDataException ex) {
					logger.warn("Department validation failed for employee {}: {}", employee.getEmpId(), ex.getMessage());
					departmentValidationService.logDepartmentIssue(employee.getEmpId(), null, "VALIDATION_FAILED_GET_ALL");
				}
			});
			
			logger.info("Successfully fetched {} employees with department data", employees.size());
			return employees;
		} catch (Exception ex) {
			logger.error("Error fetching all employees with department data", ex);
			throw new RuntimeException("Failed to fetch employees: " + ex.getMessage(), ex);
		}
	}

	@Override
	public Employee getEmployeeById(int empId) {
		logger.info("Fetching employee with ID: {} including department information", empId);
		try {
			// Use connection retry logic for database fetch operation
			Employee employee = databaseConnectionService.executeWithRetry(
				() -> employeeRepository.findByIdWithDepartment(empId)
					.orElseThrow(() -> new RuntimeException("Employee not found with ID: " + empId)),
				"getEmployeeById"
			);
			
			// Enhanced department validation and logging
			try {
				departmentValidationService.validateDepartmentData(employee);
				String departmentName = departmentValidationService.handleDepartmentDataGracefully(employee, "get_employee_by_id");
				logger.debug("Employee {} department: {}", empId, departmentName);
			} catch (DepartmentDataException ex) {
				logger.warn("Department validation failed for employee {}: {}", empId, ex.getMessage());
				departmentValidationService.logDepartmentIssue(empId, null, "VALIDATION_FAILED_GET_BY_ID");
			}
			
			return employee;
		} catch (Exception ex) {
			logger.error("Error fetching employee with ID: {}", empId, ex);
			throw ex; // Re-throw to maintain existing behavior
		}
	}

	@Override
	public void deleteEmployeeById(int empId) {
		logger.info("Deleting employee with ID: {}", empId);
		try {
			Employee employee = getEmployeeById(empId); // This already uses department-aware method
			
			// Use connection retry logic for database delete operation
			databaseConnectionService.executeWithRetry(
				() -> {
					employeeRepository.deleteById(employee.getEmpId());
					return null; // Void operation
				},
				"deleteEmployeeById"
			);
			
			logger.info("Successfully deleted employee with ID: {}", empId);
		} catch (Exception ex) {
			logger.error("Error deleting employee with ID: {}", empId, ex);
			throw new RuntimeException("Failed to delete employee: " + ex.getMessage(), ex);
		}
	}

	@Override
	public Employee updateEmployeeById(int empId, Employee newemployee) {
		logger.info("Updating employee with ID: {}", empId);
		try {
			Employee oldemployee = getEmployeeById(empId); // This already uses department-aware method
			
			// Update all provided fields
			if (newemployee.getEmpName() != null) {
				oldemployee.setEmpName(newemployee.getEmpName());
			}
			if (newemployee.getSalary() > 0) {
				oldemployee.setSalary(newemployee.getSalary());
			}
			if (newemployee.getEmail() != null) {
				oldemployee.setEmail(newemployee.getEmail());
			}
			if (newemployee.getPassword() != null) {
				oldemployee.setPassword(newemployee.getPassword());
			}
			if (newemployee.getPhoneNo() != null) {
				oldemployee.setPhoneNo(newemployee.getPhoneNo());
			}
			if (newemployee.getAddress() != null) {
				oldemployee.setAddress(newemployee.getAddress());
			}
			if (newemployee.getGender() != null) {
				oldemployee.setGender(newemployee.getGender());
			}
			if (newemployee.getRole() != null) {
				oldemployee.setRole(newemployee.getRole());
			}
			
			// Use connection retry logic for database update operation
			Employee updatedEmployee = databaseConnectionService.executeWithRetry(
				() -> employeeRepository.save(oldemployee),
				"updateEmployeeById"
			);
			
			logger.info("Successfully updated employee with ID: {}", empId);
			return updatedEmployee;
		} catch (Exception ex) {
			logger.error("Error updating employee with ID: {}", empId, ex);
			throw new RuntimeException("Failed to update employee: " + ex.getMessage(), ex);
		}
	}

	@Override
	public Employee employeeLogin(Employee employee) {
		logger.info("Attempting login for employee with email: {}", employee.getEmail());
		try {
			// Use connection retry logic for database login operation
			Employee loggedInEmployee = databaseConnectionService.executeWithRetry(
				() -> employeeRepository.findByEmailAndPasswordWithDepartment(
					employee.getEmail(), employee.getPassword()).orElse(null),
				"employeeLogin"
			);
			
			if (loggedInEmployee != null) {
				logger.info("Successful login for employee ID: {}", loggedInEmployee.getEmpId());
				
				// Enhanced department validation and logging for login
				try {
					departmentValidationService.validateDepartmentData(loggedInEmployee);
					String departmentName = departmentValidationService.handleDepartmentDataGracefully(loggedInEmployee, "employee_login");
					logger.debug("Logged in employee {} department: {}", loggedInEmployee.getEmpId(), departmentName);
				} catch (DepartmentDataException ex) {
					logger.warn("Department validation failed for logged in employee {}: {}", loggedInEmployee.getEmpId(), ex.getMessage());
					departmentValidationService.logDepartmentIssue(loggedInEmployee.getEmpId(), null, "VALIDATION_FAILED_LOGIN");
				}
			} else {
				logger.warn("Failed login attempt for email: {}", employee.getEmail());
			}
			
			return loggedInEmployee; // Return null if login fails (maintains existing behavior)
		} catch (Exception ex) {
			logger.error("Error during login for email: {}", employee.getEmail(), ex);
			return null; // Return null on error to maintain existing behavior
		}
	}

	@Override
	public List<Employee> addMultipleEmployees(List<@Valid Employee> employees) {
		logger.info("Adding {} employees in batch", employees.size());
		try {
			// Use connection retry logic for database batch save operation
			List<Employee> savedEmployees = databaseConnectionService.executeWithRetry(
				() -> employeeRepository.saveAll(employees),
				"addMultipleEmployees"
			);
			
			logger.info("Successfully added {} employees in batch", savedEmployees.size());
			return savedEmployees;
		} catch (Exception ex) {
			logger.error("Error adding multiple employees", ex);
			throw new RuntimeException("Failed to add multiple employees: " + ex.getMessage(), ex);
		}
	}

	@Override
	@Transactional
	public Employee updateEmployeeSettings(int empId, String empName, String phoneNo) {
		logger.info("Updating employee settings for ID: {} with name: {} and phone: {}", empId, empName, phoneNo);
		
		try {
			// Validate input parameters
			if (empName != null && empName.trim().isEmpty()) {
				throw new IllegalArgumentException("Name cannot be empty");
			}
			if (phoneNo != null && phoneNo.trim().isEmpty()) {
				throw new IllegalArgumentException("Phone number cannot be empty");
			}
			
			// Additional validation for name format
			if (empName != null && !empName.matches("^[a-zA-Z\\s\\-']+$")) {
				throw new IllegalArgumentException("Name can only contain letters, spaces, hyphens, and apostrophes");
			}
			
			// Additional validation for phone format
			if (phoneNo != null && !phoneNo.matches("^[0-9]{10}$")) {
				throw new IllegalArgumentException("Phone number must be exactly 10 digits");
			}
			
			// Fetch the employee - this will throw RuntimeException if not found
			Employee employee = getEmployeeById(empId);
			logger.debug("Found employee: {} with current name: {} and phone: {}", 
				empId, employee.getEmpName(), employee.getPhoneNo());
			
			// Store original values for logging and rollback
			String originalName = employee.getEmpName();
			String originalPhone = employee.getPhoneNo();
			
			// Check if phone number is being changed and if it already exists
			if (phoneNo != null && !phoneNo.equals(originalPhone)) {
				// Use connection retry logic for database existence check
				boolean phoneExists = databaseConnectionService.executeWithRetry(
					() -> employeeRepository.existsByPhoneNoAndEmpIdNot(phoneNo, empId),
					"checkPhoneNumberExists"
				);
				
				if (phoneExists) {
					logger.warn("Phone number {} already exists for another employee", phoneNo);
					throw new DataIntegrityViolationException("Phone number already exists");
				}
			}
			
			// Update only the specified fields (selective field updates)
			if (empName != null && !empName.trim().isEmpty()) {
				employee.setEmpName(empName.trim());
			}
			if (phoneNo != null && !phoneNo.trim().isEmpty()) {
				employee.setPhoneNo(phoneNo.trim());
			}
			
			// Use connection retry logic for database save operation
			Employee updatedEmployee = databaseConnectionService.executeWithRetry(
				() -> employeeRepository.save(employee),
				"updateEmployeeSettings"
			);
			
			logger.info("Successfully updated employee settings for ID: {}. Name: {} -> {}, Phone: {} -> {}", 
				empId, originalName, updatedEmployee.getEmpName(), originalPhone, updatedEmployee.getPhoneNo());
			
			return updatedEmployee;
			
		} catch (DataIntegrityViolationException ex) {
			logger.error("Data integrity violation while updating employee settings for ID: {}. Phone number may already exist: {}", empId, phoneNo, ex);
			// Re-throw to be handled by GlobalExceptionHandler
			throw ex;
		} catch (IllegalArgumentException ex) {
			logger.error("Validation error updating employee settings for ID: {}: {}", empId, ex.getMessage());
			// Re-throw to be handled by GlobalExceptionHandler
			throw ex;
		} catch (RuntimeException ex) {
			// This includes employee not found exceptions and other runtime exceptions
			logger.error("Runtime error updating employee settings for ID: {}", empId, ex);
			throw ex; // Re-throw to let controller handle specific exceptions
		} catch (Exception ex) {
			logger.error("Unexpected error updating employee settings for ID: {}", empId, ex);
			throw new RuntimeException("Failed to update employee settings: " + ex.getMessage(), ex);
		}
	}

	@Override
	public boolean isEmailAvailable(String email) {
		logger.info("Checking email availability for: {}", email);
		try {
			// Validate email format
			if (email == null || email.trim().isEmpty()) {
				throw new IllegalArgumentException("Email cannot be null or empty");
			}
			
			// Basic email format validation
			if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
				throw new IllegalArgumentException("Invalid email format");
			}
			
			// Use connection retry logic for database existence check
			boolean emailExists = databaseConnectionService.executeWithRetry(
				() -> employeeRepository.existsByEmail(email.trim()),
				"checkEmailExists"
			);
			
			boolean isAvailable = !emailExists;
			logger.info("Email availability check for {}: {}", email, isAvailable ? "available" : "taken");
			return isAvailable;
			
		} catch (IllegalArgumentException ex) {
			logger.error("Validation error checking email availability for {}: {}", email, ex.getMessage());
			throw ex; // Re-throw to be handled by GlobalExceptionHandler
		} catch (Exception ex) {
			logger.error("Error checking email availability for {}: {}", email, ex.getMessage(), ex);
			throw new RuntimeException("Failed to check email availability: " + ex.getMessage(), ex);
		}
	}

	@Override
	public boolean isPhoneAvailable(String phone) {
		logger.info("Checking phone number availability for: {}", phone);
		try {
			// Validate phone format
			if (phone == null || phone.trim().isEmpty()) {
				throw new IllegalArgumentException("Phone number cannot be null or empty");
			}
			
			// Phone number format validation (10 digits)
			if (!phone.matches("^[0-9]{10}$")) {
				throw new IllegalArgumentException("Phone number must be exactly 10 digits");
			}
			
			// Use connection retry logic for database existence check
			boolean phoneExists = databaseConnectionService.executeWithRetry(
				() -> employeeRepository.existsByPhoneNo(phone.trim()),
				"checkPhoneExists"
			);
			
			boolean isAvailable = !phoneExists;
			logger.info("Phone availability check for {}: {}", phone, isAvailable ? "available" : "taken");
			return isAvailable;
			
		} catch (IllegalArgumentException ex) {
			logger.error("Validation error checking phone availability for {}: {}", phone, ex.getMessage());
			throw ex; // Re-throw to be handled by GlobalExceptionHandler
		} catch (Exception ex) {
			logger.error("Error checking phone availability for {}: {}", phone, ex.getMessage(), ex);
			throw new RuntimeException("Failed to check phone availability: " + ex.getMessage(), ex);
		}
	}

}
