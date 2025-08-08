package com.example.demo.dto;

import java.time.LocalDate;

import com.example.demo.model.Employee;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * Data Transfer Object for Employee API responses.
 * This DTO ensures proper serialization of employee data including department information.
 */
public class EmployeeResponseDTO {
    
    private int empId;
    private String empName;
    private String phoneNo;
    private String email;
    private String role;
    private int managerId;
    private float salary;
    private String address;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate joiningDate;
    
    private String gender;
    private DepartmentDTO department;
    
    // Default constructor
    public EmployeeResponseDTO() {
    }
    
    // Constructor from Employee entity with enhanced department handling
    public EmployeeResponseDTO(Employee employee) {
        if (employee != null) {
            this.empId = employee.getEmpId();
            this.empName = employee.getEmpName() != null ? employee.getEmpName() : "Unknown Employee";
            this.phoneNo = employee.getPhoneNo();
            this.email = employee.getEmail();
            this.role = employee.getRole();
            this.managerId = employee.getManagerId();
            this.salary = employee.getSalary();
            this.address = employee.getAddress();
            this.joiningDate = employee.getJoiningDate();
            this.gender = employee.getGender();
            
            // Enhanced department handling with null-safety
            if (employee.getDepartment() != null) {
                this.department = new DepartmentDTO(employee.getDepartment());
            } else {
                // Create a default department DTO for cases where department is not assigned
                this.department = new DepartmentDTO(0, "Department Not Assigned", null);
            }
        } else {
            // Initialize with default values if employee is null
            this.empId = 0;
            this.empName = "Unknown Employee";
            this.phoneNo = "";
            this.email = "";
            this.role = "";
            this.managerId = 0;
            this.salary = 0.0f;
            this.address = "";
            this.joiningDate = null;
            this.gender = "";
            this.department = new DepartmentDTO(0, "Department Not Assigned", null);
        }
    }
    
    // Static factory method for creating DTO from Employee entity
    public static EmployeeResponseDTO fromEmployee(Employee employee) {
        return new EmployeeResponseDTO(employee);
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
    
    public String getPhoneNo() {
        return phoneNo;
    }
    
    public void setPhoneNo(String phoneNo) {
        this.phoneNo = phoneNo;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getRole() {
        return role;
    }
    
    public void setRole(String role) {
        this.role = role;
    }
    
    public int getManagerId() {
        return managerId;
    }
    
    public void setManagerId(int managerId) {
        this.managerId = managerId;
    }
    
    public float getSalary() {
        return salary;
    }
    
    public void setSalary(float salary) {
        this.salary = salary;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public LocalDate getJoiningDate() {
        return joiningDate;
    }
    
    public void setJoiningDate(LocalDate joiningDate) {
        this.joiningDate = joiningDate;
    }
    
    public String getGender() {
        return gender;
    }
    
    public void setGender(String gender) {
        this.gender = gender;
    }
    
    public DepartmentDTO getDepartment() {
        return department;
    }
    
    public void setDepartment(DepartmentDTO department) {
        this.department = department;
    }
    
    @Override
    public String toString() {
        return "EmployeeResponseDTO{" +
                "empId=" + empId +
                ", empName='" + empName + '\'' +
                ", phoneNo='" + phoneNo + '\'' +
                ", email='" + email + '\'' +
                ", role='" + role + '\'' +
                ", managerId=" + managerId +
                ", salary=" + salary +
                ", address='" + address + '\'' +
                ", joiningDate=" + joiningDate +
                ", gender='" + gender + '\'' +
                ", department=" + department +
                '}';
    }
    
    /**
     * Nested DTO class for Department information
     */
    public static class DepartmentDTO {
        private int deptId;
        private String deptName;
        private String description;
        
        // Default constructor
        public DepartmentDTO() {
        }
        
        // Constructor with parameters
        public DepartmentDTO(int deptId, String deptName, String description) {
            this.deptId = deptId;
            this.deptName = deptName != null ? deptName : "Department Not Assigned";
            this.description = description;
        }
        
        // Constructor from Department entity
        public DepartmentDTO(com.example.demo.model.Department department) {
            if (department != null) {
                this.deptId = department.getDeptId();
                this.deptName = department.getDeptName() != null && !department.getDeptName().trim().isEmpty() 
                              ? department.getDeptName() : "Department Not Assigned";
                this.description = department.getDescription();
            } else {
                this.deptId = 0;
                this.deptName = "Department Not Assigned";
                this.description = null;
            }
        }
        
        // Getters and Setters
        public int getDeptId() {
            return deptId;
        }
        
        public void setDeptId(int deptId) {
            this.deptId = deptId;
        }
        
        public String getDeptName() {
            return deptName;
        }
        
        public void setDeptName(String deptName) {
            this.deptName = deptName;
        }
        
        public String getDescription() {
            return description;
        }
        
        public void setDescription(String description) {
            this.description = description;
        }
        
        @Override
        public String toString() {
            return "DepartmentDTO{" +
                    "deptId=" + deptId +
                    ", deptName='" + deptName + '\'' +
                    ", description='" + description + '\'' +
                    '}';
        }
    }
}