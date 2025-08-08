import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adminservice } from '../../services/adminservice';
import { PayslipData } from '../../model/payslipmodel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-salary',
  standalone: false,
  templateUrl: './salary.html',
  styleUrl: './salary.css'
})
export class Salary implements OnInit {
  empId: string = '';
  employee: any;
  payslipData: PayslipData | null = null;
  currentMonth: string = '';
  currentYear: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  errorType: string = '';
  showRetryButton: boolean = false;

  constructor(private router: Router, private adminService: Adminservice) { }

  ngOnInit(): void {
    // Get employee data from session
    this.empId = sessionStorage.getItem('empId') || '';
    const employeeData = sessionStorage.getItem('employee');
    this.employee = employeeData ? JSON.parse(employeeData) : {};

    console.log('Salary Component - empId:', this.empId);
    console.log('Salary Component - employee:', this.employee);

    // Load payslip data directly
    if (this.empId) {
      this.loadPayslipData();
    } else {
      console.error('No empId found - redirecting to login');
      this.logout();
    }
  }

  loadPayslipData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.errorType = '';
    this.showRetryButton = false;

    console.log('Loading payslip data for empId:', this.empId);

    this.adminService.getPayslipData(this.empId).subscribe({
      next: (data: PayslipData) => {
        console.log('Payslip API response:', data);
        if (data) {
          this.payslipData = data;
          this.errorMessage = '';
          this.errorType = '';
          console.log('Payslip data set successfully:', this.payslipData);
        } else {
          console.log('No payslip data received');
          this.errorMessage = 'No payslip data available for the current period';
          this.errorType = 'no_data';
          this.showRetryButton = true;
        }
        this.isLoading = false;
        console.log('Loading state set to false');
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading payslip data:', error);

        // Use enhanced error information from service
        this.errorMessage = error.message || 'Failed to load payslip data. Please try again.';
        this.errorType = (error as any).type || 'general';

        // Handle session expiration with automatic redirect
        if (this.errorType === 'session_expired' || error.status === 401) {
          this.showRetryButton = false;
          setTimeout(() => {
            this.logout();
          }, 3000);
        } else if (this.errorType === 'access_denied') {
          this.showRetryButton = false;
          setTimeout(() => {
            this.logout();
          }, 5000);
        } else if (this.errorType === 'not_found' || this.errorType === 'no_data') {
          this.showRetryButton = false;
        } else {
          // Show retry button for recoverable errors
          this.showRetryButton = true;
        }

        // Log detailed error information for debugging
        console.error('Payslip error details:', {
          status: error.status,
          type: this.errorType,
          message: this.errorMessage,
          originalError: (error as any).originalError
        });
      }
    });
  }

  downloadPayslip(): void {
    console.log('Starting PDF download process...');
    
    // Validate session before attempting download
    if (!this.validateSession()) {
      console.error('Session validation failed');
      return;
    }

    if (!this.payslipData) {
      console.error('No payslip data available');
      this.errorMessage = 'No payslip data available to download';
      this.errorType = 'no_data';
      return;
    }

    console.log('Payslip data available:', this.payslipData);

    // Validate payslip data integrity
    if (!this.validatePayslipData()) {
      console.error('Payslip data validation failed');
      this.errorMessage = 'Payslip data is incomplete. Please refresh and try again.';
      this.errorType = 'data_integrity';
      this.showRetryButton = true;
      return;
    }

    console.log('Payslip data validation passed');

    // Clear any previous error messages
    this.errorMessage = '';
    this.errorType = '';

    // Show loading state during PDF generation
    this.isLoading = true;

    // Use setTimeout to allow UI to update before starting PDF generation
    setTimeout(() => {
      try {
        console.log('Initializing PDF generation...');
        
        // Validate PDF libraries first
        if (!this.validatePdfLibraries()) {
          throw new Error('PDF libraries not available');
        }

        const doc = new jsPDF();

        // Validate PDF document creation
        if (!doc) {
          throw new Error('Failed to initialize PDF document');
        }

        console.log('PDF document initialized successfully');

        // Company Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Management System', 105, 20, { align: 'center' });

        doc.setFontSize(16);
        doc.text('Payslip', 105, 30, { align: 'center' });

        // Employee Details Section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        const employeeDetails = [
          ['Employee ID:', this.payslipData!.empId.toString()],
          ['Employee Name:', this.payslipData!.empName || 'N/A'],
          ['Department:', this.getDepartmentName()],
          ['Month/Year:', `${this.payslipData!.month || 'N/A'} ${this.payslipData!.year || 'N/A'}`]
        ];

        console.log('Adding employee details table...');
        autoTable(doc, {
          startY: 45,
          body: employeeDetails,
          theme: 'plain',
          styles: {
            fontSize: 11,
            cellPadding: 2
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { cellWidth: 80 }
          }
        });

        // Earnings Section
        const earningsData = [
          ['Basic Pay', this.formatCurrency(this.payslipData!.basicPay || 0)],
          ['HRA', this.formatCurrency(this.payslipData!.hra || 0)],
          ['Medical Allowance', this.formatCurrency(this.payslipData!.medicalAllowance || 0)],
          ['Transport Allowance', this.formatCurrency(this.payslipData!.transportAllowance || 0)],
          ['Other Allowances', this.formatCurrency(this.payslipData!.otherAllowances || 0)],
          ['Gross Salary', this.formatCurrency(this.payslipData!.grossSalary || 0)]
        ];

        console.log('Adding earnings table...');
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 15,
          head: [['Earnings', 'Amount (₹)']],
          body: earningsData,
          theme: 'striped',
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 10,
            cellPadding: 3
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'right' }
          }
        });

        // Deductions Section
        const deductionsData = [
          ['Provident Fund (PF)', this.formatCurrency(this.payslipData!.pf || 0)],
          ['ESI', this.formatCurrency(this.payslipData!.esi || 0)],
          ['Tax Deductions', this.formatCurrency(this.payslipData!.taxDeductions || 0)],
          ['Other Deductions', this.formatCurrency(this.payslipData!.otherDeductions || 0)],
          ['Total Deductions', this.formatCurrency(this.payslipData!.totalDeductions || 0)]
        ];

        console.log('Adding deductions table...');
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [['Deductions', 'Amount (₹)']],
          body: deductionsData,
          theme: 'striped',
          headStyles: {
            fillColor: [231, 76, 60],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 10,
            cellPadding: 3
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'right' }
          }
        });

        // Net Salary Section
        const netSalaryData = [
          ['Net Salary', this.formatCurrency(this.payslipData!.netSalary || 0)]
        ];

        console.log('Adding net salary table...');
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          body: netSalaryData,
          theme: 'grid',
          styles: {
            fontSize: 12,
            fontStyle: 'bold',
            fillColor: [46, 204, 113],
            textColor: 255,
            cellPadding: 5
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'right' }
          }
        });

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('This is a system generated payslip.', 105, 280, { align: 'center' });

        // Generate filename as "Payslip_EmpID_MonthYear.pdf"
        const filename = `Payslip_${this.payslipData!.empId}_${this.payslipData!.month}${this.payslipData!.year}.pdf`;
        console.log('Generated filename:', filename);

        // Validate filename
        if (!filename || filename.length < 5) {
          throw new Error('Invalid filename generated');
        }

        // Save the PDF with error handling
        console.log('Attempting to save PDF...');
        try {
          doc.save(filename);
          console.log('PDF saved successfully');
        } catch (saveError) {
          console.error('Error saving PDF:', saveError);
          throw new Error('Failed to save PDF file. Please check browser permissions.');
        }

        // Reset loading state after successful PDF generation
        this.isLoading = false;
        console.log('PDF download completed successfully');

        // Show success message briefly
        this.errorMessage = 'PDF downloaded successfully!';
        this.errorType = 'success';
        setTimeout(() => {
          this.errorMessage = '';
          this.errorType = '';
        }, 3000);

      } catch (error: any) {
        console.error('Error generating PDF:', error);
        this.isLoading = false;
        this.errorType = 'pdf_generation';

        // Provide specific error messages based on error type
        if (error.message?.includes('PDF library not available')) {
          this.errorMessage = 'PDF generation library is not available. Please refresh the page and try again.';
        } else if (error.message?.includes('Failed to initialize PDF document')) {
          this.errorMessage = 'Failed to create PDF document. Please try again.';
        } else if (error.message?.includes('Invalid filename')) {
          this.errorMessage = 'Unable to generate proper filename. Please refresh and try again.';
        } else if (error.message?.includes('browser permissions')) {
          this.errorMessage = 'Unable to download file. Please check your browser download settings and try again.';
        } else if (error.message?.includes('Memory')) {
          this.errorMessage = 'Insufficient memory to generate PDF. Please close other tabs and try again.';
        } else if (error.name === 'QuotaExceededError') {
          this.errorMessage = 'Storage quota exceeded. Please clear browser storage and try again.';
        } else {
          this.errorMessage = 'Failed to generate PDF. Please try again or contact support if the problem persists.';
        }

        this.showRetryButton = true;

        // Log detailed error for debugging
        console.error('PDF generation error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          payslipData: this.payslipData
        });
      }
    }, 100); // Small delay to allow UI to update
  }

  private validateSession(): boolean {
    // Check if empId exists in session
    const empId = sessionStorage.getItem('empId');
    const employee = sessionStorage.getItem('employee');

    if (!empId || !employee) {
      this.errorMessage = 'Session expired. Please login again.';
      this.errorType = 'session_expired';
      this.showRetryButton = false;
      setTimeout(() => {
        this.logout();
      }, 3000);
      return false;
    }

    // Check if session data is valid
    try {
      const employeeData = JSON.parse(employee);
      if (!employeeData || !employeeData.empId) {
        throw new Error('Invalid employee data');
      }
    } catch (error) {
      this.errorMessage = 'Invalid session data. Please login again.';
      this.errorType = 'session_invalid';
      this.showRetryButton = false;
      setTimeout(() => {
        this.logout();
      }, 3000);
      return false;
    }

    return true;
  }

  private validatePdfLibraries(): boolean {
    console.log('Validating PDF libraries...');
    
    // Check if jsPDF is available
    if (typeof jsPDF === 'undefined') {
      console.error('jsPDF library is not available');
      return false;
    }

    // Check if autoTable is available
    if (typeof autoTable === 'undefined') {
      console.error('autoTable library is not available');
      return false;
    }

    console.log('PDF libraries validation passed');
    return true;
  }

  private validatePayslipData(): boolean {
    if (!this.payslipData) {
      console.error('Payslip data is null or undefined');
      return false;
    }

    // Check for required fields with more detailed logging
    const requiredFields = ['empId', 'empName', 'month', 'year'];
    for (const field of requiredFields) {
      const value = this.payslipData[field as keyof PayslipData];
      if (value === null || value === undefined || value === '') {
        console.error(`Missing or empty required field: ${field}, value: ${value}`);
        return false;
      }
    }

    // Check for numeric fields (they can be 0 but should be valid numbers)
    const numericFields = ['basicPay', 'grossSalary', 'totalDeductions', 'netSalary'];
    for (const field of numericFields) {
      const value = this.payslipData[field as keyof PayslipData];
      if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
        console.error(`Invalid numeric field: ${field}, value: ${value}, type: ${typeof value}`);
        return false;
      }
    }

    // Additional validation for optional numeric fields
    const optionalNumericFields = ['hra', 'medicalAllowance', 'transportAllowance', 'otherAllowances', 'pf', 'esi', 'taxDeductions', 'otherDeductions'];
    for (const field of optionalNumericFields) {
      const value = this.payslipData[field as keyof PayslipData];
      if (value !== null && value !== undefined && (typeof value !== 'number' || isNaN(value))) {
        console.error(`Invalid optional numeric field: ${field}, value: ${value}, type: ${typeof value}`);
        return false;
      }
    }

    console.log('Payslip data validation passed successfully');
    return true;
  }

  private formatCurrency(amount: number): string {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Helper method to safely extract department name from payslip data
   * @returns Department name or fallback text
   */
  getDepartmentName(): string {
    if (this.payslipData?.department && 
        this.payslipData.department !== 'N/A' && 
        this.payslipData.department.trim() !== '') {
      return this.payslipData.department;
    }
    return 'Department Not Assigned';
  }

  /**
   * Helper method to safely extract department name from employee data
   * @returns Department name or fallback text
   */
  getEmployeeDepartmentName(): string {
    if (this.employee?.department?.deptName && 
        this.employee.department.deptName.trim() !== '') {
      return this.employee.department.deptName;
    }
    return 'Department Not Assigned';
  }

  refreshPage(): void {
    window.location.reload();
  }

  retryDownload(): void {
    console.log('Retrying PDF download...');
    this.errorMessage = '';
    this.errorType = '';
    this.showRetryButton = false;
    
    // Reload payslip data first, then attempt download
    this.loadPayslipData();
  }

  logout(): void {
    sessionStorage.clear();
    this.router.navigate(['employeeloginurl']);
  }
}
