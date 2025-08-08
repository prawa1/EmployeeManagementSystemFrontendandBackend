export interface PayslipData {
  empId: number;
  empName: string;
  department: string | null;
  month: string;
  year: string;
  
  // Earnings
  basicPay: number;
  hra: number;
  medicalAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  
  // Deductions
  pf: number;
  esi: number;
  taxDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Net Salary
  netSalary: number;
}