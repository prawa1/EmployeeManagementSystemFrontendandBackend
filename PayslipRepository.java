package com.example.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.demo.model.Payslip;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, Long> {
    
    /**
     * Find payslip by employee ID and specific month/year
     * @param empId Employee ID
     * @param month Month name (e.g., "January")
     * @param year Year as string (e.g., "2025")
     * @return Optional payslip
     */
    Optional<Payslip> findByEmployeeEmpIdAndMonthAndYear(int empId, String month, String year);
    
    /**
     * Find all payslips for a specific employee
     * @param empId Employee ID
     * @return List of payslips for the employee
     */
    List<Payslip> findByEmployeeEmpId(int empId);
    
    /**
     * Find all payslips for a specific employee ordered by year and month (descending)
     * @param empId Employee ID
     * @return List of payslips ordered by latest first
     */
    @Query("SELECT p FROM Payslip p WHERE p.employee.empId = :empId ORDER BY p.year DESC, p.month DESC")
    List<Payslip> findByEmployeeEmpIdOrderByYearDescMonthDesc(@Param("empId") int empId);
    
    /**
     * Find the latest payslip for a specific employee
     * @param empId Employee ID
     * @return Optional latest payslip
     */
    @Query("SELECT p FROM Payslip p WHERE p.employee.empId = :empId ORDER BY p.year DESC, p.month DESC LIMIT 1")
    Optional<Payslip> findLatestPayslipByEmployeeId(@Param("empId") int empId);
    
    /**
     * Find all payslips for a specific employee with employee and department information eagerly loaded
     * @param empId Employee ID
     * @return List of payslips with employee and department data
     */
    @Query("SELECT p FROM Payslip p " +
           "LEFT JOIN FETCH p.employee e " +
           "LEFT JOIN FETCH e.department " +
           "WHERE e.empId = :empId " +
           "ORDER BY p.year DESC, p.month DESC")
    List<Payslip> findByEmployeeIdWithDepartment(@Param("empId") int empId);
    
    /**
     * Find payslip by employee ID and specific month/year with employee and department information
     * @param empId Employee ID
     * @param month Month name
     * @param year Year as string
     * @return Optional payslip with employee and department data
     */
    @Query("SELECT p FROM Payslip p " +
           "LEFT JOIN FETCH p.employee e " +
           "LEFT JOIN FETCH e.department " +
           "WHERE e.empId = :empId " +
           "AND p.month = :month AND p.year = :year")
    Optional<Payslip> findByEmployeeIdAndMonthYearWithDepartment(
        @Param("empId") int empId, 
        @Param("month") String month, 
        @Param("year") String year);
    
    /**
     * Find the latest payslip for a specific employee with employee and department information
     * @param empId Employee ID
     * @return Optional latest payslip with employee and department data
     */
    @Query("SELECT p FROM Payslip p " +
           "LEFT JOIN FETCH p.employee e " +
           "LEFT JOIN FETCH e.department " +
           "WHERE e.empId = :empId " +
           "ORDER BY p.year DESC, p.month DESC LIMIT 1")
    Optional<Payslip> findLatestPayslipByEmployeeIdWithDepartment(@Param("empId") int empId);
    
    /**
     * Find payslips by employee ID and year
     * @param empId Employee ID
     * @param year Year as string
     * @return List of payslips for the employee in the specified year
     */
    List<Payslip> findByEmployeeEmpIdAndYear(int empId, String year);
    
    /**
     * Find payslips by month and year (for all employees)
     * @param month Month name
     * @param year Year as string
     * @return List of payslips for the specified month and year
     */
    List<Payslip> findByMonthAndYear(String month, String year);
    
    /**
     * Find payslips by month and year with employee and department information eagerly loaded
     * Optimized for bulk operations to prevent N+1 queries
     * @param month Month name
     * @param year Year as string
     * @return List of payslips with employee and department data
     */
    @Query("SELECT DISTINCT p FROM Payslip p " +
           "LEFT JOIN FETCH p.employee e " +
           "LEFT JOIN FETCH e.department " +
           "WHERE p.month = :month AND p.year = :year " +
           "ORDER BY e.empId")
    List<Payslip> findByMonthAndYearWithDepartment(@Param("month") String month, @Param("year") String year);
    
    /**
     * Batch find payslips by employee IDs with department information
     * Prevents N+1 queries when fetching payslips for multiple employees
     * @param empIds List of employee IDs
     * @return List of payslips with employee and department data
     */
    @Query("SELECT DISTINCT p FROM Payslip p " +
           "LEFT JOIN FETCH p.employee e " +
           "LEFT JOIN FETCH e.department " +
           "WHERE e.empId IN :empIds " +
           "ORDER BY p.year DESC, p.month DESC, e.empId")
    List<Payslip> findByEmployeeIdInWithDepartment(@Param("empIds") java.util.List<Integer> empIds);
    
    /**
     * Find latest payslips for all employees with department information
     * Optimized query to get the most recent payslip for each employee
     * @return List of latest payslips with employee and department data
     */
    @Query("SELECT DISTINCT p FROM Payslip p " +
           "LEFT JOIN FETCH p.employee e " +
           "LEFT JOIN FETCH e.department " +
           "WHERE p.payslipId IN (" +
           "  SELECT MAX(p2.payslipId) FROM Payslip p2 GROUP BY p2.employee.empId" +
           ") " +
           "ORDER BY e.empId")
    List<Payslip> findLatestPayslipsForAllEmployeesWithDepartment();
    
    /**
     * Check if payslip exists for employee in specific month/year
     * @param empId Employee ID
     * @param month Month name
     * @param year Year as string
     * @return true if payslip exists, false otherwise
     */
    boolean existsByEmployeeEmpIdAndMonthAndYear(int empId, String month, String year);
}