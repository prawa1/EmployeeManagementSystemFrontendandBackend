package com.example.demo.service;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/**
 * Service for managing database connections with retry logic and error handling
 * Implements requirements 5.2, 5.4, 5.5, 5.6 for connection management
 */
@Service
public class DatabaseConnectionService {
    
    private static final Logger logger = LoggerFactory.getLogger(DatabaseConnectionService.class);
    
    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final long INITIAL_RETRY_DELAY_MS = 1000; // 1 second
    private static final double BACKOFF_MULTIPLIER = 2.0;
    
    @Autowired
    private DataSource dataSource;
    
    /**
     * Test database connection health
     * Implements requirement 5.1 for connection testing
     */
    public boolean testConnection() {
        logger.debug("Testing database connection");
        
        try (Connection connection = dataSource.getConnection()) {
            boolean isValid = connection.isValid(5);
            if (isValid) {
                logger.debug("Database connection test successful");
            } else {
                logger.warn("Database connection test failed - connection invalid");
            }
            return isValid;
        } catch (SQLException e) {
            logger.error("Database connection test failed: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Execute database operation with retry logic and exponential backoff
     * Implements requirement 5.2 for automatic reconnection with exponential backoff
     */
    public <T> T executeWithRetry(Supplier<T> operation, String operationName) throws DataAccessException {
        Exception lastException = null;
        
        for (int attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                logger.debug("Executing {} - attempt {}/{}", operationName, attempt, MAX_RETRY_ATTEMPTS);
                T result = operation.get();
                
                if (attempt > 1) {
                    logger.info("Successfully executed {} after {} attempts", operationName, attempt);
                }
                
                return result;
                
            } catch (Exception e) {
                lastException = e;
                logger.warn("Attempt {}/{} failed for {}: {}", attempt, MAX_RETRY_ATTEMPTS, operationName, e.getMessage());
                
                if (attempt < MAX_RETRY_ATTEMPTS && isRetryableException(e)) {
                    long delayMs = calculateRetryDelay(attempt);
                    logger.info("Retrying {} in {} ms", operationName, delayMs);
                    
                    try {
                        TimeUnit.MILLISECONDS.sleep(delayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        logger.error("Retry sleep interrupted for {}", operationName);
                        throw new DataAccessException("Operation interrupted during retry", ie) {};
                    }
                } else {
                    break;
                }
            }
        }
        
        logger.error("All retry attempts failed for {}", operationName);
        if (lastException instanceof DataAccessException) {
            throw (DataAccessException) lastException;
        } else {
            throw new DataAccessException("Operation failed after " + MAX_RETRY_ATTEMPTS + " attempts: " + operationName, lastException) {};
        }
    }
    
    /**
     * Calculate retry delay with exponential backoff
     * Implements requirement 5.2 for exponential backoff strategy
     */
    private long calculateRetryDelay(int attemptNumber) {
        return (long) (INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attemptNumber - 1));
    }
    
    /**
     * Determine if an exception is retryable
     * Implements requirement 5.3 for error handling
     */
    private boolean isRetryableException(Exception e) {
        if (e instanceof SQLException) {
            SQLException sqlEx = (SQLException) e;
            String sqlState = sqlEx.getSQLState();
            int errorCode = sqlEx.getErrorCode();
            
            // Connection-related SQL states that are retryable
            return sqlState != null && (
                sqlState.startsWith("08") ||  // Connection exception
                sqlState.equals("40001") ||   // Serialization failure
                sqlState.equals("40P01") ||   // Deadlock detected
                errorCode == 1040 ||          // Too many connections
                errorCode == 1042 ||          // Can't get hostname
                errorCode == 1043 ||          // Bad handshake
                errorCode == 2002 ||          // Can't connect to server
                errorCode == 2003 ||          // Can't connect to server on socket
                errorCode == 2006 ||          // MySQL server has gone away
                errorCode == 2013             // Lost connection during query
            );
        }
        
        if (e instanceof DataAccessException) {
            String message = e.getMessage();
            return message != null && (
                message.contains("Connection") ||
                message.contains("timeout") ||
                message.contains("network") ||
                message.contains("refused")
            );
        }
        
        return false;
    }
    
    /**
     * Get connection pool statistics for monitoring
     * Implements requirement 5.6 for connection monitoring
     */
    public String getConnectionPoolStats() {
        try {
            if (dataSource instanceof com.zaxxer.hikari.HikariDataSource) {
                com.zaxxer.hikari.HikariDataSource hikariDS = (com.zaxxer.hikari.HikariDataSource) dataSource;
                com.zaxxer.hikari.HikariPoolMXBean poolBean = hikariDS.getHikariPoolMXBean();
                
                if (poolBean != null) {
                    return String.format(
                        "Connection Pool Stats - Active: %d, Idle: %d, Total: %d, Waiting: %d",
                        poolBean.getActiveConnections(),
                        poolBean.getIdleConnections(),
                        poolBean.getTotalConnections(),
                        poolBean.getThreadsAwaitingConnection()
                    );
                }
            }
            return "Connection pool statistics not available";
        } catch (Exception e) {
            logger.debug("Could not retrieve connection pool statistics: {}", e.getMessage());
            return "Connection pool statistics unavailable: " + e.getMessage();
        }
    }
    
    /**
     * Check if database is currently available
     * Implements requirement 5.4 for availability checking
     */
    public boolean isDatabaseAvailable() {
        try {
            return testConnection();
        } catch (Exception e) {
            logger.debug("Database availability check failed: {}", e.getMessage());
            return false;
        }
    }
}