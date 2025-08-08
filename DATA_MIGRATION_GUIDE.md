# Data Migration and Validation Guide

## Overview

This guide covers the implementation of Task 12: Data migration and validation for the department-relationship-enhancement feature. The migration ensures proper department data setup and validates employee-department relationships.

## Components Implemented

### 1. SQL Migration Script
- **File**: `src/main/resources/db/migration/V3__Department_data_migration_and_validation.sql`
- **Purpose**: Database-level migration and validation
- **Features**:
  - Creates department_table if missing
  - Populates 8 default departments
  - Adds foreign key constraints
  - Updates employees with invalid department references
  - Provides comprehensive validation reports

### 2. Java Migration Service
- **Interface**: `DataMigrationService.java`
- **Implementation**: `DataMigrationServiceImpl.java`
- **Features**:
  - Programmatic migration execution
  - Role-based department assignment
  - Comprehensive validation
  - Detailed reporting

### 3. REST API Endpoints
- **Controller**: `DataMigrationController.java`
- **Endpoints**:
  - `POST /api/migration/department` - Execute migration
  - `GET /api/migration/validate` - Validate relationships
  - `GET /api/migration/summary` - Get department summary

### 4. Automatic Migration Runner
- **File**: `DataMigrationRunner.java`
- **Purpose**: Optional automatic migration on startup
- **Configuration**: Set `migration.run-on-startup=true` in application.properties

## Default Departments Created

1. **Information Technology** - IT Department handling software development and infrastructure
2. **Human Resources** - HR Department managing employee relations and policies
3. **Finance** - Finance Department handling accounting and financial operations
4. **Marketing** - Marketing Department managing promotions and customer relations
5. **Operations** - Operations Department managing day-to-day business operations
6. **Sales** - Sales Department managing customer acquisition and revenue
7. **Quality Assurance** - QA Department ensuring product and service quality
8. **Research and Development** - R&D Department focusing on innovation and product development

## Role-Based Department Assignment

The migration automatically assigns departments based on employee roles:

- **IT Roles**: software, developer, engineer, technical, programmer, architect → Information Technology
- **HR Roles**: hr, human → Human Resources
- **Finance Roles**: finance, accounting, financial → Finance
- **Marketing Roles**: marketing, promotion → Marketing
- **Sales Roles**: sales, business → Sales
- **QA Roles**: qa, quality, test → Quality Assurance
- **R&D Roles**: research, r&d → Research and Development
- **Management Roles**: manager, lead, director → Operations
- **Default**: All other roles → Information Technology

## How to Run Migration

### Option 1: Using REST API
```bash
# Execute migration
curl -X POST http://localhost:8082/api/migration/department

# Validate relationships
curl -X GET http://localhost:8082/api/migration/validate

# Get department summary
curl -X GET http://localhost:8082/api/migration/summary
```

### Option 2: Using SQL Script
```bash
mysql -u root -p Employee_management_system < src/main/resources/db/migration/V3__Department_data_migration_and_validation.sql
```

### Option 3: Automatic on Startup
Add to `application.properties`:
```properties
migration.run-on-startup=true
```

### Option 4: Manual Testing
```bash
mysql -u root -p Employee_management_system < test_migration.sql
```

## Validation Checks

The migration performs the following validation checks:

1. **Valid Department References**: Ensures all employees have valid department_id references
2. **No Orphaned Employees**: Checks for employees without department assignments
3. **Department Table Population**: Verifies department table has required data
4. **Foreign Key Constraints**: Confirms proper database constraints exist

## Testing

### Unit Tests
- **File**: `DataMigrationServiceTest.java`
- **Coverage**: Service layer logic, mocking, edge cases

### Integration Tests
- **File**: `DataMigrationIntegrationTest.java`
- **Coverage**: End-to-end migration flow with actual database

### Running Tests
```bash
# Run unit tests
mvn test -Dtest=DataMigrationServiceTest

# Run integration tests
mvn test -Dtest=DataMigrationIntegrationTest

# Run all migration-related tests
mvn test -Dtest="*Migration*"
```

## Migration Results

After successful migration, you should see:

1. **8 departments** created in department_table
2. **All employees** assigned to appropriate departments
3. **Foreign key constraints** properly established
4. **Validation checks** passing
5. **Department distribution** based on employee roles

## Troubleshooting

### Common Issues

1. **Foreign Key Constraint Errors**
   - Ensure department_table exists before running migration
   - Check for existing invalid department_id values

2. **Duplicate Department Names**
   - Migration uses INSERT IGNORE to handle duplicates
   - Existing departments are preserved

3. **Employee Assignment Failures**
   - Check employee role values for proper assignment
   - Default assignment goes to Information Technology

### Verification Queries

```sql
-- Check department count
SELECT COUNT(*) FROM department_table;

-- Check employee-department distribution
SELECT d.dept_name, COUNT(e.Employee_Id) as employee_count
FROM department_table d
LEFT JOIN employee_table e ON d.dept_id = e.department_id
GROUP BY d.dept_id, d.dept_name;

-- Check for employees without departments
SELECT COUNT(*) FROM employee_table WHERE department_id IS NULL;
```

## Requirements Satisfied

This implementation satisfies the following requirements from the task:

✅ **Create script to populate department_table with common departments if empty**
- SQL script creates 8 default departments
- Java service provides programmatic population

✅ **Update existing employee records with proper department_id values**
- Role-based automatic assignment
- Handles null and invalid references

✅ **Validate all employee records have valid department references**
- Comprehensive validation service
- Detailed error reporting

✅ **Test system with migrated data to ensure proper department display**
- Unit and integration tests
- Manual testing scripts
- API endpoints for verification

## Next Steps

After running the migration:

1. Verify department names appear correctly in payslips
2. Check employee profile displays proper department information
3. Test PDF generation includes correct department data
4. Validate frontend components show department names instead of "N/A"