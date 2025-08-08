import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Employee } from '../../model/employeemodel';

export interface DeleteConfirmationData {
  employee: Employee;
  dependencies?: string[];
  hasDependencies: boolean;
}

@Component({
  selector: 'app-delete-confirmation-dialog',
  standalone: false,
  templateUrl: './delete-confirmation-dialog.component.html',
  styleUrls: ['./delete-confirmation-dialog.component.css']
})
export class DeleteConfirmationDialogComponent {
  @Input() isVisible: boolean = false;
  @Input() data: DeleteConfirmationData = {
    employee: new Employee(),
    dependencies: [],
    hasDependencies: false
  };
  
  @Output() confirmed = new EventEmitter<boolean>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit(true);
    this.isVisible = false;
  }

  onCancel(): void {
    this.cancelled.emit();
    this.isVisible = false;
  }

  getDependencyWarningMessage(): string {
    if (!this.data.hasDependencies || !this.data.dependencies) {
      return '';
    }
    
    return `This employee has the following dependent records that will prevent deletion: ${this.data.dependencies.join(', ')}`;
  }
}