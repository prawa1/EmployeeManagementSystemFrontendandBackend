package com.example.demo.controller;

import java.util.List;

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
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.Department;
import com.example.demo.service.DepartmentService;

import jakarta.validation.Valid;

@RestController
@CrossOrigin(origins="http://localhost:4200")
@RequestMapping("/department/api")
public class DepartmentController {

    @Autowired
    private DepartmentService departmentService;

    // Add Department
    @PostMapping("/add")
    public ResponseEntity<Department> addDepartment(@Valid @RequestBody Department department) {
        Department savedDept = departmentService.addDepartment(department);
        return new ResponseEntity<>(savedDept, HttpStatus.CREATED);
    }

    // Get All Departments
    @GetMapping("/all")
    public ResponseEntity<List<Department>> getAllDepartments() {
        List<Department> departments = departmentService.getAllDepartments();
        return new ResponseEntity<>(departments, HttpStatus.OK);
    }

    // Get Department by ID
    @GetMapping("/get/{id}")
    public ResponseEntity<Department> getDepartmentById(@PathVariable("id") int id) {
        Department dept = departmentService.getDepartmentById(id);
        return new ResponseEntity<>(dept, HttpStatus.OK);
    }
    
    // Update Department by ID
    @PutMapping("/update/{id}")
    public ResponseEntity<Department> updateDepartmentById(@PathVariable("id") int id, @Valid @RequestBody Department department) {
        Department updated = departmentService.updateDepartmentById(id, department);
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }
    
    // Delete Department by ID
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteDepartmentById(@PathVariable("id") int id) {
        departmentService.deleteDepartmentById(id);
        return new ResponseEntity<>("Department deleted successfully", HttpStatus.OK);
    }

}
