package com.example.demo.serviceimpl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.model.Department;
import com.example.demo.model.Employee;
import com.example.demo.repository.DepartmentRepository;
import com.example.demo.repository.EmployeeRepository;
import com.example.demo.service.DataMigrationService;

@Service
@Transactional
public class DataMigrationServiceImpl implements DataMigrationService {
    
    private static final Logger logger = LoggerFactory.getLogger(DataMigrationServiceImpl.class);
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private DepartmentRepository departmentRepository;
    
    @Override
    public MigrationResult performDepartmentMigration() {
        logger.info("Starting department data migration...");
        
        try {
            // Step 1: Populate default departments
            int departmentsCreated = populateDefaultDepartments();
            logger.info("Created {} departments", departmentsCreated);
            
            // Step 2: Update employees with invalid departments
            int employeesUpdated = updateEmployeesWithInvalidDepartments();
            logger.info("Updated {} employees with proper department assignments", employeesUpdated);
            
            // Step 3: Validate the migration
            ValidationResult validation = validateEmployeeDepartmentRelationships();
            
            if (validation.isValid()) {
                logger.info("Department migration completed successfully");
                return new MigrationResult(true, "Migration completed successfully", 
                    employeesUpdated, departmentsCreated, new ArrayList<>());
            } else {
                logger.warn("Migration completed with validation errors: {}", validation.getErrors());
                return new MigrationResult(false, "Migration completed with validation errors", 
                    employeesUpdated, departmentsCreated, validation.getErrors());
            }
            
        } catch (Exception e) {
            logger.error("Error during department migration", e);
            List<String> errors = new ArrayList<>();
            errors.add("Migration failed: " + e.getMessage());
            return new MigrationResult(false, "Migration failed", 0, 0, errors);
        }
    }
    
    @Override
    public ValidationResult validateEmployeeDepartmentRelationships() {
        logger.info("Validating employee-department relationships...");
        
        List<String> errors = new ArrayList<>();
        Map<String, Object> statistics = new HashMap<>();
        
        try {
            // Get all employees
            List<Employee> allEmployees = employeeRepository.findAll();
            statistics.put("totalEmployees", allEmployees.size());
            
            // Check for employees without departments
            long employeesWithoutDepartment = allEmployees.stream()
                .filter(emp -> emp.getDepartment() == null)
                .count();
            
            statistics.put("employeesWithoutDepartment", employeesWithoutDepartment);
            
            if (employeesWithoutDepartment > 0) {
                errors.add("Found " + employeesWithoutDepartment + " employees without department assignment");
            }
            
            // Check for employees with invalid department references
            List<Employee> employeesWithInvalidDept = new ArrayList<>();
            for (Employee emp : allEmployees) {
                if (emp.getDepartment() != null) {
                    Optional<Department> dept = departmentRepository.findById(emp.getDepartment().getDeptId());
                    if (!dept.isPresent()) {
                        employeesWithInvalidDept.add(emp);
                    }
                }
            }
            
            statistics.put("employeesWithInvalidDepartment", employeesWithInvalidDept.size());
            
            if (!employeesWithInvalidDept.isEmpty()) {
                errors.add("Found " + employeesWithInvalidDept.size() + " employees with invalid department references");
            }
            
            // Get department statistics
            List<Department> allDepartments = departmentRepository.findAll();
            statistics.put("totalDepartments", allDepartments.size());
            
            Map<String, Integer> deptEmployeeCount = getDepartmentEmployeeSummary();
            statistics.put("departmentEmployeeDistribution", deptEmployeeCount);
            
            boolean isValid = errors.isEmpty();
            logger.info("Validation completed. Valid: {}, Errors: {}", isValid, errors.size());
            
            return new ValidationResult(isValid, errors, statistics);
            
        } catch (Exception e) {
            logger.error("Error during validation", e);
            errors.add("Validation failed: " + e.getMessage());
            return new ValidationResult(false, errors, statistics);
        }
    }
    
    @Override
    public int populateDefaultDepartments() {
        logger.info("Populating default departments...");
        
        // Define default departments
        Map<String, String> defaultDepartments = new HashMap<>();
        defaultDepartments.put("Information Technology", "IT Department handling software development and infrastructure");
        defaultDepartments.put("Human Resources", "HR Department managing employee relations and policies");
        defaultDepartments.put("Finance", "Finance Department handling accounting and financial operations");
        defaultDepartments.put("Marketing", "Marketing Department managing promotions and customer relations");
        defaultDepartments.put("Operations", "Operations Department managing day-to-day business operations");
        defaultDepartments.put("Sales", "Sales Department managing customer acquisition and revenue");
        defaultDepartments.put("Quality Assurance", "QA Department ensuring product and service quality");
        defaultDepartments.put("Research and Development", "R&D Department focusing on innovation and product development");
        
        int created = 0;
        
        for (Map.Entry<String, String> entry : defaultDepartments.entrySet()) {
            String deptName = entry.getKey();
            String description = entry.getValue();
            
            // Check if department already exists
            List<Department> existingDepts = departmentRepository.findAll();
            boolean exists = existingDepts.stream()
                .anyMatch(dept -> dept.getDeptName().equalsIgnoreCase(deptName));
            
            if (!exists) {
                Department newDept = new Department();
                newDept.setDeptName(deptName);
                newDept.setDescription(description);
                
                departmentRepository.save(newDept);
                created++;
                logger.info("Created department: {}", deptName);
            }
        }
        
        logger.info("Created {} new departments", created);
        return created;
    }
    
