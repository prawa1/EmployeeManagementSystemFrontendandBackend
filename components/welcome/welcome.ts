import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: false,
  templateUrl: './welcome.html',
  styleUrl: './welcome.css'
})
export class Welcome {

  constructor(private router:Router){

  }

 loginUser(){
this.router.navigate(['loginurl']);
 }
 employeeloginUser(){
  this.router.navigate(['employeeloginurl']);
 }
 
}
