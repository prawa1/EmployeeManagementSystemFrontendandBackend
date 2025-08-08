package com.example.demo.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.service.PerformanceMonitoringService;

/**
 * REST controller for monitoring application performance metrics.
 * Provides endpoints to view cache effectiveness and query performance.
 */
@RestController
@RequestMapping("/api/performance")
public class PerformanceController {
    
    @Autowired
    private PerformanceMonitoringService performanceMonitoringService;
    
    /**
     * Get overall performance statistics
     * @return Performance metrics including cache and query stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getPerformanceStats() {
        Map<String, Object> stats = performanceMonitoringService.getPerformanceStats();
        return ResponseEntity.ok(stats);
    }
    
    /**
     * Get cache-specific statistics
     * @return Cache hit ratios and access counts
     */
    @GetMapping("/cache")
    public ResponseEntity<Map<String, Object>> getCacheStats() {
        Map<String, Object> cacheStats = performanceMonitoringService.getCacheStats();
        return ResponseEntity.ok(cacheStats);
    }
    
    /**
     * Get query performance statistics
     * @return Query execution times and counts
     */
    @GetMapping("/queries")
    public ResponseEntity<Map<String, Object>> getQueryStats() {
        Map<String, Object> queryStats = performanceMonitoringService.getQueryStats();
        return ResponseEntity.ok(queryStats);
    }
    
    /**
     * Reset all performance statistics
     * @return Success message
     */
    @PostMapping("/reset")
    public ResponseEntity<String> resetStats() {
        performanceMonitoringService.resetStats();
        return ResponseEntity.ok("Performance statistics reset successfully");
    }
}