package com.example.demo.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;

@Entity
@Table(name="employee_table")
public class Employee {
	
	@Id
	@GeneratedValue(generator="emp_seq")
	@SequenceGenerator(name="emp_seq",sequenceName="emp_sequence_table",allocationSize=1,initialValue=1000)
	@Column(name="Employee_Id")
	private int empId;
	
	@NotNull(message="Name should not be blank")
	@Column(name="Employee_Name",length=30,nullable=false)
	private String empName;
	
	@NotNull(message="Phone Number should not be blank")
	@Column(name="Phone_Number",length=10,unique=true,nullable=false)
	private String phoneNo;
	
	@Email(message="Enter valid email id")
	@Column(name="EmailId",length=30,unique=true)
	private String email;
	
	@Pattern(regexp="[a-z][A-Z][0-9]{8,10}",message="Enter Valid Password")
	@Column(name="Password",length=20)
	private String password;
	
	@Column(name="Role",length=30)
	private String role;
	
	@Column(name="Manager_Id")
	private int managerId;
	
	@Column(name="Salary")
	@Min(10000)
	@Max(2500000)
	private float salary;
	
	@NotNull(message="Address should not be blank")
	@Column(name="Address",length=30, nullable = false)
	private String address;
	
	@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
	@NotNull(message="Date of Joining should not be blank")
	@PastOrPresent
	@Column(name="Date_of_Joining")
	private LocalDate joiningDate; //dd-MM-yyyy
	
	@Column(name="Gender")
	private String gender;
	
	@ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    @JsonIgnoreProperties("employees")
    private Department department;
	
	@OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
	@JsonIgnore
	private List<Leave> leaves = new ArrayList<>();
	
	@OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
	@JsonIgnore
	private List<Payslip> payslips = new ArrayList<>();


	public List<Leave> getLeaves() {
		return leaves;
	}

	public void setLeaves(List<Leave> leaves) {
		this.leaves = leaves;
	}

	public int getEmpId() {
		return empId;
	}

	public void setEmpId(int empId) {
		this.empId = empId;
	}

	public String getEmpName() {
		return empName;
	}

	public void setEmpName(String empName) {
		this.empName = empName;
	}

	public String getPhoneNo() {
		return phoneNo;
	}

	public void setPhoneNo(String phoneNo) {
		this.phoneNo = phoneNo;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getRole() {
		return role;
	}

	public void setRole(String role) {
		this.role = role;
	}

	public int getManagerId() {
		return managerId;
	}

	public void setManagerId(int managerId) {
		this.managerId = managerId;
	}

	public float getSalary() {
		return salary;
	}

	public void setSalary(float salary) {
		this.salary = salary;
	}

	public String getAddress() {
		return address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public LocalDate getJoiningDate() {
		return joiningDate;
	}

	public void setJoiningDate(LocalDate joiningDate) {
		this.joiningDate = joiningDate;
	}

	public String getGender() {
		return gender;
	}

	public void setGender(String gender) {
		this.gender = gender;
	}

	public Department getDepartment() {
		return department;
	}

	public void setDepartment(Department department) {
		this.department = department;
	}

	public List<Payslip> getPayslips() {
		return payslips;
	}

	public void setPayslips(List<Payslip> payslips) {
		this.payslips = payslips;
	}

}
