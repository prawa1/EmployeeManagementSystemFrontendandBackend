package com.example.demo.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.demo.model.Employee;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Integer>{
	
	public Employee findByEmailAndPassword(String email,String password);
	
	/**
	 * Find employee by ID with department information eagerly loaded
	 * @param empId Employee ID
	 * @return Optional employee with department data
	 */
	@Query("SELECT e FROM Employee e LEFT JOIN FETCH e.department WHERE e.empId = :empId")
	Optional<Employee> findByIdWithDepartment(@Param("empId") Integer empId);
	
	/**
	 * Find employee by email with department information eagerly loaded
	 * @param email Employee email
	 * @return Optional employee with department data
	 */
	@Query("SELECT e FROM Employee e LEFT JOIN FETCH e.department WHERE e.email = :email")
	Optional<Employee> findByEmailWithDepartment(@Param("email") String email);
	
	/**
	 * Find employee by email and password with department information eagerly loaded
	 * @param email Employee email
	 * @param password Employee password
	 * @return Optional employee with department data
	 */
	@Query("SELECT e FROM Employee e LEFT JOIN FETCH e.department WHERE e.email = :email AND e.password = :password")
	Optional<Employee> findByEmailAndPasswordWithDepartment(@Param("email") String email, @Param("password") String password);
	
	/**
	 * Find all employees with their department information eagerly loaded
	 * Uses DISTINCT to prevent duplicate results from JOIN FETCH
	 * @return List of employees with department data
	 */
	@Query("SELECT DISTINCT e FROM Employee e LEFT JOIN FETCH e.department ORDER BY e.empId")
	java.util.List<Employee> findAllWithDepartment();
	
	/**
	 * Find employees by department ID with department information eagerly loaded
	 * @param deptId Department ID
	 * @return List of employees in the specified department
	 */
	@Query("SELECT e FROM Employee e LEFT JOIN FETCH e.department WHERE e.department.deptId = :deptId")
	java.util.List<Employee> findByDepartmentIdWithDepartment(@Param("deptId") Integer deptId);
	
	/**
	 * Find employees by department name with department information eagerly loaded
	 * @param deptName Department name
	 * @return List of employees in the specified department
	 */
	@Query("SELECT e FROM Employee e LEFT JOIN FETCH e.department d WHERE LOWER(d.deptName) = LOWER(:deptName)")
	java.util.List<Employee> findByDepartmentNameWithDepartment(@Param("deptName") String deptName);
	
	/**
	 * Batch find employees by IDs with department information eagerly loaded
	 * Prevents N+1 queries when fetching multiple employees
	 * @param empIds List of employee IDs
	 * @return List of employees with department data
	 */
	@Query("SELECT DISTINCT e FROM Employee e LEFT JOIN FETCH e.department WHERE e.empId IN :empIds")
	java.util.List<Employee> findByIdInWithDepartment(@Param("empIds") java.util.List<Integer> empIds);
	
	/**
	 * Check if phone number exists for another employee (excluding the current employee)
	 * Used for validation during employee settings update
	 * @param phoneNo Phone number to check
	 * @param empId Current employee ID to exclude from check
	 * @return true if phone number exists for another employee
	 */
	@Query("SELECT COUNT(e) > 0 FROM Employee e WHERE e.phoneNo = :phoneNo AND e.empId != :empId")
	boolean existsByPhoneNoAndEmpIdNot(@Param("phoneNo") String phoneNo, @Param("empId") Integer empId);
	
	/**
	 * Find employee by phone number (for duplicate checking)
	 * @param phoneNo Phone number to search for
	 * @return Optional employee with the given phone number
	 */
	Optional<Employee> findByPhoneNo(String phoneNo);
	
	/**
	 * Check if email exists in the database
	 * Used for email availability validation during registration
	 * @param email Email to check
	 * @return true if email exists
	 */
	boolean existsByEmail(String email);
	
	/**
	 * Check if phone number exists in the database
	 * Used for phone availability validation during registration
	 * @param phoneNo Phone number to check
	 * @return true if phone number exists
	 */
	boolean existsByPhoneNo(String phoneNo);

}
