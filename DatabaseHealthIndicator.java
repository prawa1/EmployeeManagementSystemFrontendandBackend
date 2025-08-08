package com.example.demo.config;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Database health indicator to monitor MySQL connectivity on port 3306
 * Implements requirement 5.1, 5.2, 5.6 for database connection monitoring
 */
@Component
public class DatabaseHealthIndicator {
    
    private static final Logger logger = LoggerFactory.getLogger(DatabaseHealthIndicator.class);
    
    @Autowired
    private DataSource dataSource;
    
    /**
     * Check database health and return status information
     */
    public DatabaseHealthStatus health() {
        logger.debug("Checking database health status");
        
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(5)) {
                logger.debug("Database connection is healthy");
                
                Map<String, Object> details = new HashMap<>();
                details.put("database", "MySQL");
                details.put("port", "3306");
                details.put("status", "Connected");
                details.put("connection_pool", getConnectionPoolInfo());
                
                return new DatabaseHealthStatus(true, "UP", details);
            } else {
                logger.warn("Database connection is invalid");
                
                Map<String, Object> details = new HashMap<>();
                details.put("database", "MySQL");
                details.put("port", "3306");
                details.put("status", "Connection invalid");
                
                return new DatabaseHealthStatus(false, "DOWN", details);
            }
        } catch (SQLException e) {
            logger.error("Database health check failed: {}", e.getMessage());
            
            Map<String, Object> details = new HashMap<>();
            details.put("database", "MySQL");
            details.put("port", "3306");
            details.put("error", e.getMessage());
            details.put("error_code", e.getErrorCode());
            
            return new DatabaseHealthStatus(false, "DOWN", details);
        }
    }
    
    /**
     * Get connection pool information for health monitoring
     */
    private String getConnectionPoolInfo() {
        try {
            // For HikariCP, we can get pool information
            if (dataSource instanceof com.zaxxer.hikari.HikariDataSource) {
                com.zaxxer.hikari.HikariDataSource hikariDS = (com.zaxxer.hikari.HikariDataSource) dataSource;
                com.zaxxer.hikari.HikariPoolMXBean poolBean = hikariDS.getHikariPoolMXBean();
                if (poolBean != null) {
                    return String.format("Active: %d, Idle: %d, Total: %d", 
                        poolBean.getActiveConnections(),
                        poolBean.getIdleConnections(),
                        poolBean.getTotalConnections());
                }
            }
            return "Pool info not available";
        } catch (Exception e) {
            logger.debug("Could not retrieve connection pool info: {}", e.getMessage());
            return "Pool info unavailable";
        }
    }
    
    /**
     * Simple health status class to replace Spring Boot Actuator Health
     */
    public static class DatabaseHealthStatus {
        private final boolean healthy;
        private final String status;
        private final Map<String, Object> details;
        
        public DatabaseHealthStatus(boolean healthy, String status, Map<String, Object> details) {
            this.healthy = healthy;
            this.status = status;
            this.details = details;
        }
        
        public boolean isHealthy() {
            return healthy;
        }
        
        public String getStatus() {
            return status;
        }
        
        public Map<String, Object> getDetails() {
            return details;
        }
        
        @Override
        public String toString() {
            return String.format("DatabaseHealthStatus{healthy=%s, status='%s', details=%s}", 
                healthy, status, details);
        }
    }
}