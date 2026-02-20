# Backend Architecture Documentation
# ==================================

## Current Structure

```
/app/backend/
├── server.py          # Main application (3673 lines, 76 models, 149 endpoints)
├── requirements.txt   # Python dependencies
├── .env              # Environment variables
├── uploads/          # File uploads directory
├── tests/            # Test files
├── models/           # (Future) Pydantic models
├── routes/           # (Future) API route handlers  
├── utils/            # Utility modules
│   ├── auth.py       # Authentication helpers
│   └── database.py   # Database connection
└── __init__.py       # Module exports
```

## API Endpoint Categories

### Authentication (/api/auth/*)
- POST /auth/login - User login
- POST /auth/register - User registration

### Users (/api/users/*)
- GET /users - List users
- PUT /users/{id} - Update user
- DELETE /users/{id} - Delete user
- POST /users/{id}/toggle_active - Toggle user status

### Patients (/api/patients/*)
- GET /patients - List patients
- POST /patients - Create patient
- PUT /patients/{id} - Update patient
- DELETE /patients/{id} - Delete patient
- POST /patients/bulk-upload - Bulk import patients

### Medicines/Inventory (/api/medicines/*)
- GET /medicines - List medicines
- POST /medicines - Create medicine
- PUT /medicines/{id} - Update medicine
- DELETE /medicines/{id} - Delete medicine
- POST /medicines/bulk-upload - Bulk import inventory

### Pharmacy Stock (/api/pharmacy-stock)
- GET /pharmacy-stock - Get stock with batch/MRP info

### Pharmacy Sales (/api/pharmacy-sales/*)
- GET /pharmacy-sales - List sales
- POST /pharmacy-sales - Create sale
- PUT /pharmacy-sales/{id} - Update sale
- DELETE /pharmacy-sales/{id} - Delete sale

### Bills (/api/bills/*)
- GET /bills - List bills
- POST /bills - Create bill
- PUT /bills/{id} - Update bill
- DELETE /bills/{id} - Delete bill

### Suppliers (/api/suppliers/*)
- CRUD operations for suppliers

### Expenses (/api/expenses/*)
- CRUD operations for expenses

### Purchase Entries (/api/purchase-entries/*)
- CRUD operations for purchase entries

### Treatments (/api/treatments/*)
- CRUD operations for treatments

### Doctors (/api/doctors/*)
- CRUD operations for doctors

### Branches (/api/branches/*)
- CRUD operations for branches

### Godowns (/api/godowns/*)
- CRUD operations for godowns

### Bank Accounts (/api/bank-accounts/*)
- CRUD operations for bank accounts

### Bank Transactions (/api/bank-transactions/*)
- CRUD operations for transactions

### Dental Labs (/api/dental-labs/*)
- CRUD operations for dental labs

### Lab Orders (/api/lab-orders/*)
- CRUD operations for lab orders

### Lab Work Types (/api/lab-work-types/*)
- CRUD operations for work types

### Lab Materials (/api/lab-materials/*)
- CRUD operations for materials

### Stock Transfers (/api/stock-transfers/*)
- POST /stock-transfers - Create transfer
- GET /stock-transfers - List transfers

### Daily Report (/api/daily-report)
- GET /daily-report - Generate daily handover report

### Shifts (/api/shifts/*)
- POST /shifts/start - Start shift
- POST /shifts/end - End shift (handover)
- GET /shifts/active - Get active shifts
- GET /shifts/my-active - Get current user's active shift
- GET /shifts/history - Get shift history

### Settings & Configuration
- GET/PUT /clinic-settings - Clinic settings
- CRUD for categories, subcategories, GST slabs, units
- CRUD for serial numbers

## Database Collections

- users
- patients
- medicines
- pharmacy_sales
- bills
- suppliers
- expenses
- purchase_entries
- treatments
- doctors
- branches
- godowns
- bank_accounts
- bank_transactions
- dental_labs
- lab_orders
- lab_work_types
- lab_materials
- stock_transfers
- shifts
- categories
- subcategories
- gst_slabs
- item_units
- serial_numbers
- clinic_settings
- user_permissions

## Future Refactoring Plan

1. **Phase 1** (Complete): Create utils/ for auth and database
2. **Phase 2**: Extract models to models/ directory
3. **Phase 3**: Extract routes by domain (auth, patients, billing, etc.)
4. **Phase 4**: Add service layer for business logic

## Usage Notes

- All API routes are prefixed with /api
- Authentication required for most endpoints
- MongoDB ObjectId excluded from responses
- Datetime stored in ISO format with UTC timezone
