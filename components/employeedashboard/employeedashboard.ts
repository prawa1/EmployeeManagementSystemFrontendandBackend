import { Component, OnInit } from '@angular/core';
import { Adminservice } from '../../services/adminservice';
import { Router } from '@angular/router';

@Component({
  selector: 'app-employeedashboard',
  standalone: false,
  templateUrl: './employeedashboard.html',
  styleUrl: './employeedashboard.css'
})
export class Employeedashboard implements OnInit{
   employeeList:any;
   empId:any;
   employee:any;

  constructor(private adminService: Adminservice, private router: Router) {}

  ngOnInit(): void {

  this.empId = sessionStorage.getItem("empId");
  this.adminService.getEmployeeById(this.empId).subscribe(
    (data:any)=>{
      // console.log(data);
      this.employee = data;
    }
  )
  }

  // activeTab: string = 'dashboard';
  // onMyProfile(){
  //   this.router.navigate(['myprofileurl']);
  // }
  logout(){
    sessionStorage.clear();
    this.router.navigate(['employeeloginurl']);
  }


}
