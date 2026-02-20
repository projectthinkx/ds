# DentalSuthra - Dental Clinic Finance Management Application

## Overview
A comprehensive finance management application for dental clinics in India with multi-branch support, pharmacy management, billing, and reporting capabilities.

## Core Features (All Implemented ✅)

### 1. Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Branch Manager, Receptionist, Accountant)
- Granular permissions per module

### 2. Dashboard
- Revenue overview cards (Total Revenue, Net Profit, Appointments, Patients)
- Revenue breakdown chart (Dental Services vs Pharmacy)
- Alerts for Low Stock and Expiring medicines
- Low Stock medicines table

### 3. Billing (Restructured)
- **Left Sidebar**: Treatment | Pharmacy tabs + Summary + Collection button
- **Top Selection**: Branch → Doctor → Patient (in order)
- **Treatment Billing**:
  - Add/Edit treatments (Admin/Branch Manager only)
  - View only for Receptionist/Accountant
  - **FDI Tooth Chart**: Interactive tooth selection for each treatment
    - Toggle between Permanent (32 adult teeth) and Deciduous (20 milk teeth)
    - Click teeth to select/deselect, shows count on button
    - Teeth stored with treatment record for clinical tracking
  - Pending Bills display when patient selected
  - **"+ Add Bill"** button for temporary bill creation
  - **Print** | **WhatsApp** | **Email** share buttons (no vendor lock-in)
  - Signature spaces on printed bills
- **Pharmacy Billing**:
  - Search and add medicines
  - All roles can add/edit
  - Print/WhatsApp/Email buttons
- **Collection Dialog**:
  - Separate payment modes for Treatment & Pharmacy
  - UPI mode → UPI dropdown selection
  - Card/Netbanking mode → Bank dropdown selection
  - Transaction reference field
  - Separate bank accounts for Treatment vs Pharmacy
  - Previous Balance Payment section (if patient has pending balance)

### 4. Master Data
- **Patients**: Bulk upload, custom ID, DOB
- **Suppliers**: Bank details, UPI IDs, GPay
- **Treatments**: Name, charges, GST, "No GST" option
- **Items**: Category → Subcategory → Item workflow
- **Inventory**: Direct stock entry, Returns, Adjustments
- **Banking** (moved from sidebar): Bank accounts with multiple UPI IDs
- **Serial Numbers**: Document serial number configuration per branch/year
- **GST Slabs**: Tax percentage management
- **Units**: Measurement units
- **Permissions**: User-specific module permissions

### 5. Pharmacy Stock
- Stock table with all items
- Filters: Search, Godown, Branch
- Stats: Total Items, Low Stock, Expiring Soon, Expired
- Transfer functionality between branches/godowns
- Low stock and expiry badges

### 6. Purchase Entry
- Supplier selection with searchable dropdown
- Add new items on-the-fly via modal
- Multiple items per purchase
- Item purpose field (sale/internal use)
- Transaction reference
- Auto-update inventory on purchase

### 7. Expenses
- Category-based expense tracking
- Add new categories inline
- Description field (non-mandatory)
- Branch-wise expense recording

### 8. Reports & Analytics
- **Overview Tab**: Revenue cards, summary
- **Purchases Tab**: Purchase list with status
- **Pharmacy Sales Tab**: Sales records
- **Treatment Invoices Tab**: Bill records with Paid/Balance columns
- **Item Transfers Tab**: Stock transfer records
- **Filters**: Date range, Branch, Godown, Payment Mode
- **Quick Dates**: Today, Last 7 Days, Last 30 Days, This Month, Last Month
- **Export**: CSV, Excel, PDF for each table

### 9. Settings
- **Clinic**: Logo upload, Name, Phone, Address, Email, GSTIN (Edit/Save mode)
- **GST**: GST configuration (Edit/Save mode)
- **Print**: Paper size settings (Edit/Save mode)
- **Users**: User management with roles
- **Branches**: Multi-branch setup
- **Godowns**: Warehouse management
- **Doctors**: Doctor profiles

