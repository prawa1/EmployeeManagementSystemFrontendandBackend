package com.example.demo.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.service.DataMigrationService;
import com.example.demo.service.DataMigrationService.MigrationResult;
import com.example.demo.service.DataMigrationService.ValidationResult;

@RestController
@RequestMapping("/api/migration")
public class DataMigrationController {
    
    @Autowired
    private DataMigrationService dataMigrationService;
    
    /**
     * Performs complete department data migration
     */
    @PostMapping("/department")
    public ResponseEntity<MigrationResult> performDepartmentMigration() {
        MigrationResult result = dataMigrationService.performDepartmentMigration();
        return ResponseEntity.ok(result);
    }
    
    /**
     * Validates employee-department relationships
     */
    @GetMapping("/validate")
    public ResponseEntity<ValidationResult> validateRelationships() {
        ValidationResult result = dataMigrationService.validateEmployeeDepartmentRelationships();
        return ResponseEntity.ok(result);
    }
    
    /**
     * Gets department employee summary
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Integer>> getDepartmentSummary() {
        Map<String, Integer> summary = dataMigrationService.getDepartmentEmployeeSummary();
        return ResponseEntity.ok(summary);
    }
}