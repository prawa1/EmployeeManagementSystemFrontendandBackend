package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.Leave;
import com.example.demo.service.LeaveService;

import jakarta.validation.Valid;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/leave/api")
public class LeaveController {
	@Autowired
    private LeaveService leaveService;

    @PostMapping("/apply/{empId}")
    public ResponseEntity<Leave> applyLeave(@Valid @RequestBody Leave leave, @PathVariable int empId) {
        return ResponseEntity.ok(leaveService.applyLeave(leave, empId));
    }

    @GetMapping("/pending")
    public List<Leave> getAllPendingLeaves() {
        return leaveService.getAllPendingLeaves();
    }
    
    @GetMapping("/pending/count")
    public ResponseEntity<Integer> getPendingLeavesCount() {
        List<Leave> pendingLeaves = leaveService.getAllPendingLeaves();
        return ResponseEntity.ok(pendingLeaves.size());
    }

    @PutMapping("/approve/{leaveId}")
    public ResponseEntity<Leave> approveLeave(@PathVariable Long leaveId) {
        return ResponseEntity.ok(leaveService.approveLeave(leaveId));
    }

    @PutMapping("/reject/{leaveId}")
    public ResponseEntity<Leave> rejectLeave(@PathVariable Long leaveId) {
        return ResponseEntity.ok(leaveService.rejectLeave(leaveId));
    }
	

}
