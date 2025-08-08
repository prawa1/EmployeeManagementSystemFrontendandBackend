import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Employee } from '../../model/employeemodel';
import { Adminservice } from '../../services/adminservice';

@Component({
  selector: 'app-employeelogin',
  standalone: false,
  templateUrl: './employeelogin.html',
  styleUrl: './employeelogin.css'
})
export class Employeelogin {

  
  

  employee = new Employee();

  constructor(private router: Router, private adminService:Adminservice){}
  
  onEmployeeLogin(){
    this.adminService.employeeLogin(this.employee).subscribe(
      {
        next:(emp:Employee)=>{
        if (emp && emp.empId !== undefined && emp.empId !== null){
        // Store both empId and complete employee data for session validation
        sessionStorage.setItem("empId", emp.empId.toString());
        sessionStorage.setItem("employee", JSON.stringify(emp));
        
        // Debug logging
        console.log('Login successful - stored session data:');
        console.log('empId:', sessionStorage.getItem('empId'));
        console.log('employee:', sessionStorage.getItem('employee'));
        
        alert("Employee logged In");
        
        this.router.navigate(['employeedashurl']);

        }
        
       
      },
       error:(error)=>{
        alert("Invalid Credentials");
        console.log("login failed",error);
      }
    }
    );
    
  }

}
