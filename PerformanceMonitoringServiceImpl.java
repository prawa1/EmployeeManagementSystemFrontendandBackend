package com.example.demo.serviceimpl;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.service.PerformanceMonitoringService;

/**
 * Implementation of PerformanceMonitoringService for tracking
 * database query performance and cache effectiveness.
 */
@Service
public class PerformanceMonitoringServiceImpl implements PerformanceMonitoringService {
    
    private static final Logger logger = LoggerFactory.getLogger(PerformanceMonitoringServiceImpl.class);
    
    // Query performance tracking
    private final Map<String, AtomicLong> queryExecutionTimes = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> queryExecutionCounts = new ConcurrentHashMap<>();
    
    // Cache performance tracking
    private final Map<String, AtomicLong> cacheHits = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> cacheMisses = new ConcurrentHashMap<>();
    
    @Override
    public void recordQueryTime(String queryType, long executionTimeMs) {
        queryExecutionTimes.computeIfAbsent(queryType, k -> new AtomicLong(0))
                          .addAndGet(executionTimeMs);
        queryExecutionCounts.computeIfAbsent(queryType, k -> new AtomicLong(0))
                           .incrementAndGet();
        
        // Log slow queries (> 100ms)
        if (executionTimeMs > 100) {
            logger.warn("Slow query detected: {} took {}ms", queryType, executionTimeMs);
        } else {
            logger.debug("Query executed: {} took {}ms", queryType, executionTimeMs);
        }
    }
    
    @Override
    public void recordCacheAccess(String cacheName, boolean hit) {
        if (hit) {
            cacheHits.computeIfAbsent(cacheName, k -> new AtomicLong(0)).incrementAndGet();
            logger.debug("Cache hit for: {}", cacheName);
        } else {
            cacheMisses.computeIfAbsent(cacheName, k -> new AtomicLong(0)).incrementAndGet();
            logger.debug("Cache miss for: {}", cacheName);
        }
    }
    
    @Override
    public Map<String, Object> getPerformanceStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("queryStats", getQueryStats());
        stats.put("cacheStats", getCacheStats());
        return stats;
    }
    
    @Override
    public void resetStats() {
        logger.info("Resetting performance statistics");
        queryExecutionTimes.clear();
        queryExecutionCounts.clear();
        cacheHits.clear();
        cacheMisses.clear();
    }
    
    @Override
    public Map<String, Object> getCacheStats() {
        Map<String, Object> cacheStats = new HashMap<>();
        
        // Calculate cache hit ratios
        Map<String, Double> hitRatios = new HashMap<>();
        for (String cacheName : cacheHits.keySet()) {
            long hits = cacheHits.get(cacheName).get();
            long misses = cacheMisses.getOrDefault(cacheName, new AtomicLong(0)).get();
            long total = hits + misses;
            
            if (total > 0) {
                double hitRatio = (double) hits / total * 100;
                hitRatios.put(cacheName, hitRatio);
            }
        }
        
        cacheStats.put("hitRatios", hitRatios);
        cacheStats.put("totalHits", cacheHits.entrySet().stream()
                .mapToLong(entry -> entry.getValue().get()).sum());
        cacheStats.put("totalMisses", cacheMisses.entrySet().stream()
                .mapToLong(entry -> entry.getValue().get()).sum());
        
        return cacheStats;
    }
    
    @Override
    public Map<String, Object> getQueryStats() {
        Map<String, Object> queryStats = new HashMap<>();
        
        // Calculate average query times
        Map<String, Double> averageQueryTimes = new HashMap<>();
        for (String queryType : queryExecutionTimes.keySet()) {
            long totalTime = queryExecutionTimes.get(queryType).get();
            long count = queryExecutionCounts.get(queryType).get();
            
            if (count > 0) {
                double averageTime = (double) totalTime / count;
                averageQueryTimes.put(queryType, averageTime);
            }
        }
        
        queryStats.put("averageQueryTimes", averageQueryTimes);
        queryStats.put("totalQueries", queryExecutionCounts.entrySet().stream()
                .mapToLong(entry -> entry.getValue().get()).sum());
        queryStats.put("queryExecutionCounts", queryExecutionCounts.entrySet().stream()
                .collect(HashMap::new, 
                        (map, entry) -> map.put(entry.getKey(), entry.getValue().get()),
                        HashMap::putAll));
        
        return queryStats;
    }
}