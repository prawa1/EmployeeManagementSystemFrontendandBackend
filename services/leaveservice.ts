import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { endpointurl } from '../model/backendport';
import { Observable } from 'rxjs';
import { LeaveModel } from '../model/leavemodel';
import { Leave } from '../components/leave/leave';

@Injectable({
  providedIn: 'root'
})
export class Leaveservice {

constructor(private httpclient:HttpClient){}
  
 applyLeave(empId:number,leave:any){
  return this.httpclient.post(`${endpointurl}/leave/api/apply/${empId}`,leave);
 }

 getPendingLeaves(){
  return this.httpclient.get(`${endpointurl}/leave/api/pending`);
 }

 approveLeave(leaveId:any){
    return this.httpclient.put(`${endpointurl}/leave/api/approve/${leaveId}`,{});
 }

 rejectLeave(leaveId:any){
  return this.httpclient.put(`${endpointurl}/leave/api/reject/${leaveId}`,{});
 }
}