## Upcoming Tasks (P1)
- All P1 tasks completed (see January 31, 2026 updates below)

## Future Tasks (P2)
- Verify Receptionist workflow (login as hanuman@clinic.com)
- Refactor server.py into modular structure (/routes, /models, /services)
- Break down large React files (Billing.js, MasterData.js, Settings.js)
- Comprehensive end-to-end testing

## Technical Stack
- **Frontend**: React.js with Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT with passlib/bcrypt
- **UI Components**: Shadcn/UI, Lucide icons
- **Printing**: react-to-print
- **Charts**: Recharts
- **Export**: papaparse (CSV), jspdf (PDF), xlsx (Excel)

## API Endpoints
All endpoints prefixed with `/api/`:
- Auth: `/auth/login`, `/auth/register`
- Patients: `/patients/*`
- Bills: `/bills/*`
- Treatments: `/treatments/*`
- Medicines: `/medicines/*`
- Pharmacy Sales: `/pharmacy-sales/*`
- Purchase Entries: `/purchase-entries/*`
- Bank Accounts: `/bank-accounts/*`
- Bank Transactions: `/bank-transactions/*`
- Credit Sales: `/credit-sales/*`, `/credit-payments/*`
- Branches: `/branches/*`
- Godowns: `/godowns/*`
- Doctors: `/doctors/*`
- Users: `/users/*`
- Categories/Subcategories: `/categories/*`, `/subcategories/*`
- GST Slabs: `/gst-slabs/*`
- Item Units: `/item-units/*`
- Item Master: `/item-master/*`
- Serial Numbers: `/serial-numbers/*`
- Suppliers: `/suppliers/*`
- Expenses: `/expenses/*`
- Settings: `/clinic-settings/*`
- Dental Labs: `/dental-labs/*`
- Lab Orders: `/lab-orders/*`

## Database Collections
- users, patients, treatments, medicines
- bills, pharmacy_sales, purchase_entries
- bank_accounts, bank_transactions
- credit_sales, credit_payments
- branches, godowns, doctors
- categories, subcategories, gst_slabs, item_units
- item_master, serial_numbers, suppliers
- expenses, expense_categories, clinic_settings

## User Roles & Permissions
| Feature | Admin | Branch Manager | Receptionist | Accountant |
|---------|-------|----------------|--------------|------------|
| Dashboard (Full) | ✅ | ✅ | Limited | Limited |
| Billing - Treatment | Full | Full | View Only | View Only |
| Billing - Pharmacy | Full | Full | Full | Full |
| Billing - Collection | Full | Full | Full | Full |
| Master Data | Full | Full | Limited | Limited |
| Reports | Full | Full | View | View |
| Settings | Full | Limited | - | - |

## Recent Updates (January 30, 2026)
- ✅ **FDI Tooth Chart**: Interactive tooth selection in Treatment Billing
  - Toggle between Permanent (Adult) teeth and Deciduous (Milk) teeth
  - Permanent teeth: 32 teeth with FDI numbers 11-18, 21-28, 31-38, 41-48
  - Milk teeth: 20 teeth with FDI numbers 51-55, 61-65, 71-75, 81-85
  - Click to select/deselect teeth, displays count and summary
  - Blue color scheme for permanent, green for milk teeth
  - Mixed selection supported (can select from both charts)
- ✅ Deleted redundant Banking.js file (functionality moved to MasterData.js)

## Latest Updates (January 31, 2026)
- ✅ **Dental Lab Order Tracking Split**: 
  - **Lab Orders page** (sidebar, all users): New `/lab-orders` page for ordering and tracking dental lab work
    - Status cards: Ordered, In Progress, Ready, Delivered, Returned
    - Search by order #, patient, lab, work type
    - Filter by status
    - Create/edit orders with lab, patient, doctor, work details
    - Quick status updates
    - Return order functionality with reason tracking
  - **Lab Invoicing tab** (Master Data, admin only): For managing labs and invoicing/payments
    - Dental Labs management (CRUD)
    - Lab Invoicing & Payments section for financial tracking
