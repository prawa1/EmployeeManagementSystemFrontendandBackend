export interface Department {
    deptId: number;
    deptName: string;
    deptDescription?: string;
}

export class Employee{
    empId:number|null;
    empName:String;
    phoneNo:String;
    email:String;
    password:String;
    role:String;
    managerId:number;
    salary:number;
    address:String;
    joiningDate:String;
    gender:string;
    photo?: File | string;
    department?: Department;
    

    constructor(){
        this.empId=null;
        this.empName="";
        this.phoneNo="";
        this.email="";
        this.password="";
        this.role="";
        this.managerId=0;
        this.salary=0;
        this.address="";
        this.joiningDate="";
        this.gender="";
        this.department=undefined;
    }
}