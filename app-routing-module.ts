import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Welcome } from './components/welcome/welcome';
import { Login } from './components/adminlogin/login';
import { Admindashboard } from './components/admindashboard/admindashboard';
import { Employeelogin } from './components/employeelogin/employeelogin';
import { Register } from './components/register/register';
import { Employeedashboard } from './components/employeedashboard/employeedashboard';
import { Myprofile } from './components/myprofile/myprofile';
import { Leave } from './components/leave/leave';
import { Salary } from './components/salary/salary';
import { Settings } from './components/settings/settings';
import { Manageleave } from './components/manageleave/manageleave';
import { Viewemployee } from './components/viewemployee/viewemployee';
import { Updateemployee } from './components/updateemployee/updateemployee';


const routes: Routes = [
  {path:"",component:Welcome},
  {path:"loginurl",component:Login},
  {path:"admindashurl",component:Admindashboard},
  {path:"employeeloginurl",component:Employeelogin},
  {path:"employeedashurl",component:Employeedashboard},
  { path:"myprofileurl", component:Myprofile },
  { path:"leaveurl",component:Leave },
  { path:"salaryurl", component:Salary },
  { path:"settingsurl", component:Settings },
  {path:"adminregisterurl",component:Register},
  {path:"manageleaveurl",component:Manageleave},
  {path:"viewemployeeurl",component:Viewemployee},
  {path:"updateemployeeurl/:empid",component:Updateemployee}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
