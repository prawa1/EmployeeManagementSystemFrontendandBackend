package com.example.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.demo.model.Department;

/**
 * Enhanced DepartmentRepository with optimized queries to prevent N+1 problems
 */
@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer>{

    /**
     * Find department by ID with employees eagerly loaded to prevent N+1 queries
     * @param deptId Department ID
     * @return Optional department with employees
     */
    @Query("SELECT d FROM Department d LEFT JOIN FETCH d.employees WHERE d.deptId = :deptId")
    Optional<Department> findByIdWithEmployees(@Param("deptId") Integer deptId);
    
    /**
     * Find all departments with employees eagerly loaded to prevent N+1 queries
     * @return List of departments with employees
     */
    @Query("SELECT DISTINCT d FROM Department d LEFT JOIN FETCH d.employees")
    List<Department> findAllWithEmployees();
    
    /**
     * Find department by name (case-insensitive)
     * @param deptName Department name
     * @return Optional department
     */
    @Query("SELECT d FROM Department d WHERE LOWER(d.deptName) = LOWER(:deptName)")
    Optional<Department> findByDeptNameIgnoreCase(@Param("deptName") String deptName);
    
    /**
     * Find departments by name pattern (for search functionality)
     * @param namePattern Name pattern to search
     * @return List of matching departments
     */
    @Query("SELECT d FROM Department d WHERE LOWER(d.deptName) LIKE LOWER(CONCAT('%', :namePattern, '%'))")
    List<Department> findByDeptNameContainingIgnoreCase(@Param("namePattern") String namePattern);
    
    /**
     * Count employees in a department
     * @param deptId Department ID
     * @return Number of employees in the department
     */
    @Query("SELECT COUNT(e) FROM Employee e WHERE e.department.deptId = :deptId")
    Long countEmployeesByDepartmentId(@Param("deptId") Integer deptId);
    
    /**
     * Check if department exists by name (for validation)
     * @param deptName Department name
     * @return true if department exists
     */
    boolean existsByDeptNameIgnoreCase(String deptName);
}
