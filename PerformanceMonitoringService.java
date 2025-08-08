package com.example.demo.service;

import java.util.Map;

/**
 * Service interface for monitoring application performance,
 * particularly database queries and cache effectiveness.
 */
public interface PerformanceMonitoringService {
    
    /**
     * Record query execution time
     * @param queryType Type of query (e.g., "findEmployeeWithDepartment")
     * @param executionTimeMs Execution time in milliseconds
     */
    void recordQueryTime(String queryType, long executionTimeMs);
    
    /**
     * Record cache hit/miss statistics
     * @param cacheName Name of the cache
     * @param hit Whether it was a cache hit (true) or miss (false)
     */
    void recordCacheAccess(String cacheName, boolean hit);
    
    /**
     * Get performance statistics
     * @return Map containing performance metrics
     */
    Map<String, Object> getPerformanceStats();
    
    /**
     * Reset performance statistics
     */
    void resetStats();
    
    /**
     * Get cache statistics
     * @return Map containing cache metrics
     */
    Map<String, Object> getCacheStats();
    
    /**
     * Get query performance statistics
     * @return Map containing query performance metrics
     */
    Map<String, Object> getQueryStats();
}