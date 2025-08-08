package com.example.demo.serviceimpl;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.example.demo.model.Department;
import com.example.demo.repository.DepartmentRepository;
import com.example.demo.service.DepartmentService;

/**
 * Enhanced DepartmentService implementation with caching for performance optimization.
 * Department data is cached since it changes infrequently.
 */
@Service
public class DepartmentServiceImpl implements DepartmentService {

    private static final Logger logger = LoggerFactory.getLogger(DepartmentServiceImpl.class);

    @Autowired
    private DepartmentRepository departmentRepository;

    @Override
    @CacheEvict(value = "departments", allEntries = true)
    public Department addDepartment(Department department) {
        logger.info("Adding new department: {}", department.getDeptName());
        Department savedDepartment = departmentRepository.save(department);
        logger.info("Successfully added department with ID: {}", savedDepartment.getDeptId());
        return savedDepartment;
    }

    @Override
    @Cacheable(value = "departments", key = "'all'")
    public List<Department> getAllDepartments() {
        logger.info("Fetching all departments from database (cache miss)");
        List<Department> departments = departmentRepository.findAll();
        logger.info("Retrieved {} departments from database", departments.size());
        return departments;
    }

    @Override
    @Cacheable(value = "departmentById", key = "#id")
    public Department getDepartmentById(int id) {
        logger.info("Fetching department with ID: {} from database (cache miss)", id);
        Department department = departmentRepository.findById(id).orElse(null);
        if (department != null) {
            logger.info("Retrieved department: {} from database", department.getDeptName());
        } else {
            logger.warn("Department not found with ID: {}", id);
        }
        return department;
    }

    @Override
    @CachePut(value = "departmentById", key = "#id")
    @CacheEvict(value = "departments", allEntries = true)
    public Department updateDepartmentById(int id, Department department) {
        logger.info("Updating department with ID: {}", id);
        department.setDeptId(id);
        Department updatedDepartment = departmentRepository.save(department);
        logger.info("Successfully updated department with ID: {}", id);
        return updatedDepartment;
    }

    @Override
    @CacheEvict(value = {"departmentById", "departments"}, allEntries = true)
    public void deleteDepartmentById(int id) {
        logger.info("Deleting department with ID: {}", id);
        departmentRepository.deleteById(id);
        logger.info("Successfully deleted department with ID: {}", id);
    }
}
