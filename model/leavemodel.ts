export class LeaveModel {
  leaveId: number|null;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
 // employee: any;
  constructor()
  {
    this.leaveId=null;
    this.fromDate='';
    this.toDate='';
    this.reason='';
    this.status='';
  }
}