- ✅ **Logo Upload Fix**: Changed upload path from `/uploads/` to `/api/uploads/` to work with ingress routing
- ✅ **Edit/Save Mode** implemented for Settings page:
  - Clinic Info tab: Edit button enables inputs, Cancel/Save buttons appear
  - Print Settings tab: Same Edit/Save pattern
  - GST Settings tab: Same Edit/Save pattern
  - Inputs are disabled by default, only editable when in edit mode
- ✅ **Styled Confirmation Dialogs** replacing all window.confirm():
  - Save actions show "Save Changes?" dialog with green "Yes, Continue" button
  - Delete actions show "Delete [Entity]?" dialog with red "Yes, Continue" button
  - Created reusable ConfirmDialog component at `/app/frontend/src/components/ui/confirm-dialog.jsx`
  - Implemented in Settings.js, MasterData.js, Expenses.js, PurchaseEntry.js
- ✅ **Serial Number Bug Fix** - Error handling improved to prevent app crashes
- ✅ Fixed duplicate Print tab in Settings.js
- ✅ Removed duplicate closing braces in MasterData.js
- ✅ **Personal Accounting**: Manual transaction system for personal/professional money tracking
  - Purpose dropdown (Professional/Personal) for P&L filtering
  - Inflow/Outflow tracking
  - Description field optional
- ✅ **Patient History Report**: Search patients and view detailed billing history with print
- ✅ **Supplier Enhancements**: Bank branch field, search/filter, fixed edit/delete endpoints
- ✅ **Bulk Patient Upload**: Excel (.xlsx) support, optional address/branch_id
- ✅ **Access Control**: All users can now view/add patients

## Previous Updates (January 30, 2026)
- ✅ Billing page completely restructured with Treatment/Pharmacy tabs
- ✅ Pending treatment bills shown when patient selected
- ✅ "+ Add Bill" button for Admin/Branch Manager to create temporary bills
- ✅ Banking moved from sidebar to Master Data tab
- ✅ UPI/Card dropdown selection in Collection dialog
- ✅ WhatsApp and Email share buttons (no vendor lock-in - uses native links)
- ✅ Signature spaces added to printable bills (Patient Sign + Authorized/Pharmacist Sign)
- ✅ Patient balance cleared properly when changing patient
- ✅ Previous balance payment section in Collection dialog
- ✅ Paid/Balance columns working in Reports

## No Vendor Lock-in
- WhatsApp sharing uses `wa.me` direct links
- Email sharing uses `mailto:` protocol
- No third-party APIs required for core functionality
- All data stored in self-hosted MongoDB

## Test Credentials
- Admin: admin@clinic.com / admin123

## Latest Session Updates (January 31, 2026 - Session 2)
- ✅ **P0 FIX: Master Data Crash**: Fixed `Select is not defined` error in `/app/frontend/src/pages/Treatments.js`
  - Replaced Shadcn `<Select>` components with native HTML `<select>` elements
  - Category, Subcategory, and GST Slab dropdowns now use native selects for keyboard accessibility
- ✅ **P1: Treatment GST Management**: 
  - Added "GST Applicable?" checkbox with Yes/No toggle
  - Added "GST Slab" dropdown (0%, 5%, 12%, 18%, 28%)
  - GST Slab dropdown enables only when GST is applicable
  - Keyboard-first UX with native HTML selects
- ✅ **P1: Profit & Loss Reporting**:
  - Added "Profit & Loss" tab in Reports
  - Total Income shows "Professional inflows only" label
  - Total Expenses shows "Professional outflows only" label
  - Income and Expenses sections properly filtered by `purpose_type: 'professional'`
