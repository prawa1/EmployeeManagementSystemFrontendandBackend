package com.example.demo.service;

import java.util.List;

import com.example.demo.model.Department;

public interface DepartmentService {
    Department addDepartment(Department department);
    List<Department> getAllDepartments();
    Department getDepartmentById(int id);
    Department updateDepartmentById(int id, Department department);
    void deleteDepartmentById(int id);
}
