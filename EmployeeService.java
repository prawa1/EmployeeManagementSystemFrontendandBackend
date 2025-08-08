package com.example.demo.service;

import java.util.List;

import com.example.demo.model.Employee;

import jakarta.validation.Valid;

public interface EmployeeService {
	
	public Employee addEmployee(Employee employee,int deptId);
	
	public List<Employee> getAllEmployee();
	
	public Employee getEmployeeById(int empId);
	
	public void deleteEmployeeById(int empId);
	
	public Employee updateEmployeeById(int empId, Employee employee);
	
	public Employee employeeLogin(Employee employee);

	public List<Employee> addMultipleEmployees(List<@Valid Employee> employees);
	
	public Employee updateEmployeeSettings(int empId, String empName, String phoneNo);
	
	public boolean isEmailAvailable(String email);
	
	public boolean isPhoneAvailable(String phone);

}