    @Override
    public int updateEmployeesWithInvalidDepartments() {
        logger.info("Updating employees with invalid department assignments...");
        
        List<Employee> allEmployees = employeeRepository.findAll();
        List<Department> allDepartments = departmentRepository.findAll();
        
        // Find IT department as default
        Department defaultDepartment = allDepartments.stream()
            .filter(dept -> dept.getDeptName().equalsIgnoreCase("Information Technology"))
            .findFirst()
            .orElse(allDepartments.isEmpty() ? null : allDepartments.get(0));
        
        if (defaultDepartment == null) {
            logger.error("No departments available for assignment");
            return 0;
        }
        
        int updated = 0;
        
        for (Employee employee : allEmployees) {
            boolean needsUpdate = false;
            Department assignedDepartment = null;
            
            // Check if employee has no department
            if (employee.getDepartment() == null) {
                needsUpdate = true;
                assignedDepartment = assignDepartmentByRole(employee.getRole(), allDepartments, defaultDepartment);
            } else {
                // Check if department reference is valid
                final int deptId = employee.getDepartment().getDeptId();
                boolean validDepartment = allDepartments.stream()
                    .anyMatch(dept -> dept.getDeptId() == deptId);
                
                if (!validDepartment) {
                    needsUpdate = true;
                    assignedDepartment = assignDepartmentByRole(employee.getRole(), allDepartments, defaultDepartment);
                }
            }
            
            if (needsUpdate && assignedDepartment != null) {
                employee.setDepartment(assignedDepartment);
                employeeRepository.save(employee);
                updated++;
                logger.info("Updated employee {} with department {}", 
                    employee.getEmpName(), assignedDepartment.getDeptName());
            }
        }
        
        logger.info("Updated {} employees with proper department assignments", updated);
        return updated;
    }
    
    @Override
    public Map<String, Integer> getDepartmentEmployeeSummary() {
        logger.info("Generating department employee summary...");
        
        Map<String, Integer> summary = new HashMap<>();
        
        List<Department> allDepartments = departmentRepository.findAll();
        List<Employee> allEmployees = employeeRepository.findAll();
        
        for (Department dept : allDepartments) {
            long employeeCount = allEmployees.stream()
                .filter(emp -> emp.getDepartment() != null && 
                              emp.getDepartment().getDeptId() == dept.getDeptId())
                .count();
            
            summary.put(dept.getDeptName(), (int) employeeCount);
        }
        
        // Count employees without department
        long employeesWithoutDept = allEmployees.stream()
            .filter(emp -> emp.getDepartment() == null)
            .count();
        
        if (employeesWithoutDept > 0) {
            summary.put("No Department", (int) employeesWithoutDept);
        }
        
        logger.info("Department summary generated: {}", summary);
        return summary;
    }
    
    /**
     * Assigns department based on employee role
     */
    private Department assignDepartmentByRole(String role, List<Department> allDepartments, Department defaultDepartment) {
        if (role == null) {
            return defaultDepartment;
        }
        
        String roleLower = role.toLowerCase();
        
        // IT roles
        if (roleLower.contains("software") || roleLower.contains("developer") || 
            roleLower.contains("engineer") || roleLower.contains("technical") ||
            roleLower.contains("programmer") || roleLower.contains("architect")) {
            return findDepartmentByName(allDepartments, "Information Technology", defaultDepartment);
        }
        
        // HR roles
        if (roleLower.contains("hr") || roleLower.contains("human")) {
            return findDepartmentByName(allDepartments, "Human Resources", defaultDepartment);
        }
        
        // Finance roles
        if (roleLower.contains("finance") || roleLower.contains("accounting") || 
            roleLower.contains("financial")) {
            return findDepartmentByName(allDepartments, "Finance", defaultDepartment);
        }
        
        // Marketing roles
        if (roleLower.contains("marketing") || roleLower.contains("promotion")) {
            return findDepartmentByName(allDepartments, "Marketing", defaultDepartment);
        }
        
        // Sales roles
        if (roleLower.contains("sales") || roleLower.contains("business")) {
            return findDepartmentByName(allDepartments, "Sales", defaultDepartment);
        }
        
        // QA roles
        if (roleLower.contains("qa") || roleLower.contains("quality") || 
            roleLower.contains("test")) {
            return findDepartmentByName(allDepartments, "Quality Assurance", defaultDepartment);
        }
        
        // R&D roles
        if (roleLower.contains("research") || roleLower.contains("r&d")) {
            return findDepartmentByName(allDepartments, "Research and Development", defaultDepartment);
        }
        
        // Management roles - assign to Operations
        if (roleLower.contains("manager") || roleLower.contains("lead") || 
            roleLower.contains("director")) {
            return findDepartmentByName(allDepartments, "Operations", defaultDepartment);
        }
        
        // Default assignment
        return defaultDepartment;
    }
    
    /**
     * Finds department by name, returns default if not found
     */
    private Department findDepartmentByName(List<Department> departments, String name, Department defaultDepartment) {
        return departments.stream()
            .filter(dept -> dept.getDeptName().equalsIgnoreCase(name))
            .findFirst()
            .orElse(defaultDepartment);
    }
}