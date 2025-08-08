package com.example.demo.service;

import java.util.List;

import com.example.demo.model.Leave;

public interface LeaveService {
	
	Leave applyLeave(Leave leave, int empId);
    List<Leave> getAllPendingLeaves();
    Leave approveLeave(Long leaveId);
    Leave rejectLeave(Long leaveId);

}
