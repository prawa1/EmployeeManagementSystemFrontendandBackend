import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxPaginationModule } from 'ngx-pagination';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Welcome } from './components/welcome/welcome';
import { Register } from './components/register/register';
import { Login } from './components/adminlogin/login';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpContext, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Admindashboard } from './components/admindashboard/admindashboard';
import { Employeelogin } from './components/employeelogin/employeelogin';
import { Employeedashboard } from './components/employeedashboard/employeedashboard';
import { Myprofile } from './components/myprofile/myprofile';
import { Leave } from './components/leave/leave';
import { Salary } from './components/salary/salary';
import { Settings } from './components/settings/settings';
import { Manageleave } from './components/manageleave/manageleave';
import { Updateemployee } from './components/updateemployee/updateemployee';
import { Viewemployee } from './components/viewemployee/viewemployee';
import { DeleteConfirmationDialogComponent } from './components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { RetryDialogComponent } from './components/retry-dialog/retry-dialog.component';
import { ErrorInterceptor } from './interceptors/error.interceptor';


@NgModule({
  declarations:[
    App,
    Welcome,
    Register,
    Login,
    Admindashboard,
    Employeelogin,
    Employeedashboard,
    Myprofile,
    Leave,
    Salary,
    Settings,
    Manageleave,
    Updateemployee,
    Viewemployee,
    DeleteConfirmationDialogComponent,
    RetryDialogComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgxPaginationModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    }
  ],
  bootstrap: [App]
})
export class AppModule { }
