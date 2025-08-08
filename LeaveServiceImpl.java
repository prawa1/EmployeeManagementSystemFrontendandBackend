package com.example.demo.serviceimpl;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Employee;
import com.example.demo.model.Leave;
import com.example.demo.repository.LeaveRepository;
import com.example.demo.service.DatabaseConnectionService;
import com.example.demo.service.LeaveService;

@Service
public class LeaveServiceImpl implements LeaveService{
	
	private static final Logger logger = LoggerFactory.getLogger(LeaveServiceImpl.class);
	
	@Autowired
    private LeaveRepository leaveRepo;
    
    @Autowired
    private DatabaseConnectionService databaseConnectionService;

    @Override
    public Leave applyLeave(Leave leave, int empId) {
        logger.info("Applying leave for employee ID: {}", empId);
        try {
            Employee emp = new Employee();
            emp.setEmpId(empId);
            leave.setEmployee(emp);
            leave.setStatus("PENDING");
            
            // Use connection retry logic for database save operation
            Leave savedLeave = databaseConnectionService.executeWithRetry(
                () -> leaveRepo.save(leave),
                "applyLeave"
            );
            
            logger.info("Successfully applied leave with ID: {} for employee: {}", savedLeave.getId(), empId);
            return savedLeave;
        } catch (Exception ex) {
            logger.error("Error applying leave for employee ID: {}", empId, ex);
            throw new RuntimeException("Failed to apply leave: " + ex.getMessage(), ex);
        }
    }

    @Override
    public List<Leave> getAllPendingLeaves() {
        logger.info("Fetching all pending leaves");
        try {
            // Use connection retry logic for database fetch operation
            List<Leave> pendingLeaves = databaseConnectionService.executeWithRetry(
                () -> leaveRepo.findByStatus("PENDING"),
                "getAllPendingLeaves"
            );
            
            logger.info("Successfully fetched {} pending leaves", pendingLeaves.size());
            return pendingLeaves;
        } catch (Exception ex) {
            logger.error("Error fetching pending leaves", ex);
            throw new RuntimeException("Failed to fetch pending leaves: " + ex.getMessage(), ex);
        }
    }

    @Override
    public Leave approveLeave(Long leaveId) {
        logger.info("Approving leave with ID: {}", leaveId);
        try {
            // Use connection retry logic for database fetch operation
            Leave leave = databaseConnectionService.executeWithRetry(
                () -> leaveRepo.findById(leaveId).orElseThrow(() -> 
                    new RuntimeException("Leave not found with ID: " + leaveId)),
                "findLeaveForApproval"
            );
            
            leave.setStatus("APPROVED");
            
            // Use connection retry logic for database save operation
            Leave approvedLeave = databaseConnectionService.executeWithRetry(
                () -> leaveRepo.save(leave),
                "approveLeave"
            );
            
            logger.info("Successfully approved leave with ID: {}", leaveId);
            return approvedLeave;
        } catch (Exception ex) {
            logger.error("Error approving leave with ID: {}", leaveId, ex);
            throw new RuntimeException("Failed to approve leave: " + ex.getMessage(), ex);
        }
    }

    @Override
    public Leave rejectLeave(Long leaveId) {
        logger.info("Rejecting leave with ID: {}", leaveId);
        try {
            // Use connection retry logic for database fetch operation
            Leave leave = databaseConnectionService.executeWithRetry(
                () -> leaveRepo.findById(leaveId).orElseThrow(() -> 
                    new RuntimeException("Leave not found with ID: " + leaveId)),
                "findLeaveForRejection"
            );
            
            leave.setStatus("REJECTED");
            
            // Use connection retry logic for database save operation
            Leave rejectedLeave = databaseConnectionService.executeWithRetry(
                () -> leaveRepo.save(leave),
                "rejectLeave"
            );
            
            logger.info("Successfully rejected leave with ID: {}", leaveId);
            return rejectedLeave;
        } catch (Exception ex) {
            logger.error("Error rejecting leave with ID: {}", leaveId, ex);
            throw new RuntimeException("Failed to reject leave: " + ex.getMessage(), ex);
        }
    }
	

}
