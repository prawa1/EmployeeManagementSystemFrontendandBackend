import { Component, OnInit } from '@angular/core';
import { Adminservice } from '../../services/adminservice';
import { Router } from '@angular/router';

@Component({
  selector: 'app-myprofile',
  standalone: false,
  templateUrl: './myprofile.html',
  styleUrl: './myprofile.css'
})
export class Myprofile implements OnInit{
  empId:any;
  employee:any;
  isLoading: boolean = false;
  errorMessage: string = '';
  constructor(private adminService: Adminservice,private router:Router){}

  ngOnInit(): void {
    this.empId = sessionStorage.getItem("empId");
    
    if (this.empId) {
      this.loadEmployeeData();
    } else {
      this.errorMessage = 'Session expired. Please login again.';
      setTimeout(() => {
        this.logout();
      }, 3000);
    }
  }

  loadEmployeeData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.adminService.getEmployeeById(this.empId).subscribe({
      next: (data: any) => {
        this.employee = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employee data:', error);
        this.isLoading = false;
        
        if (error.status === 401) {
          this.errorMessage = 'Session expired. Please login again.';
          setTimeout(() => {
            this.logout();
          }, 3000);
        } else if (error.status === 404) {
          this.errorMessage = 'Employee data not found.';
        } else if (error.status === 500) {
          this.errorMessage = 'Server error occurred. Please try again later.';
        } else {
          this.errorMessage = 'Failed to load employee data. Please try again.';
        }
      }
    });
  }

  /**
   * Helper method to safely extract department name from employee data
   * @returns Department name or fallback text
   */
  getDepartmentName(): string {
    if (this.employee?.department?.deptName && 
        this.employee.department.deptName.trim() !== '') {
      return this.employee.department.deptName;
    }
    return 'Department Not Assigned';
  }
    
  logout(){
    sessionStorage.clear();
    this.router.navigate(['employeeloginurl']);
  }

}
