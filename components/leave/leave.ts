import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adminservice } from '../../services/adminservice';
import { Leaveservice } from '../../services/leaveservice';
import { LeaveModel } from '../../model/leavemodel';

@Component({
  selector: 'app-leave',
  standalone: false,
  templateUrl: './leave.html',
  styleUrl: './leave.css'
})
export class Leave{
    leave= new LeaveModel();
    message: string = '';
    empId:any;
    
    
    constructor(private router:Router,private adminService:Adminservice,private leaveService:Leaveservice){}

    apply(){
    this.empId = sessionStorage.getItem("empId");
    this.leaveService.applyLeave(Number(this.empId),this.leave).subscribe(
        {
        next:()=>{
          this.message = "Leave Applied Successfully";
          alert("Leave Applied")},
        error:()=>{
          this.message = "Leave Not Applied";
          alert("Leave Not Applied")
        }
      }
      );
      
    }

    logout(){
    sessionStorage.clear();
    this.router.navigate(['employeeloginurl']);
  }

    }

    
    


