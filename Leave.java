package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Entity
@Table(name = "leave_table")
public class Leave {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "From date should not be blank")
    @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "From date should be in YYYY-MM-DD format")
    private String fromDate;
    
    @NotBlank(message = "To date should not be blank")
    @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "To date should be in YYYY-MM-DD format")
    private String toDate;
    
    @NotBlank(message = "Reason should not be blank")
    private String reason;

    
    private String status = "PENDING";  // Default when applied

    @ManyToOne
    @JoinColumn(name = "employee_id")
    @JsonIgnoreProperties("leaves")
    private Employee employee;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getFromDate() {
		return fromDate;
	}

	public void setFromDate(String fromDate) {
		this.fromDate = fromDate;
	}

	public String getToDate() {
		return toDate;
	}

	public void setToDate(String toDate) {
		this.toDate = toDate;
	}

	public String getReason() {
		return reason;
	}

	public void setReason(String reason) {
		this.reason = reason;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public Employee getEmployee() {
		return employee;
	}

	public void setEmployee(Employee employee) {
		this.employee = employee;
	}
   

}
