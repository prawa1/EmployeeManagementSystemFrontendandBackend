package com.example.demo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.config.DatabaseHealthIndicator;
import com.example.demo.config.DatabaseHealthIndicator.DatabaseHealthStatus;
import com.example.demo.model.Employee;
import com.example.demo.model.Leave;
import com.example.demo.service.DatabaseConnectionService;
import com.example.demo.service.EmployeeService;
import com.example.demo.service.LeaveService;

import jakarta.validation.Valid;

/**
 * Admin Controller for handling admin-specific operations
 * Implements requirements for admin functionality enhancement
 */
@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/admin")
public class AdminController {
    
    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);
    
    @Autowired
    private EmployeeService employeeService;
    
    @Autowired
    private LeaveService leaveService;
    
    @Autowired
    private DatabaseHealthIndicator databaseHealthIndicator;
    
    @Autowired
    private DatabaseConnectionService databaseConnectionService;
    
    /**
     * Get dashboard overview data
     * Requirement 7.1: Admin dashboard with real-time data
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        logger.info("Fetching admin dashboard data");
        
        try {
            Map<String, Object> dashboardData = new HashMap<>();
            
            // Get total employees count
            List<Employee> allEmployees = employeeService.getAllEmployee();
            dashboardData.put("totalEmployees", allEmployees.size());
            
            // Get pending leaves count
            List<Leave> pendingLeaves = leaveService.getAllPendingLeaves();
            dashboardData.put("pendingLeaves", pendingLeaves.size());
            
            // Get database connection status
            DatabaseHealthStatus healthStatus = databaseHealthIndicator.health();
            dashboardData.put("databaseStatus", healthStatus.getStatus());
            dashboardData.put("databaseHealthy", healthStatus.isHealthy());
            
            logger.info("Successfully fetched dashboard data: {} employees, {} pending leaves", 
                       allEmployees.size(), pendingLeaves.size());
            
            return ResponseEntity.ok(dashboardData);
            
        } catch (Exception e) {
            logger.error("Error fetching dashboard data", e);
            Map<String, Object> errorData = new HashMap<>();
            errorData.put("totalEmployees", 0);
            errorData.put("pendingLeaves", 0);
            errorData.put("databaseStatus", "DOWN");
            errorData.put("databaseHealthy", false);
            errorData.put("error", "Failed to fetch dashboard data: " + e.getMessage());
            
            return ResponseEntity.ok(errorData);
        }
    }
    
    /**
     * Get database connection pool status
     * Requirement 5.1, 5.2: Database connectivity monitoring
     */
    @GetMapping("/database/pool-status")
    public ResponseEntity<Map<String, Object>> getDatabasePoolStatus() {
        logger.info("Fetching database pool status");
        
        try {
            DatabaseHealthStatus healthStatus = databaseHealthIndicator.health();
            Map<String, Object> poolStatus = new HashMap<>();
            
            poolStatus.put("status", healthStatus.getStatus());
            poolStatus.put("healthy", healthStatus.isHealthy());
            poolStatus.put("details", healthStatus.getDetails());
            
            // Test connection
            boolean connectionTest = databaseConnectionService.testConnection();
            poolStatus.put("connectionTest", connectionTest);
            
            logger.info("Database pool status: {}", healthStatus.getStatus());
            
            return ResponseEntity.ok(poolStatus);
            
        } catch (Exception e) {
            logger.error("Error fetching database pool status", e);
            Map<String, Object> errorStatus = new HashMap<>();
            errorStatus.put("status", "DOWN");
            errorStatus.put("healthy", false);
            errorStatus.put("error", e.getMessage());
            errorStatus.put("connectionTest", false);
            
            return ResponseEntity.ok(errorStatus);
        }
    }
    
    /**
     * Test database connection
     * Requirement 5.1: Database connection testing
     */
    @GetMapping("/database/test-connection")
    public ResponseEntity<Map<String, Object>> testDatabaseConnection() {
        logger.info("Testing database connection");
        
        try {
            boolean isConnected = databaseConnectionService.testConnection();
            Map<String, Object> result = new HashMap<>();
            result.put("connected", isConnected);
            result.put("message", isConnected ? "Database connection successful" : "Database connection failed");
            
            logger.info("Database connection test result: {}", isConnected);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.error("Database connection test failed", e);
            Map<String, Object> result = new HashMap<>();
            result.put("connected", false);
            result.put("message", "Connection test failed: " + e.getMessage());
            result.put("error", e.getMessage());
            
            return ResponseEntity.ok(result);
        }
    }
    
    /**
     * Get database information
     * Requirement 5.1: Database connectivity monitoring
     */
    @GetMapping("/database/info")
    public ResponseEntity<Map<String, Object>> getDatabaseInfo() {
        logger.info("Fetching database information");
        
        try {
            DatabaseHealthStatus healthStatus = databaseHealthIndicator.health();
            Map<String, Object> info = new HashMap<>();
            
            info.put("database", "MySQL");
            info.put("port", "3306");
            info.put("status", healthStatus.getStatus());
            info.put("healthy", healthStatus.isHealthy());
            info.put("details", healthStatus.getDetails());
            
            logger.info("Database info retrieved successfully");
            
            return ResponseEntity.ok(info);
            
        } catch (Exception e) {
            logger.error("Error fetching database info", e);
            Map<String, Object> info = new HashMap<>();
            info.put("database", "MySQL");
            info.put("port", "3306");
            info.put("status", "DOWN");
            info.put("healthy", false);
            info.put("error", e.getMessage());
            
            return ResponseEntity.ok(info);
        }
    }
    
    /**
     * Admin login with hardcoded credentials
     * Provides secure admin access with predefined username and password
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> adminLogin(@RequestBody Map<String, String> loginRequest) {
        logger.info("Admin login attempt");
        
        try {
            String username = loginRequest.get("username");
            String password = loginRequest.get("password");
            
            // Hardcoded admin credentials
            final String ADMIN_USERNAME = "admin";
            final String ADMIN_PASSWORD = "admin123";
            
            Map<String, Object> response = new HashMap<>();
            
            if (ADMIN_USERNAME.equals(username) && ADMIN_PASSWORD.equals(password)) {
                logger.info("Successful admin login");
                response.put("success", true);
                response.put("message", "Admin login successful");
                response.put("role", "ADMIN");
                response.put("username", username);
                return ResponseEntity.ok(response);
            } else {
                logger.warn("Failed admin login attempt with username: {}", username);
                response.put("success", false);
                response.put("message", "Invalid admin credentials");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
        } catch (Exception e) {
            logger.error("Error during admin login", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}