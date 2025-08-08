package com.example.demo.controller;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.config.DatabaseHealthIndicator;
import com.example.demo.config.DatabaseHealthIndicator.DatabaseHealthStatus;

/**
 * Health Controller to provide health check endpoints
 * Replaces Spring Boot Actuator for basic health monitoring
 */
@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/actuator")
public class HealthController {
    
    private static final Logger logger = LoggerFactory.getLogger(HealthController.class);
    
    @Autowired
    private DatabaseHealthIndicator databaseHealthIndicator;
    
    /**
     * General health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        logger.debug("Health check requested");
        
        try {
            DatabaseHealthStatus dbHealth = databaseHealthIndicator.health();
            
            Map<String, Object> health = new HashMap<>();
            health.put("status", dbHealth.isHealthy() ? "UP" : "DOWN");
            
            Map<String, Object> components = new HashMap<>();
            Map<String, Object> dbComponent = new HashMap<>();
            dbComponent.put("status", dbHealth.getStatus());
            dbComponent.put("details", dbHealth.getDetails());
            
            components.put("db", dbComponent);
            health.put("components", components);
            
            return ResponseEntity.ok(health);
            
        } catch (Exception e) {
            logger.error("Health check failed", e);
            
            Map<String, Object> health = new HashMap<>();
            health.put("status", "DOWN");
            
            Map<String, Object> components = new HashMap<>();
            Map<String, Object> dbComponent = new HashMap<>();
            dbComponent.put("status", "DOWN");
            dbComponent.put("error", e.getMessage());
            
            components.put("db", dbComponent);
            health.put("components", components);
            
            return ResponseEntity.ok(health);
        }
    }
    
    /**
     * Database-specific health check endpoint
     */
    @GetMapping("/health/db")
    public ResponseEntity<Map<String, Object>> databaseHealth() {
        logger.debug("Database health check requested");
        
        try {
            DatabaseHealthStatus dbHealth = databaseHealthIndicator.health();
            
            Map<String, Object> health = new HashMap<>();
            health.put("status", dbHealth.getStatus());
            health.put("healthy", dbHealth.isHealthy());
            health.put("details", dbHealth.getDetails());
            
            logger.debug("Database health status: {}", dbHealth.getStatus());
            
            return ResponseEntity.ok(health);
            
        } catch (Exception e) {
            logger.error("Database health check failed", e);
            
            Map<String, Object> health = new HashMap<>();
            health.put("status", "DOWN");
            health.put("healthy", false);
            health.put("error", e.getMessage());
            
            return ResponseEntity.ok(health);
        }
    }
}