- ✅ **P1: Bulk Patient Upload Enhancements**:
  - Added "prefix" to Optional fields
  - "mobile_number" shown in Required fields
  - Template placeholder shows: `prefix,patient_id,name,mobile_number,gender...`
  - Download Template button functional

## Latest Session Updates (February 1, 2026)
- ✅ **P0: Shift Management & Handover System**:
  - New `ShiftManager` component in Daily Report page
  - **Staff (Receptionist/Accountant)**: "Start Shift" button to begin work session
    - Shows "Shift Active" status with start time and duration
    - Cannot start new shift while one is active
  - **Admin/Branch Manager**: "Pending Handovers" section
    - Lists all active shifts needing confirmation
    - "Confirm Handover" button opens confirmation dialog
    - Dialog shows shift details (Staff, Branch, Start Time, Duration)
    - Post-handover transaction detection alerts
  - **Backend Endpoints**: `/shifts/start`, `/shifts/end`, `/shifts/active`, `/shifts/my-active`, `/shifts/history`
  - **Database Collection**: `shifts` with status tracking (active/completed)
  - All tests passing (9/9 backend, 100% frontend E2E)

- ✅ **Inventory Enhancements (Master Data)**:
  - Added **Godowns** and **Branches** checkbox filters
  - "Show" button to apply filters
  - Search by name, batch number, manufacturer
  - Summary cards show filtered counts
  - Added **Godown column** in inventory table
  - Add/Edit dialog now includes **Branch** and **Godown** dropdowns
  - Note: "Select either Branch or Godown (not both)"

- ✅ **Inventory Bulk Upload**:
  - New **"Bulk Upload"** button in Inventory tab header
  - Upload from **CSV/Excel** or paste data directly
  - **Download Template** with sample data format
  - Supports all inventory fields: name, manufacturer, category, subcategory, unit, purchase_price, sales_price, stock_quantity, min_stock, batch_number, expiry_date, gst_percentage, hsn_code, purpose
  - Backend endpoint: `POST /api/medicines/bulk-upload`
  - Shows success/error count after upload

## P2 Refactoring Complete (February 1, 2026)
- ✅ **bcrypt Warning Fixed**: Removed passlib dependency, now using bcrypt directly
- ✅ **Backend Structure**: Created modular utils/ directory with auth.py and database.py
- ✅ **Backend Documentation**: Added ARCHITECTURE.md documenting all 149 endpoints
- ✅ **Frontend Refactor**: Extracted InventoryTab component (845 lines → separate file)
  - MasterData.js reduced from 3911 to 3066 lines (845 lines saved, 22% reduction)
  - New component: `/app/frontend/src/components/InventoryTab.js`

## Bug Fixes (February 1, 2026)
- ✅ **Purchase Entry → Item Dropdown**: Fixed click selection not working (added onMouseDown preventDefault)
- ✅ **Purchase Entry → Add New Item → Unit Dropdown**: Now fetches and displays units from Master Data
- ✅ **Purchase Entry → Add New Item → Subcategory**: Now correctly filters by selected category
- ✅ **Serial Numbers → Godown Selection**: Added godown_id field to allow prefixing godown to serial configs
- ✅ **Inventory → Pharmacy Sync**: Fixed pharmacy-stock endpoint to include items from medicines collection (Inventory)
- ✅ **After Transfer/Bulk Upload → Pharmacy**: Items with "for_sale" purpose now appear in Pharmacy automatically

## Test Credentials
- Admin: admin@clinic.com / admin123
- Receptionist: recep1@clinic.com / test123
- Accountant: acc1@clinic.com / test123

## API Endpoints (New)
- Shifts: `/shifts/start`, `/shifts/end`, `/shifts/active`, `/shifts/my-active`, `/shifts/history`, `/shifts/post-handover-transactions`
- Inventory Bulk: `/medicines/bulk-upload`

## Future Tasks (P3)
- Continue extracting more tabs from MasterData.js (Patients, Suppliers, etc.)
- Split server.py routes into separate files
- Comprehensive end-to-end testing of entire application
