package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.model.Leave;

public interface LeaveRepository extends JpaRepository<Leave, Long>{
	List<Leave> findByStatus(String status);

}
