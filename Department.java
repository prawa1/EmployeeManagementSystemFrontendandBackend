package com.example.demo.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(name="department_table")
public class Department {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "dept_id")
    private int deptId;

    @NotBlank(message = "Department name should not be blank")
    @Size(max = 50, message = "Department name should not exceed 50 characters")
    @Column(name = "dept_name", length = 50, nullable = false, unique = true)
    private String deptName;

    @Size(max = 200, message = "Description should not exceed 200 characters")
    @Column(name = "description", length = 200)
    private String description;
    
    @OneToMany(mappedBy = "department")
    @JsonIgnore
    private List<Employee> employees;

	public int getDeptId() {
		return deptId;
	}

	public void setDeptId(int deptId) {
		this.deptId = deptId;
	}

	public String getDeptName() {
		return deptName;
	}

	public void setDeptName(String deptName) {
		this.deptName = deptName;
	}

	public List<Employee> getEmployees() {
		return employees;
	}

	public void setEmployees(List<Employee> employees) {
		this.employees = employees;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	@Override
	public String toString() {
		return "Department [deptId=" + deptId + ", deptName=" + deptName + ", description=" + description
				+ ", employees=" + employees + "]";
	}

	
    
}
