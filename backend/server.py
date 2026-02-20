from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
import logging
import uuid
import shutil
import base64
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Union
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()

@app.on_event("startup")
async def startup_db_client():
    await db.patients.create_index("phone", name="patient_phone_idx")
    await db.patients.create_index("patient_id", name="patient_id_idx")
    await db.walkins.create_index("id", unique=True)
    await db.walkins.create_index([("branch_id", 1), ("status", 1)])
    await db.walkins.create_index([("patient_id", 1), ("status", 1)])

# CORS - Must be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# Mount static files for uploaded images - under /api so it goes through the same routing
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash using bcrypt directly."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt directly."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    full_name: str
    role: str
    branch_id: Optional[str] = None
    is_active: bool = True
    created_at: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    branch_id: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    user: User

class Branch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    address: Optional[str] = ""
    location: Optional[str] = ""
    phone: Optional[str] = ""
    is_active: Optional[bool] = True
    created_at: str

class BranchCreate(BaseModel):
    name: str
    address: Optional[str] = ""
    location: Optional[str] = ""
    phone: Optional[str] = ""
    is_active: Optional[bool] = True

class Patient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: Optional[str] = None  # User-entered ID (not auto-generated), optional for legacy data
    prefix: Optional[str] = None  # Mr, Mrs, Ms, Dr, etc.
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None  # Date of birth YYYY-MM-DD
    age: Optional[int] = None  # Can be calculated from DOB or entered directly
    is_dob_estimated: Optional[bool] = False
    gender: Optional[str] = None  # Optional for legacy data
    address: Optional[str] = None  # Optional for legacy data
    branch_id: Optional[str] = None  # Optional for legacy data
    created_at: str

class PatientCreate(BaseModel):
    patient_id: str  # Required - user enters this
    prefix: Optional[str] = None  # Mr, Mrs, Ms, Dr, etc.
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    is_dob_estimated: Optional[bool] = False
    gender: str
    address: Optional[str] = ""
    branch_id: Optional[str] = None

class PatientUpdate(BaseModel):
    patient_id: Optional[str] = None
    prefix: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    is_dob_estimated: Optional[bool] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    branch_id: Optional[str] = None

class Medicine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    category: str = "General"
    subcategory: Optional[str] = None
    batch_number: str
    expiry_date: str
    purchase_price: float
    mrp: float
    sales_price: float
    unit_price: float
    discount_percentage: float = 0
    stock_quantity: int
    min_stock_level: int = 10
    supplier_id: Optional[str] = None
    branch_id: Optional[str] = None # Added branch support
    godown_id: Optional[str] = None # Added godown support
    is_return: bool = False
    return_reason: Optional[str] = None
    return_date: Optional[str] = None
    gst_percentage: float = 12.0
    hsn_code: Optional[str] = None
    item_status: str = "ACTIVE"  # ACTIVE, INACTIVE
    discontinued_reason: Optional[str] = None
    created_at: str

class MedicineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    category: str = "General"
    subcategory: Optional[str] = None
    batch_number: str
    expiry_date: str
    purchase_price: float
    mrp: float
    sales_price: float
    unit_price: float
    discount_percentage: float = 0
    stock_quantity: int
    min_stock_level: int = 10
    supplier_id: Optional[str] = None
    branch_id: Optional[str] = None
    godown_id: Optional[str] = None
    gst_percentage: float = 12.0
    hsn_code: Optional[str] = None
    item_status: str = "ACTIVE"
    discontinued_reason: Optional[str] = None

class ItemMaster(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    manufacturer: Optional[str] = None
    item_type_id: Optional[str] = None # Link to ItemType
    unit_id: Optional[str] = None # Link to ItemUnit
    category: Optional[str] = None
    subcategory: Optional[str] = None
    unit: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_percentage: float = 0
    gst_applicable: bool = False
    gst_slab_id: Optional[str] = None
    mrp: float = 0
    charges: float = 0
    duration_minutes: Optional[int] = None
    purpose: str = "for_sale"
    item_status: str = "ACTIVE"
    discontinued_reason: Optional[str] = None
    low_stock_warning_enabled: bool = False
    low_stock_threshold: Optional[float] = None
    min_stock_level: Optional[int] = 10
    expiry_tracking_enabled: bool = False
    created_at: str

class ItemMasterCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    manufacturer: Optional[str] = None
    item_type_id: Optional[str] = None
    unit_id: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    unit: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_percentage: float = 0
    gst_applicable: bool = False
    gst_slab_id: Optional[str] = None
    mrp: float = 0
    charges: float = 0
    duration_minutes: Optional[int] = None
    purpose: str = "for_sale"
    item_status: str = "ACTIVE"
    discontinued_reason: Optional[str] = None
    low_stock_warning_enabled: bool = False
    low_stock_threshold: Optional[float] = None
    min_stock_level: Optional[int] = 10
    expiry_tracking_enabled: bool = False
    discontinued_reason: Optional[str] = None

class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    gpay_number: Optional[str] = None
    upi_id: Optional[str] = None
    created_at: str

class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    gpay_number: Optional[str] = None
    upi_id: Optional[str] = None

class PharmacySale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: Optional[str] = None
    patient_name: str
    items: List[dict]
    subtotal: float
    gst_amount: float = 0
    discount: float = 0
    total_amount: float
    paid_amount: Optional[float] = None
    balance_amount: Optional[float] = None
    payment_mode: str
    prescription_number: Optional[str] = None
    branch_id: str
    branch_name: Optional[str] = None
    created_by: str
    created_at: str

class PharmacySaleCreate(BaseModel):
    patient_id: Optional[str] = None
    patient_name: str
    items: List[dict]
    subtotal: float
    gst_amount: float = 0
    discount: float = 0
    total_amount: float
    paid_amount: Optional[float] = None
    balance_amount: Optional[float] = None
    payment_mode: str
    upi_id: Optional[str] = None
    transaction_ref: Optional[str] = None
    prescription_number: Optional[str] = None
    branch_id: str
    branch_name: Optional[str] = None

class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    patient_name: str
    services: List[dict]
    subtotal: float
    gst_amount: float = 0
    discount: float = 0
    total_amount: float
    paid_amount: Optional[float] = None
    balance_amount: Optional[float] = None
    payment_mode: str
    payment_status: str
    branch_id: str
    branch_name: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    notes: Optional[str] = None
    is_temporary: bool = False
    created_by: str
    created_at: str

class BillCreate(BaseModel):
    patient_id: str
    patient_name: str
    services: List[dict]
    subtotal: float
    gst_amount: float = 0
    discount: float = 0
    total_amount: float
    payment_mode: str
    payment_status: str = "paid"
    branch_id: str
    branch_name: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    paid_amount: Optional[float] = None
    balance_amount: Optional[float] = None
    upi_id: Optional[str] = None
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None
    is_temporary: bool = False

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category: str
    description: str
    amount: float
    date: str
    branch_id: str
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    created_by: str
    created_at: str

class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float
    date: str
    branch_id: str
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    patient_name: str
    appointment_date: str
    appointment_time: str
    doctor_name: str
    status: str
    notes: Optional[str] = None
    branch_id: str
    created_at: str

class AppointmentCreate(BaseModel):
    patient_id: str
    patient_name: str
    appointment_date: str
    appointment_time: str
    doctor_name: str
    status: str = "scheduled"
    notes: Optional[str] = None
    branch_id: str

class TreatmentCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    created_at: str

class TreatmentCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class TreatmentSubCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category_id: str
    name: str
    description: Optional[str] = None
    created_at: str

class TreatmentSubCategoryCreate(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None

class Treatment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category_id: str
    subcategory_id: str
    name: str
    description: Optional[str] = None
    charges: float
    gst_applicable: bool = False
    gst_percentage: float = 0
    duration_minutes: Optional[int] = None
    created_at: str

class TreatmentCreate(BaseModel):
    category_id: str
    subcategory_id: str
    name: str
    description: Optional[str] = None
    charges: float
    gst_applicable: bool = False
    gst_percentage: float = 0
    duration_minutes: Optional[int] = None

class Doctor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    specialization: Optional[str] = ""
    qualification: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    branch_id: Optional[str] = None
    signature: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[float] = None
    created_at: str

class DoctorCreate(BaseModel):
    name: str
    specialization: Optional[str] = ""
    qualification: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    branch_id: Optional[str] = None
    signature: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[float] = None

class Godown(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    location: Optional[str] = ""
    contact_person: Optional[str] = ""
    phone: Optional[str] = ""
    branch_id: Optional[str] = None
    created_at: str

class GodownCreate(BaseModel):
    name: str
    location: Optional[str] = ""
    contact_person: Optional[str] = ""
    phone: Optional[str] = ""
    branch_id: Optional[str] = None

# Bank Account Models
class BankAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    bank_name: str
    branch_name: Optional[str] = None
    account_number: str
    account_type: str  # savings, current, etc.
    account_holder: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_ids: List[str] = []
    opening_balance: float = 0
    current_balance: float = 0
    is_active: bool = True
    created_at: str

class BankAccountCreate(BaseModel):
    bank_name: str
    branch_name: Optional[str] = None
    account_number: str
    account_type: str
    account_holder: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_ids: List[str] = []
    opening_balance: float = 0

class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_number: Optional[str] = None
    account_type: Optional[str] = None
    account_holder: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_ids: Optional[List[str]] = None
    opening_balance: Optional[float] = None
    is_active: Optional[bool] = None

# Bank Transaction Models (auto-logged from purchases/sales)
class BankTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    bank_account_id: str
    bank_name: str
    transaction_type: str  # credit (in) or debit (out)
    amount: float
    payment_mode: str  # card, upi, netbanking
    upi_id: Optional[str] = None
    reference_type: str  # purchase_entry, pharmacy_sale, bill, expense, manual
    reference_id: str
    reference_number: Optional[str] = None
    description: Optional[str] = ""
    transaction_date: str
    # Enhanced fields for better tracking
    party_name: Optional[str] = None  # Patient name or Supplier name
    party_id: Optional[str] = None  # Patient ID or Supplier ID
    invoice_number: Optional[str] = None
    is_manual: bool = False  # True if manually added by admin
    purpose_type: Optional[str] = "professional"  # professional or personal - affects P&L
    created_at: str

class BankTransactionCreate(BaseModel):
    bank_account_id: str
    bank_name: str
    transaction_type: str
    amount: float
    payment_mode: str
    upi_id: Optional[str] = None
    reference_type: str
    reference_id: str
    reference_number: Optional[str] = None
    description: Optional[str] = ""
    transaction_date: str
    party_name: Optional[str] = None
    party_id: Optional[str] = None
    invoice_number: Optional[str] = None
    is_manual: bool = False
    purpose_type: Optional[str] = "professional"  # professional or personal

# Dental Lab Models
class DentalLab(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None
    is_active: bool = True
    created_at: str

class DentalLabCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None

# Lab Work Type Models
class LabWorkType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: str

class LabWorkTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None

# Lab Material Models
class LabMaterial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: str

class LabMaterialCreate(BaseModel):
    name: str
    description: Optional[str] = None

class LabOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    order_number: str
    lab_id: str
    lab_name: str
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    work_type: str  # crown, bridge, denture, implant, orthodontic, etc.
    work_description: Optional[str] = None
    teeth_numbers: Optional[str] = None
    shade: Optional[str] = None
    material: Optional[str] = None
    order_date: str
    expected_delivery_date: Optional[str] = None
    actual_delivery_date: Optional[str] = None
    status: str = "ordered"  # ordered, in_progress, ready, delivered, cancelled
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    invoice_amount: float = 0
    paid_amount: float = 0
    payment_status: str = "pending"  # pending, partial, paid
    payment_mode: Optional[str] = None
    payment_date: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[str] = None
    created_at: str

class LabOrderCreate(BaseModel):
    lab_id: str
    lab_name: Optional[str] = None
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    work_type: str
    work_description: Optional[str] = None
    teeth_numbers: Optional[str] = None
    shade: Optional[str] = None
    material: Optional[str] = None
    order_date: str
    expected_delivery_date: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    invoice_amount: float = 0
    paid_amount: float = 0
    payment_mode: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[str] = None

# Role Permissions with Date Range
class RolePermission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    module: str
    can_view: bool = True
    can_add: bool = False
    can_edit: bool = False
    can_delete: bool = False
    date_restriction: str = "all"  # all, today, custom
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    created_at: str

class RolePermissionCreate(BaseModel):
    user_id: str
    user_name: str
    module: str
    can_view: bool = True
    can_add: bool = False
    can_edit: bool = False
    can_delete: bool = False
    date_restriction: str = "all"
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class RolePermissionUpdate(BaseModel):
    can_view: Optional[bool] = None
    can_add: Optional[bool] = None
    can_edit: Optional[bool] = None
    can_delete: Optional[bool] = None
    date_restriction: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class CreditSale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    bill_id: Optional[str] = None
    pharmacy_sale_id: Optional[str] = None
    patient_id: str
    patient_name: str
    total_amount: float
    paid_amount: float
    pending_amount: float
    credit_period_days: int
    due_date: str
    status: str
    branch_id: str
    created_by: str
    created_at: str

class CreditSaleCreate(BaseModel):
    bill_id: Optional[str] = None
    pharmacy_sale_id: Optional[str] = None
    patient_id: str
    patient_name: str
    total_amount: float
    paid_amount: float = 0
    credit_period_days: int = 30
    branch_id: str

class CreditPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    credit_sale_id: str
    amount: float
    payment_mode: str
    payment_date: str
    notes: Optional[str] = None
    created_by: str
    created_at: str

class CreditPaymentCreate(BaseModel):
    credit_sale_id: str
    amount: float
    payment_mode: str
    payment_date: str
    notes: Optional[str] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_email: Optional[str] = None
    gstin: Optional[str] = None
    logo_url: Optional[str] = None
    enable_gst: bool = True
    default_gst_percentage: float = 18.0
    currency_symbol: str = "₹"
    # Print settings
    default_paper_size: str = "a4"  # a4, a5, letter, thermal_80mm, thermal_58mm
    thermal_printer_width: str = "80mm"  # 80mm, 58mm
    print_header: bool = True
    print_footer: bool = True
    print_logo: bool = True
    updated_at: str

class SettingsUpdate(BaseModel):
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_email: Optional[str] = None
    gstin: Optional[str] = None
    logo_url: Optional[str] = None
    enable_gst: Optional[bool] = None
    default_gst_percentage: Optional[float] = None
    currency_symbol: Optional[str] = None
    # Print settings
    default_paper_size: Optional[str] = None
    thermal_printer_width: Optional[str] = None
    print_header: Optional[bool] = None
    print_footer: Optional[bool] = None
    print_logo: Optional[bool] = None

class PurchaseEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    supplier_id: str
    supplier_name: str
    invoice_number: str
    invoice_date: str
    ordered_date: Optional[str] = None
    items_received_date: Optional[str] = None
    total_amount: float
    total_discount: float = 0
    total_gst: float = 0
    paid_amount: float
    pending_amount: float
    payment_status: str
    paid_on: Optional[str] = None
    payment_mode: str
    transaction_reference: Optional[str] = None
    transaction_details: Optional[str] = None
    bank_id: Optional[str] = None
    items: List[dict]
    branch_id: Optional[str] = None
    godown_id: Optional[str] = None
    created_by: str
    created_at: str

class PurchaseEntryCreate(BaseModel):
    supplier_id: str
    supplier_name: str
    invoice_number: str
    invoice_date: str
    ordered_date: Optional[str] = None
    items_received_date: Optional[str] = None
    total_amount: float
    total_discount: float = 0
    total_gst: float = 0
    paid_amount: float = 0
    paid_on: Optional[str] = None
    payment_mode: str = "cash"
    payment_status: str = "unpaid"  # unpaid, partial, paid
    transaction_details: Optional[str] = None
    bank_id: Optional[str] = None
    items: List[dict]
    branch_id: Optional[str] = None
    godown_id: str

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    unit_price: Optional[float] = None
    mrp: Optional[float] = None
    purchase_price: Optional[float] = None
    sales_price: Optional[float] = None
    discount_percentage: Optional[float] = None
    stock_quantity: Optional[int] = None
    min_stock_level: Optional[int] = None
    expiry_date: Optional[str] = None
    batch_number: Optional[str] = None
    supplier_id: Optional[str] = None
    branch_id: Optional[str] = None
    godown_id: Optional[str] = None
    gst_percentage: Optional[float] = None



# Category Master
class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    item_type_id: Optional[str] = None
    created_at: str

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    item_type_id: Optional[str] = None

# Item Type Master
class ItemType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    created_at: str

class ItemTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None

# Subcategory Master
class Subcategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category_id: str
    name: str
    description: Optional[str] = None
    created_at: str

class SubcategoryCreate(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None

# GST Slabs Master
class GSTSlab(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    percentage: float
    description: Optional[str] = None
    is_active: bool = True
    created_at: str

class GSTSlabCreate(BaseModel):
    name: str
    percentage: float
    description: Optional[str] = None
    is_active: bool = True

class GSTSlabUpdate(BaseModel):
    name: Optional[str] = None
    percentage: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

# Item Units Master
class ItemUnit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    short_name: Optional[str] = None
    abbreviation: Optional[str] = None
    created_at: str

class ItemUnitCreate(BaseModel):
    name: str
    abbreviation: str

# Walk-In Models
class WalkIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    patient_name: str
    patient_phone: str
    branch_id: str
    branch_name: Optional[str] = None
    check_in_time: str
    status: str = "waiting"  # waiting, with_doctor, ready_for_billing, completed
    payment_mode: Optional[str] = None
    paid_amount: float = 0
    paid_at: Optional[str] = None
    created_at: str

class WalkInCreate(BaseModel):
    patient_id: str
    branch_id: str

class WalkInUpdate(BaseModel):
    status: Optional[str] = None
    payment_mode: Optional[str] = None
    paid_amount: Optional[float] = None

# Serial Number Configuration
class SerialNumber(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    branch_id: Optional[str] = ""
    godown_id: Optional[str] = ""
    document_type: str  # invoice, voucher, estimate, temporary_bill, return_order, transfer
    prefix: Optional[str] = ""
    starting_number: int = 1
    current_number: int = 1
    financial_year: str
    created_at: str

class SerialNumberCreate(BaseModel):
    branch_id: Optional[str] = ""
    godown_id: Optional[str] = ""
    document_type: str
    prefix: Optional[str] = ""
    starting_number: int = 1
    current_number: int = 1
    financial_year: str

# Stock Transfer (Godown to Branch)
class StockTransfer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    transfer_number: str
    transfer_date: str
    transfer_type: str  # godown_to_branch, branch_to_branch
    items: List[dict]  # Each dict: item_name, batch_number, quantity, mrp
    from_type: str  # godown or branch
    from_id: str
    from_name: str
    to_type: str  # branch
    to_id: str
    to_name: str
    notes: Optional[str] = None
    created_by: str
    created_at: str

class StockTransferCreate(BaseModel):
    transfer_date: str
    transfer_type: str  # godown_to_branch, branch_to_branch
    items: List[dict]
    from_type: str  # godown or branch
    from_id: str
    from_name: str
    to_type: str  # branch
    to_id: str
    to_name: str
    notes: Optional[str] = None

# Shift/Handover Models
class Shift(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    user_email: str
    branch_id: str
    branch_name: str
    shift_date: str
    start_time: str
    end_time: Optional[str] = None
    ended_by_id: Optional[str] = None
    ended_by_name: Optional[str] = None
    status: str  # active, completed
    notes: Optional[str] = None
    created_at: str

class ShiftStart(BaseModel):
    branch_id: str
    branch_name: str
    notes: Optional[str] = None

class ShiftEnd(BaseModel):
    shift_id: str
    notes: Optional[str] = None

import uuid

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_dict = {
        "id": user_id,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "branch_id": user_data.branch_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    return User(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        branch_id=user_data.branch_id,
        created_at=user_dict["created_at"]
    )

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    user_obj = User(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        branch_id=user.get("branch_id"),
        created_at=user["created_at"]
    )
    
    return LoginResponse(token=access_token, user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(1000)
    return users

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    
    # Hash password if provided
    if "password" in update_dict and update_dict["password"]:
        update_dict["hashed_password"] = get_password_hash(update_dict["password"])
        del update_dict["password"]
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.users.update_one({"id": user_id}, {"$set": update_dict})
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.post("/users/{user_id}/toggle_active")
async def toggle_user_status(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"User {'activated' if new_status else 'deactivated'} successfully", "is_active": new_status}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# Direct Stock Addition endpoint
class DirectStockEntry(BaseModel):
    name: str
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    category: str = "General"
    subcategory: Optional[str] = None
    batch_number: str
    expiry_date: str
    purchase_price: float
    mrp: float
    sales_price: Optional[float] = None
    stock_quantity: int
    min_stock_level: int = 10
    gst_percentage: float = 12.0
    godown_id: Optional[str] = None
    branch_id: Optional[str] = None
    purpose: str = "for_sale"

@api_router.post("/direct-stock")
async def add_direct_stock(stock_data: DirectStockEntry, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Only admin can add direct stock")
    
    if not stock_data.godown_id and not stock_data.branch_id:
        raise HTTPException(status_code=400, detail="Either godown_id or branch_id is required")
    
    medicine_id = str(uuid.uuid4())
    medicine_dict = {
        "id": medicine_id,
        **stock_data.model_dump(),
        "supplier_id": None,
        "unit_price": stock_data.mrp,
        "discount_percentage": 0,
        "purpose": stock_data.purpose or "for_sale",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.medicines.insert_one(medicine_dict)
    
    # Also add to item master
    existing_item = await db.item_master.find_one({"name": stock_data.name})
    if not existing_item:
        item_master_dict = {
            "id": str(uuid.uuid4()),
            "name": stock_data.name,
            "mrp": stock_data.mrp,
            "manufacturer": stock_data.manufacturer,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.item_master.insert_one(item_master_dict)
    
    return {"message": "Stock added successfully", "medicine_id": medicine_id}

@api_router.post("/branches", response_model=Branch)
async def create_branch(branch_data: BranchCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    branch_id = str(uuid.uuid4())
    branch_dict = {
        "id": branch_id,
        **branch_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.branches.insert_one(branch_dict)
    return Branch(**branch_dict)

@api_router.get("/branches", response_model=List[Branch])
async def get_branches(current_user: dict = Depends(get_current_user)):
    branches = await db.branches.find({}, {"_id": 0}).to_list(1000)
    return branches

@api_router.put("/branches/{branch_id}", response_model=Branch)
async def update_branch(branch_id: str, branch_data: BranchCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.branches.find_one({"id": branch_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    update_data = branch_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.branches.update_one({"id": branch_id}, {"$set": update_data})
    updated = await db.branches.find_one({"id": branch_id}, {"_id": 0})
    return Branch(**updated)

@api_router.delete("/branches/{branch_id}")
async def delete_branch(branch_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.branches.find_one({"id": branch_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    await db.branches.delete_one({"id": branch_id})
    return {"message": "Branch deleted successfully"}

@api_router.post("/patients", response_model=Patient)
async def create_patient(patient_data: PatientCreate, current_user: dict = Depends(get_current_user)):
    # Check if patient_id already exists
    existing = await db.patients.find_one({"patient_id": patient_data.patient_id})
    if existing:
        raise HTTPException(status_code=400, detail="Patient ID already exists")
    
    internal_id = str(uuid.uuid4())
    patient_dict = {
        "id": internal_id,
        **patient_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.patients.insert_one(patient_dict)
    return Patient(**patient_dict)

@api_router.get("/patients", response_model=List[Patient])
async def get_patients(branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    # All users can view all patients - no branch restriction
    
    patients = await db.patients.find(query, {"_id": 0}).to_list(1000)
    return patients

@api_router.get("/patients/{patient_id}")
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@api_router.put("/patients/{patient_id}")
async def update_patient(patient_id: str, patient_data: PatientUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in patient_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Check if updating patient_id to one that already exists
    if patient_data.patient_id:
        existing = await db.patients.find_one({"patient_id": patient_data.patient_id, "id": {"$ne": patient_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Patient ID already exists")
    
    result = await db.patients.update_one({"id": patient_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    updated = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return updated

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete patients")
    
    result = await db.patients.delete_one({"id": patient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deleted successfully"}

@api_router.get("/patients/search", response_model=List[Patient])
async def search_patients(q: str, current_user: dict = Depends(get_current_user)):
    # Search across all patients by name, phone, or patient_id
    query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q}},
            {"patient_id": {"$regex": q, "$options": "i"}}
        ]
    }
    patients = await db.patients.find(query, {"_id": 0}).to_list(100)
    return patients

async def get_patient_financial_snapshot(patient_id: str, external_id: Optional[str] = None):
    """Calculate pending fees and previous balances for a patient."""
    today = datetime.now(timezone.utc).date()
    
    # Query all bills and pharmacy sales for this patient using both internal and external IDs
    id_filter = {"$in": [patient_id, external_id]} if external_id else patient_id
    bills = await db.bills.find({"patient_id": id_filter}).to_list(2000)
    sales = await db.pharmacy_sales.find({"patient_id": id_filter}).to_list(2000)
    
    treatment_fees_pending = 0
    previous_balance_treatment = 0
    pharmacy_fees_pending = 0
    previous_balance_pharmacy = 0
    doctor_name = None
    
    for b in bills:
        try:
            created_at = datetime.fromisoformat(b["created_at"].replace('Z', '+00:00'))
            is_today = created_at.date() == today
        except:
            is_today = False # Fallback for malformed dates
            
        balance = b.get("total_amount", 0) - (b.get("paid_amount") or 0)
        if is_today:
            treatment_fees_pending += balance
            if not doctor_name and b.get("doctor_name"):
                doctor_name = b["doctor_name"]
        else:
            previous_balance_treatment += balance
            
    for s in sales:
        try:
            created_at = datetime.fromisoformat(s["created_at"].replace('Z', '+00:00'))
            is_today = created_at.date() == today
        except:
            is_today = False
            
        balance = s.get("total_amount", 0) - (s.get("paid_amount") or 0)
        if is_today:
            pharmacy_fees_pending += balance
        else:
            previous_balance_pharmacy += balance
            
    return {
        "previous_balance": previous_balance_treatment + previous_balance_pharmacy,
        "treatment_fees_pending": treatment_fees_pending,
        "pharmacy_fees_pending": pharmacy_fees_pending,
        "current_balance": previous_balance_treatment + previous_balance_pharmacy + treatment_fees_pending + pharmacy_fees_pending,
        "doctor_name": doctor_name
    }

@api_router.post("/walkins/checkin", response_model=WalkIn)
async def checkin_patient(walkin_data: WalkInCreate, current_user: dict = Depends(get_current_user)):
    # Check if patient exists
    patient = await db.patients.find_one({"id": walkin_data.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if patient already has an active walk-in
    active_walkin = await db.walkins.find_one({
        "patient_id": walkin_data.patient_id,
        "status": {"$ne": "completed"}
    })
    if active_walkin:
        branch = await db.branches.find_one({"id": active_walkin["branch_id"]})
        branch_name = branch["name"] if branch else "Unknown Branch"
        raise HTTPException(status_code=400, detail=f"Patient is already checked-in at {branch_name}")

    walkin_id = str(uuid.uuid4())
    branch = await db.branches.find_one({"id": walkin_data.branch_id})
    
    walkin_dict = {
        "id": walkin_id,
        "patient_id": walkin_data.patient_id,
        "patient_name": patient["name"],
        "patient_phone": patient["phone"],
        "branch_id": walkin_data.branch_id,
        "branch_name": branch["name"] if branch else None,
        "check_in_time": datetime.now(timezone.utc).isoformat(),
        "status": "waiting",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.walkins.insert_one(walkin_dict)
    return WalkIn(**walkin_dict)

@api_router.get("/walkins", response_model=List[dict])
async def get_walkins(
    branch_id: Optional[str] = None, 
    branch_ids: Optional[str] = None,
    status: Optional[str] = None, 
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # Permission clamping
    user_branch_id = current_user.get("branch_id")
    is_admin = current_user["role"] == "admin"
    
    # Resolve target branch IDs
    target_ids = []
    if branch_ids:
        target_ids = [b.strip() for b in branch_ids.split(",") if b.strip()]
    elif branch_id:
        target_ids = [branch_id]
        
    if not is_admin:
        # Non-admins can only see their own branch
        if user_branch_id:
            if target_ids:
                # Filter requested IDs to only allowed one
                target_ids = [b for b in target_ids if b == user_branch_id]
            else:
                target_ids = [user_branch_id]
        else:
            # If user has no branch and isn't admin, they see nothing? 
            # Or perhaps they see what they created. For walkins, branch-based is safer.
            target_ids = []

    if target_ids:
        if len(target_ids) == 1:
            query["branch_id"] = target_ids[0]
        else:
            query["branch_id"] = {"$in": target_ids}
    
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": "completed"}
    
    walkins = await db.walkins.find(query, {"_id": 0}).sort("check_in_time", 1).to_list(100)
    
    
    # Enhance with financial snapshot - Optimized Bulk Approach
    patient_ids_uuid = list(set(w["patient_id"] for w in walkins))
    patients = await db.patients.find({"id": {"$in": patient_ids_uuid}}).to_list(len(patient_ids_uuid) + 10)
    id_map = {p["id"]: p.get("patient_id") for p in patients}
    
    # Collect all IDs to search for bills (UUIDs and external IDs)
    search_ids = set(patient_ids_uuid)
    for ext_id in id_map.values():
        if ext_id:
            search_ids.add(ext_id)
            
    # Bulk fetch all relevant bills and sales
    all_bills = await db.bills.find({"patient_id": {"$in": list(search_ids)}}).to_list(5000)
    all_sales = await db.pharmacy_sales.find({"patient_id": {"$in": list(search_ids)}}).to_list(5000)
    
    today = datetime.now(timezone.utc).date()
    
    enhanced_walkins = []
    for w in walkins:
        uuid = w["patient_id"]
        ext_id = id_map.get(uuid)
        active_ids = {uuid, ext_id} if ext_id else {uuid}
        
        # Filter bills/sales for THIS patient in memory
        patient_bills = [b for b in all_bills if b.get("patient_id") in active_ids]
        patient_sales = [s for s in all_sales if s.get("patient_id") in active_ids]
        
        treatment_fees_pending = 0
        previous_balance_treatment = 0
        pharmacy_fees_pending = 0
        previous_balance_pharmacy = 0
        doctor_name = None
        
        for b in patient_bills:
            try:
                created_at = datetime.fromisoformat(b["created_at"].replace('Z', '+00:00'))
                is_today = created_at.date() == today
            except: is_today = False
                
            balance = b.get("total_amount", 0) - (b.get("paid_amount") or 0)
            if is_today:
                treatment_fees_pending += balance
                if not doctor_name and b.get("doctor_name"):
                    doctor_name = b["doctor_name"]
            else:
                previous_balance_treatment += balance
                
        for s in patient_sales:
            try:
                created_at = datetime.fromisoformat(s["created_at"].replace('Z', '+00:00'))
                is_today = created_at.date() == today
            except: is_today = False
                
            balance = s.get("total_amount", 0) - (s.get("paid_amount") or 0)
            if is_today:
                pharmacy_fees_pending += balance
            else:
                previous_balance_pharmacy += balance
                
        enhanced_walkins.append({
            **w,
            "previous_balance": previous_balance_treatment + previous_balance_pharmacy,
            "treatment_fees_pending": treatment_fees_pending,
            "pharmacy_fees_pending": pharmacy_fees_pending,
            "current_balance": previous_balance_treatment + previous_balance_pharmacy + treatment_fees_pending + pharmacy_fees_pending,
            "doctor_name": doctor_name
        })
    
    return enhanced_walkins

@api_router.delete("/walkins/{walkin_id}")
async def delete_walkin(walkin_id: str, current_user: dict = Depends(get_current_user)):
    # Check if walkin exists
    walkin = await db.walkins.find_one({"id": walkin_id})
    if not walkin:
        raise HTTPException(status_code=404, detail="Walk-in record not found")
    
    # Only allow deleting if status is 'waiting'
    if walkin["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Cannot delete walk-in that is already in progress or completed")
    
    result = await db.walkins.delete_one({"id": walkin_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Failed to delete walk-in record")
        
    return {"message": "Walk-in check-in undone successfully"}


@api_router.post("/walkins/{walkin_id}/checkout")
async def checkout_walkin(walkin_id: str, checkout_data: dict, current_user: dict = Depends(get_current_user)):
    walkin = await db.walkins.find_one({"id": walkin_id})
    if not walkin:
        raise HTTPException(status_code=404, detail="Walk-in record not found")
    
    if walkin["status"] == "completed":
        raise HTTPException(status_code=400, detail="Walk-in already completed")
    
    update_dict = {
        "status": "completed",
        "payment_mode": checkout_data.get("payment_mode"),
        "paid_amount": checkout_data.get("paid_amount", 0),
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.walkins.update_one({"id": walkin_id}, {"$set": update_dict})
    return {"message": "Checkout completed successfully"}

@api_router.post("/patients/bulk-upload")
async def bulk_upload_patients(patients: List[PatientCreate], current_user: dict = Depends(get_current_user)):
    # All users can add patients
    created = []
    errors = []
    
    for idx, patient_data in enumerate(patients):
        try:
            # Check if patient_id already exists
            existing = await db.patients.find_one({"patient_id": patient_data.patient_id})
            if existing:
                errors.append({"row": idx + 1, "patient_id": patient_data.patient_id, "error": "Patient ID already exists"})
                continue
            
            internal_id = str(uuid.uuid4())
            patient_dict = {
                "id": internal_id,
                **patient_data.model_dump(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.patients.insert_one(patient_dict)
            created.append(patient_dict)
        except Exception as e:
            errors.append({"row": idx + 1, "patient_id": patient_data.patient_id, "error": str(e)})
    
    return {"created": len(created), "errors": errors}

@api_router.post("/medicines", response_model=Medicine)
async def create_medicine(medicine_data: MedicineCreate, current_user: dict = Depends(get_current_user)):
    medicine_id = str(uuid.uuid4())
    medicine_dict = {
        "id": medicine_id,
        **medicine_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.medicines.insert_one(medicine_dict)
    return Medicine(**medicine_dict)

@api_router.get("/medicines", response_model=List[Medicine])
async def get_medicines(branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    medicines = await db.medicines.find(query, {"_id": 0}).to_list(1000)
    return medicines

@api_router.put("/medicines/{medicine_id}", response_model=Medicine)
async def update_medicine(medicine_id: str, medicine_data: MedicineCreate, current_user: dict = Depends(get_current_user)):
    medicine_dict = medicine_data.model_dump()
    await db.medicines.update_one({"id": medicine_id}, {"$set": medicine_dict})
    
    updated_medicine = await db.medicines.find_one({"id": medicine_id}, {"_id": 0})
    if not updated_medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return Medicine(**updated_medicine)

@api_router.post("/medicines/bulk-upload")
async def bulk_upload_medicines(medicines: List[MedicineCreate], current_user: dict = Depends(get_current_user)):
    """Bulk upload inventory/medicine items from CSV/Excel"""
    created = []
    errors = []
    
    for idx, medicine_data in enumerate(medicines):
        try:
            medicine_id = str(uuid.uuid4())
            medicine_dict = {
                "id": medicine_id,
                **medicine_data.model_dump(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.medicines.insert_one(medicine_dict)
            created.append(medicine_dict)
        except Exception as e:
            errors.append({"row": idx + 1, "name": medicine_data.name, "error": str(e)})
    
    return {"created": len(created), "errors": errors}

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    supplier_id = str(uuid.uuid4())
    supplier_dict = {
        "id": supplier_id,
        **supplier_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.suppliers.insert_one(supplier_dict)
    return Supplier(**supplier_dict)

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(current_user: dict = Depends(get_current_user)):
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    return suppliers

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    result = await db.suppliers.update_one({"id": supplier_id}, {"$set": supplier_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    return Supplier(**supplier)

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.suppliers.delete_one({"id": supplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted successfully"}

async def deduct_stock_fefo(item_name: str, quantity: float, branch_id: Optional[str] = None, godown_id: Optional[str] = None, batch_number: Optional[str] = None):
    """
    Deduct stock from the medicines collection using FEFO (First Expiry First Out) logic.
    If batch_number is provided, it only deducts from that specific batch.
    Returns a list of deducted batch details.
    """
    # Build query for physical stock
    query = {"name": item_name, "stock_quantity": {"$gt": 0}, "purpose": "for_sale"}
    if batch_number:
        query["batch_number"] = batch_number
    if branch_id:
        query["branch_id"] = branch_id
    elif godown_id:
        query["godown_id"] = godown_id
    else:
        raise HTTPException(status_code=400, detail="Location ID (branch or godown) is required for stock deduction")

    # Find available batches
    # MongoDB ASC sort puts NULLs first. To follow "expiry missing -> oldest purchase", 
    # we ideally want NULLs last. For simplicity and robustness, we'll fetch all and sort in Python
    # if the list is small (which it should be per item per location).
    batches = await db.medicines.find(query).to_list(100)
    
    if not batches:
        raise HTTPException(status_code=400, detail=f"No stock available for {item_name} at this location")

    # FEFO Sort: 
    # 1. Items with expiry_date ASC (earliest first)
    # 2. Items without expiry_date (NULLs) come after
    # 3. Fallback to created_at ASC
    def sort_key(b):
        expiry = b.get("expiry_date")
        # Use a far future date for NULL expiries to put them at the end
        expiry_val = expiry if expiry and expiry.strip() else "9999-12-31"
        return (expiry_val, b.get("created_at", ""))

    batches.sort(key=sort_key)

    total_available = sum(b.get("stock_quantity", 0) for b in batches)
    if total_available < quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient stock for {item_name}. Requested: {quantity}, Available: {total_available}"
        )

    remaining_to_deduct = quantity
    deductions = []

    for batch in batches:
        if remaining_to_deduct <= 0:
            break
        
        batch_qty = batch.get("stock_quantity", 0)
        deduct_now = min(batch_qty, remaining_to_deduct)
        
        await db.medicines.update_one(
            {"id": batch["id"]},
            {"$inc": {"stock_quantity": -deduct_now}}
        )
        
        deductions.append({
            "batch_number": batch.get("batch_number"),
            "expiry_date": batch.get("expiry_date"),
            "mrp": batch.get("mrp"),
            "quantity": deduct_now,
            "medicine_id": batch["id"]
        })
        
        remaining_to_deduct -= deduct_now

    return deductions

@api_router.post("/pharmacy-sales", response_model=PharmacySale)
async def create_pharmacy_sale(sale_data: PharmacySaleCreate, current_user: dict = Depends(get_current_user)):
    sale_id = str(uuid.uuid4())
    
    # Pre-verification: Ensure all items have enough total stock before starting any deductions
    # (To avoid partial deductions if one item fails later)
    for item in sale_data.items:
        name = item.get("medicine_name") or item.get("name")
        qty = item["quantity"]
        
        check_query = {"name": name, "stock_quantity": {"$gt": 0}, "purpose": "for_sale"}
        if sale_data.branch_id:
            check_query["branch_id"] = sale_data.branch_id
        
        available_batches = await db.medicines.find(check_query).to_list(100)
        total_avail = sum(b.get("stock_quantity", 0) for b in available_batches)
        if total_avail < qty:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {name}. Total available at this branch: {total_avail}"
            )

    # Perform FEFO deductions and record batch info in sale items
    enriched_items = []
    for item in sale_data.items:
        name = item.get("medicine_name") or item.get("name")
        qty = item["quantity"]
        
        # Deduct using FEFO
        deductions = await deduct_stock_fefo(name, qty, branch_id=sale_data.branch_id)
        
        # If the sale item represented a single batch in UI, we now split it if FEFO took from multiple
        # or just record the batch info. For simplicity in existing UI, we'll keep the item 
        # but maybe store the batch details inside it for history.
        item_copy = dict(item)
        item_copy["deductions"] = deductions
        # Update the main batch/expiry fields if there's only one deduction for clarity
        if len(deductions) == 1:
            item_copy["batch_number"] = deductions[0]["batch_number"]
            item_copy["expiry_date"] = deductions[0]["expiry_date"]
            
        enriched_items.append(item_copy)

    sale_dict = {
        "id": sale_id,
        **sale_data.model_dump(),
        "items": enriched_items,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pharmacy_sales.insert_one(sale_dict)
    
    # Auto-log bank transaction for non-cash payments
    if sale_data.payment_mode != "cash":
        await log_bank_transaction(
            amount=sale_data.total_amount,
            payment_mode=sale_data.payment_mode,
            transaction_type="credit",
            reference_type="pharmacy_sale",
            reference_id=sale_id,
            reference_number=sale_data.transaction_ref or sale_id[:8],
            description=f"Pharmacy Sale - {sale_data.patient_name}",
            transaction_date=datetime.now(timezone.utc).isoformat()[:10],
            upi_id=sale_data.upi_id,
            party_name=sale_data.patient_name,
            party_id=sale_data.patient_id
        )
    
    return PharmacySale(**sale_dict)

@api_router.get("/pharmacy-sales", response_model=List[PharmacySale])
async def get_pharmacy_sales(branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    sales = await db.pharmacy_sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return sales

@api_router.put("/pharmacy-sales/{sale_id}", response_model=PharmacySale)
async def update_pharmacy_sale(sale_id: str, sale_data: dict, current_user: dict = Depends(get_current_user)):
    existing = await db.pharmacy_sales.find_one({"id": sale_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pharmacy sale not found")
    
    # Remove fields that shouldn't be updated
    update_data = {k: v for k, v in sale_data.items() if k not in ["id", "_id", "created_at", "created_by"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pharmacy_sales.update_one({"id": sale_id}, {"$set": update_data})
    
    updated = await db.pharmacy_sales.find_one({"id": sale_id}, {"_id": 0})
    return PharmacySale(**updated)

@api_router.post("/bills", response_model=Bill)
async def create_bill(bill_data: BillCreate, current_user: dict = Depends(get_current_user)):
    bill_id = str(uuid.uuid4())
    bill_dict = {
        "id": bill_id,
        **bill_data.model_dump(),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bills.insert_one(bill_dict)
    
    # Auto-log bank transaction for non-cash payments
    if bill_data.payment_mode != "cash":
        await log_bank_transaction(
            amount=bill_data.total_amount,
            payment_mode=bill_data.payment_mode,
            transaction_type="credit",
            reference_type="bill",
            reference_id=bill_id,
            reference_number=bill_data.transaction_ref or bill_id[:8],
            description=f"Treatment Bill - {bill_data.patient_name}",
            transaction_date=datetime.now(timezone.utc).isoformat()[:10],
            upi_id=bill_data.upi_id,
            party_name=bill_data.patient_name,
            party_id=bill_data.patient_id
        )
    
    return Bill(**bill_dict)

@api_router.get("/daily-report")
async def get_daily_report(
    date: Optional[str] = None,
    branch_ids: Optional[str] = None,  # Comma-separated branch IDs
    current_user: dict = Depends(get_current_user)
):
    """Get daily report for handover - patient-wise breakdown of treatments, pharmacy, collections."""
    
    # Use today's date if not specified
    if not date:
        target_date = datetime.now(timezone.utc).date()
    else:
        target_date = datetime.fromisoformat(date).date()
    
    # Date range for the day
    start_of_day = datetime.combine(target_date, datetime.min.time()).isoformat()
    end_of_day = datetime.combine(target_date, datetime.max.time()).isoformat()
    
    # Determine which branches to include
    user_branch_id = current_user.get("branch_id")
    is_admin = current_user["role"] == "admin"
    
    # Parse branch_ids if provided (admin can select multiple)
    selected_branches = []
    if branch_ids:
        selected_branches = [b.strip() for b in branch_ids.split(",") if b.strip()]
    
    # Build query based on user role and branch selection
    base_query = {"created_at": {"$gte": start_of_day, "$lte": end_of_day}}
    
    if is_admin:
        # Admin can select multiple branches, or see all if none selected
        if selected_branches:
            base_query["branch_id"] = {"$in": selected_branches}
        # If no branch selected, don't filter by branch_id to show all
    else:
        # Non-admin users see only their branch data
        if user_branch_id:
            base_query["branch_id"] = user_branch_id
        else:
            # If user has no branch assigned, show only their own created records
            base_query["created_by"] = current_user["id"]
    
    # Query for bills, pharmacy sales, expenses
    bills = await db.bills.find(base_query, {"_id": 0}).to_list(1000)
    pharmacy_sales = await db.pharmacy_sales.find(base_query, {"_id": 0}).to_list(1000)
    expenses = await db.expenses.find(base_query, {"_id": 0}).to_list(1000)
    
    # Query for bank transactions (collections today)
    bank_query = base_query.copy() # Uses created_at for bank txns
    bank_transactions = await db.bank_transactions.find(bank_query, {"_id": 0}).to_list(1000)
    
    # Query for walkins (to find cash collections today)
    walkin_query = base_query.copy()
    if "created_at" in walkin_query:
        walkin_query["paid_at"] = walkin_query.pop("created_at")
    walkin_query["status"] = "completed"
    walkins = await db.walkins.find(walkin_query, {"_id": 0}).to_list(1000)
    
    # Build patient-wise report
    patient_report = {}
    
    def get_or_init_patient(p_id, p_name="Walk-in Patient"):
        if p_id not in patient_report:
            patient_report[p_id] = {
                "patient_id": p_id,
                "patient_name": p_name,
                "treatment_amount": 0,
                "pharmacy_amount": 0,
                "total_amount": 0,
                "paid_amount": 0,
                "balance_amount": 0,
                "collections": [],
                "cash": 0,
                "upi": 0,
                "card": 0,
                "netbanking": 0,
                "other": 0
            }
        return patient_report[p_id]

    # Process work done today (treatments) & Cash Collections from Bills
    for bill in bills:
        p_id = bill.get("patient_id", "walk-in")
        p = get_or_init_patient(p_id, bill.get("patient_name"))
        bill_total = bill.get("total_amount", 0)
        p["treatment_amount"] += bill_total
        p["total_amount"] += bill_total

        # Capture Cash Payment if made via Billing
        payment_mode = bill.get("payment_mode", "cash").lower()
        paid_amount = bill.get("paid_amount", 0)
        
        if payment_mode == "cash" and paid_amount > 0:
            p["paid_amount"] += paid_amount
            p["cash"] += paid_amount
            p["collections"].append({
                "type": "Treatment",
                "bill_id": bill.get("id"),
                "amount": paid_amount,
                "payment_mode": "cash",
                "description": "Cash payment at billing"
            })

    # Process work done today (pharmacy) & Cash Collections from Sales
    for sale in pharmacy_sales:
        p_id = sale.get("patient_id") or "walk-in"
        p = get_or_init_patient(p_id, sale.get("patient_name"))
        sale_total = sale.get("total_amount", 0)
        p["pharmacy_amount"] += sale_total
        p["total_amount"] += sale_total

        # Capture Cash Payment if made via Pharmacy Billing
        payment_mode = sale.get("payment_mode", "cash").lower()
        paid_amount = sale.get("paid_amount", 0)
        
        if payment_mode == "cash" and paid_amount > 0:
            p["paid_amount"] += paid_amount
            p["cash"] += paid_amount
            p["collections"].append({
                "type": "Pharmacy",
                "sale_id": sale.get("id"),
                "amount": paid_amount,
                "payment_mode": "cash",
                "description": "Cash payment at pharmacy"
            })

    # Record Collections - Bank Transactions (UPI, Card, Net Banking)
    for txn in bank_transactions:
        # Only process credits (collections) for the patient report
        if txn.get("transaction_type") != "credit":
            continue
            
        p_id = txn.get("party_id") or "walk-in"
        p = get_or_init_patient(p_id, txn.get("party_name"))
        
        amount = txn.get("amount", 0)
        mode = (txn.get("payment_mode") or "other").lower()
        
        p["paid_amount"] += amount
        if mode in ["cash", "upi", "card", "netbanking"]:
            p[mode] += amount
        else:
            p["other"] += amount
            
        p["collections"].append({
            "type": txn.get("reference_type") or "Collection",
            "amount": amount,
            "payment_mode": mode,
            "upi_id": txn.get("upi_id"),
            "bank_name": txn.get("bank_name"),
            "reference_number": txn.get("reference_number"),
            "description": txn.get("description")
        })

    # Record Collections - Cash from Walkins
    # Note: bank_transactions are usually non-cash, so we look at walkins for cash
    for walkin in walkins:
        if walkin.get("payment_mode") == "cash":
            p_id = walkin.get("patient_id") or "walk-in"
            p = get_or_init_patient(p_id, walkin.get("name"))
            
            amount = walkin.get("paid_amount", 0)
            p["paid_amount"] += amount
            p["cash"] += amount
            
            p["collections"].append({
                "type": "Treatment",
                "amount": amount,
                "payment_mode": "cash",
                "description": "Cash payment at checkout"
            })

    # Calculate balance for each patient
    # Balance = Total Work Today - Total Paid Today (simplified for Daily Report)
    for p in patient_report.values():
        p["balance_amount"] = p["total_amount"] - p["paid_amount"]

    # Calculate overall summary
    payment_summary = {"cash": 0, "card": 0, "upi": 0, "netbanking": 0, "other": 0}
    for p in patient_report.values():
        payment_summary["cash"] += p["cash"]
        payment_summary["card"] += p["card"]
        payment_summary["upi"] += p[ "upi"]
        payment_summary["netbanking"] += p["netbanking"]
        payment_summary["other"] += p["other"]

    total_treatment = sum(p["treatment_amount"] for p in patient_report.values())
    total_pharmacy = sum(p["pharmacy_amount"] for p in patient_report.values())
    total_collected = sum(p["paid_amount"] for p in patient_report.values())
    total_balance = sum(p["balance_amount"] for p in patient_report.values())
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    
    return {
        "date": target_date.isoformat(),
        "user_id": current_user["id"],
        "branches": selected_branches if selected_branches else ([user_branch_id] if user_branch_id else []),
        "summary": {
            "total_treatment_amount": total_treatment,
            "total_pharmacy_amount": total_pharmacy,
            "total_amount": total_treatment + total_pharmacy,
            "total_collected": total_collected,
            "total_balance": total_balance,
            "total_expenses": total_expenses,
            "net_collection": total_collected - total_expenses,
            "payment_modes": payment_summary
        },
        "patients": list(patient_report.values()),
        "expenses": expenses
    }

# Shift/Handover endpoints
@api_router.post("/shifts/start", response_model=Shift)
async def start_shift(shift_data: ShiftStart, current_user: dict = Depends(get_current_user)):
    """Start a new shift - for receptionist/accountant users."""
    
    # Check if user already has an active shift
    active_shift = await db.shifts.find_one({
        "user_id": current_user["id"],
        "status": "active"
    })
    
    if active_shift:
        raise HTTPException(status_code=400, detail="You already have an active shift. End it before starting a new one.")
    
    shift_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    shift_dict = {
        "id": shift_id,
        "user_id": current_user["id"],
        "user_name": current_user.get("full_name", current_user["email"]),
        "user_email": current_user["email"],
        "branch_id": shift_data.branch_id,
        "branch_name": shift_data.branch_name,
        "shift_date": now.date().isoformat(),
        "start_time": now.isoformat(),
        "end_time": None,
        "ended_by_id": None,
        "ended_by_name": None,
        "status": "active",
        "notes": shift_data.notes,
        "created_at": now.isoformat()
    }
    
    await db.shifts.insert_one(shift_dict)
    return Shift(**shift_dict)

@api_router.post("/shifts/end", response_model=Shift)
async def end_shift(shift_data: ShiftEnd, current_user: dict = Depends(get_current_user)):
    """End/confirm handover - for admin/branch manager users."""
    
    # Only admin or branch_manager can end shifts
    if current_user["role"] not in ["admin", "branch_manager"]:
        raise HTTPException(status_code=403, detail="Only admin or branch manager can confirm handover")
    
    shift = await db.shifts.find_one({"id": shift_data.shift_id, "status": "active"})
    if not shift:
        raise HTTPException(status_code=404, detail="Active shift not found")
    
    now = datetime.now(timezone.utc)
    
    update_data = {
        "end_time": now.isoformat(),
        "ended_by_id": current_user["id"],
        "ended_by_name": current_user.get("full_name", current_user["email"]),
        "status": "completed",
        "notes": shift_data.notes or shift.get("notes")
    }
    
    await db.shifts.update_one({"id": shift_data.shift_id}, {"$set": update_data})
    
    updated_shift = await db.shifts.find_one({"id": shift_data.shift_id}, {"_id": 0})
    return Shift(**updated_shift)

@api_router.get("/shifts/active")
async def get_active_shifts(
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get active shifts - for admin/branch manager to see who needs handover."""
    query = {"status": "active"}
    
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    shifts = await db.shifts.find(query, {"_id": 0}).sort("start_time", -1).to_list(100)
    return shifts

@api_router.get("/shifts/my-active")
async def get_my_active_shift(current_user: dict = Depends(get_current_user)):
    """Get current user's active shift."""
    shift = await db.shifts.find_one({
        "user_id": current_user["id"],
        "status": "active"
    }, {"_id": 0})
    return shift

@api_router.get("/shifts/history")
async def get_shift_history(
    branch_id: Optional[str] = None,
    user_id: Optional[str] = None,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get shift history."""
    query = {}
    
    if branch_id:
        query["branch_id"] = branch_id
    if user_id:
        query["user_id"] = user_id
    if date:
        query["shift_date"] = date
    
    # Non-admin users can only see their own shifts
    if current_user["role"] not in ["admin", "branch_manager"]:
        query["user_id"] = current_user["id"]
    
    shifts = await db.shifts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return shifts

@api_router.get("/shifts/post-handover-transactions")
async def get_post_handover_transactions(
    user_id: str,
    shift_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get transactions done by a user after their shift was ended (post-handover)."""
    
    # Get the shift
    shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    if not shift or not shift.get("end_time"):
        return {"bills": [], "pharmacy_sales": []}
    
    end_time = shift["end_time"]
    
    # Find transactions by this user after the shift ended
    bills = await db.bills.find({
        "created_by": user_id,
        "created_at": {"$gt": end_time}
    }, {"_id": 0}).to_list(100)
    
    pharmacy_sales = await db.pharmacy_sales.find({
        "created_by": user_id,
        "created_at": {"$gt": end_time}
    }, {"_id": 0}).to_list(100)
    
    return {
        "bills": bills,
        "pharmacy_sales": pharmacy_sales,
        "shift_end_time": end_time
    }

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    bills = await db.bills.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bills

@api_router.put("/bills/{bill_id}", response_model=Bill)
async def update_bill(bill_id: str, bill_data: dict, current_user: dict = Depends(get_current_user)):
    existing = await db.bills.find_one({"id": bill_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Remove fields that shouldn't be updated
    update_data = {k: v for k, v in bill_data.items() if k not in ["id", "_id", "created_at", "created_by"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.bills.update_one({"id": bill_id}, {"$set": update_data})
    
    updated = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    return Bill(**updated)

@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a bill (typically a pending/temporary one)."""
    result = await db.bills.delete_one({"id": bill_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    return {"message": "Bill deleted successfully"}

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expense_id = str(uuid.uuid4())
    expense_dict = {
        "id": expense_id,
        **expense_data.model_dump(),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.expenses.insert_one(expense_dict)
    return Expense(**expense_dict)

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return expenses

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appointment_data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    appointment_id = str(uuid.uuid4())
    appointment_dict = {
        "id": appointment_id,
        **appointment_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment_dict)
    return Appointment(**appointment_dict)

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(branch_id: Optional[str] = None, date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    if date:
        query["appointment_date"] = date
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("appointment_date", -1).to_list(1000)
    return appointments

@api_router.get("/reports/dashboard")
async def get_dashboard_stats(branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    today = datetime.now(timezone.utc).date().isoformat()
    
    total_revenue_bills = await db.bills.aggregate([
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    
    total_revenue_pharmacy = await db.pharmacy_sales.aggregate([
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    
    total_expenses = await db.expenses.aggregate([
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    bills_revenue = total_revenue_bills[0]["total"] if total_revenue_bills else 0
    pharmacy_revenue = total_revenue_pharmacy[0]["total"] if total_revenue_pharmacy else 0
    total_revenue = bills_revenue + pharmacy_revenue
    expenses = total_expenses[0]["total"] if total_expenses else 0
    
    today_query = {**query, "appointment_date": today}
    appointments_today = await db.appointments.count_documents(today_query)
    
    # Use the same logic as the low-stock report for consistency
    low_stock_items = await get_low_stock_medicines(branch_id=branch_id, current_user=current_user)
    low_stock_count = len(low_stock_items)
    
    total_patients = await db.patients.count_documents(query)
    
    # Count bills created today
    bills_today_query = {**query}
    bills_today = await db.bills.count_documents(bills_today_query)
    
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    expiry_alert_days = settings.get("expiry_alert_days", 90)
    
    return {
        "total_revenue": total_revenue,
        "bills_revenue": bills_revenue,
        "pharmacy_revenue": pharmacy_revenue,
        "total_expenses": expenses,
        "net_profit": total_revenue - expenses,
        "appointments_today": appointments_today,
        "low_stock_items": low_stock_count,
        "total_patients": total_patients,
        "bills_today": bills_today,
        "expiry_alert_days": expiry_alert_days
    }

@api_router.get("/reports/low-stock")
async def get_low_stock_medicines(
    branch_id: Optional[str] = None, 
    branch_ids: Optional[List[str]] = Query(None),
    godown_ids: Optional[List[str]] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Return low-stock medicines with location details, respecting permissions."""
    
    # Combined target locations
    target_branches = branch_ids or ([branch_id] if branch_id else [])
    target_godowns = godown_ids or []

    # 1. Permission Logic
    auth_branches = []
    show_all = False
    
    if current_user["role"] == "admin":
        show_all = True
    else:
        # Non-admins restricted to their assigned branch
        if current_user.get("branch_id"):
            auth_branches = [current_user["branch_id"]]
        else:
            return []
            
    # Final location filter based on permissions
    final_branches = target_branches if show_all else [b for b in target_branches if b in auth_branches]
    if not show_all and not final_branches and not target_branches:
        # If no branches requested and not admin, default to auth_branch
        final_branches = auth_branches
    
    # For non-admins, target_godowns are usually ignored unless we want to allow cross-view
    final_godowns = target_godowns if show_all else []
    
    # 2. Apply Filters and Fetch Data
    # Use the consolidated stock logic to ensure we match Pharmacy view
    res = await get_consolidated_stock_internal(branch_id=final_branches, godown_id=final_godowns, consolidate_batches=True, include_pending=False)
    stock_map = res
    
    # Filter for low stock and active items
    low_stock_items = []
    for item in stock_map.values():
        if item.get("item_status") == "INACTIVE":
            continue
        # Skip items where low stock warning is disabled in item_master
        if not item.get("low_stock_warning_enabled", False):
            continue
            
        qty = item.get("stock_quantity", 0)
        min_level = item.get("min_stock_level", 0)
        
        if qty <= min_level and min_level > 0:
            low_stock_items.append(item)
    
    if not low_stock_items:
        return []

    # 3. Resolve Location Names (Branches & Godowns)
    # Collect IDs to fetch names only for what's needed
    branch_ids = {m.get("branch_id") for m in low_stock_items if m.get("branch_id")}
    godown_ids = {m.get("godown_id") for m in low_stock_items if m.get("godown_id")}
    
    # Fetch full data for both to enable branch propagation from godowns
    branches_list, godowns_list = await asyncio.gather(
        db.branches.find({"id": {"$in": list(branch_ids)}}, {"_id": 0}).to_list(1000) if branch_ids else asyncio.sleep(0, result=[]),
        db.godowns.find({"id": {"$in": list(godown_ids)}}, {"_id": 0}).to_list(1000) if godown_ids else asyncio.sleep(0, result=[])
    )
    
    branch_map = {b["id"]: b["name"] for b in branches_list}
    godown_map = {g["id"]: g for g in godowns_list} # Keep full godown object for branch_id
    
    # 4. Attach Names and Context to Response
    for med in low_stock_items:
        bid = med.get("branch_id")
        gid = med.get("godown_id")
        
        # Resolve branch info
        if bid:
            med["branch_name"] = branch_map.get(bid, "Unknown Branch")
        
        # Resolve godown info and propagate branch if missing
        if gid:
            godown = godown_map.get(gid)
            if godown:
                med["godown_name"] = godown.get("name", "Unknown Godown")
                # If item has no branch_id but godown does, link it
                if not bid and godown.get("branch_id"):
                    med["branch_id"] = godown["branch_id"]
                    med["branch_name"] = branch_map.get(med["branch_id"]) or (await db.branches.find_one({"id": med["branch_id"]}, {"name": 1}))["name"]
        
        # Add location_type for frontend convenience
        if gid:
            med["location_type"] = "godown"
        elif bid:
            med["location_type"] = "branch"
        else:
            med["location_type"] = "unknown"
            
    return low_stock_items

@api_router.get("/reports/low-stock-summary")
async def get_low_stock_summary(current_user: dict = Depends(get_current_user)):
    """Return low-stock items grouped by branch and godown, filtering by permissions."""
    
    # 1. Permission Check for Non-Admins
    authorized_branches = []
    authorized_godowns = [] # Non-admins typically don't see godowns in this view unless explicitly required
    show_all = False

    if current_user["role"] == "admin":
        show_all = True
    else:
        # Check specific module permissions
        user_perms = await db.user_permissions.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
        
        # Modules that grant visibility (Pharmacy, Purchases, Inventory)
        allowed_modules = ["Pharmacy", "Purchases", "Inventory"]
        has_access = any(p.get("can_view") and p.get("module") in allowed_modules for p in user_perms)
        
        if not has_access:
            # If no permission to view stock-related modules, return empty
            return {
                "by_branch": [],
                "by_godown": []
            }
        
        # Non-admins restricted to their assigned branch
        if current_user.get("branch_id"):
            authorized_branches = [current_user["branch_id"]]
        else:
            # If user has no branch assigned, they see nothing (safe default)
            return {
                "by_branch": [],
                "by_godown": []
            }

    # 2. Fetch Data
    # Use the consolidated stock logic to ensure we match Pharmacy view
    # For summary, we fetch all (filtering happens during grouping or here if needed)
    res = await get_consolidated_stock_internal(include_pending=False)
    all_stock_map = res
    
    # Filter for low stock and active items
    all_low = []
    for item in all_stock_map.values():
        if item.get("item_status") == "INACTIVE":
            continue
        # Skip items where low stock warning is disabled in item_master
        if not item.get("low_stock_warning_enabled", False):
            continue
            
        qty = item.get("stock_quantity", 0)
        min_level = item.get("min_stock_level", 0)
        
        # Apply permission filter early if needed
        bid = item.get("branch_id")
        if not show_all and bid not in authorized_branches:
            continue
            
        if qty <= min_level:
            all_low.append(item)
    
    if not all_low:
        return {
            "by_branch": [],
            "by_godown": []
        }

    # 3. Fetch Names for Resolution
    # Optimization: Only fetch needed branches/godowns if not showing all
    branch_query = {}
    godown_query = {}
    
    if not show_all and authorized_branches:
        branch_query["id"] = {"$in": authorized_branches}
        # godown_query remains empty/unused for non-admins to avoid leaking info
        
    branches_list, godowns_list = await asyncio.gather(
        db.branches.find(branch_query, {"_id": 0, "id": 1, "name": 1}).to_list(1000),
        db.godowns.find(godown_query, {"_id": 0, "id": 1, "name": 1}).to_list(1000) if show_all else asyncio.sleep(0, result=[])
    )
    
    branch_map = {b["id"]: b["name"] for b in branches_list}
    godown_map = {g["id"]: g["name"] for g in godowns_list}

    # 4. Group Data
    branch_groups = {}
    godown_groups = {}

    for item in all_low:
        bid = item.get("branch_id")
        gid = item.get("godown_id")
        
        # Simplify item object for frontend
        item_summary = {
            "name": item.get("name"),
            "stock_quantity": item.get("stock_quantity", 0),
            "min_stock_level": item.get("min_stock_level", 0),
            "unit": item.get("unit", "")
        }

        if bid:
            if bid not in branch_groups:
                branch_groups[bid] = {
                    "branch_id": bid,
                    "branch_name": branch_map.get(bid, "Unknown Branch"),
                    "items": []
                }
            branch_groups[bid]["items"].append(item_summary)
            
        elif gid and show_all: # Only process godowns for admins
            if gid not in godown_groups:
                godown_groups[gid] = {
                    "godown_id": gid,
                    "godown_name": godown_map.get(gid, "Unknown Godown"),
                    "items": []
                }
            godown_groups[gid]["items"].append(item_summary)

    # 5. Format Response
    return {
        "by_branch": list(branch_groups.values()),
        "by_godown": list(godown_groups.values())
    }


@api_router.get("/reports/expiring-soon")
async def get_expiring_medicines(
    branch_id: Optional[str] = None, 
    branch_ids: Optional[List[str]] = Query(None),
    godown_ids: Optional[List[str]] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Return batch-wise expiring medicines, respecting permissions and configurable alert window."""
    
    # Combined target locations
    target_branches = branch_ids or ([branch_id] if branch_id else [])
    target_godowns = godown_ids or []

    # Permission logic
    auth_branches = []
    show_all = False
    if current_user["role"] == "admin":
        show_all = True
    else:
        if current_user.get("branch_id"):
            auth_branches = [current_user["branch_id"]]
        else:
            return []
            
    final_branches = target_branches if show_all else [b for b in target_branches if b in auth_branches]
    if not show_all and not final_branches and not target_branches:
        final_branches = auth_branches
        
    final_godowns = target_godowns if show_all else []

    # 1. Fetch Alert Window Setting
    settings_doc = await db.settings.find_one({}, {"_id": 0, "expiry_alert_days": 1})
    alert_days = int(settings_doc.get("expiry_alert_days", 90)) if settings_doc else 90
    
    # Permission logic
    authorized_branches = []
    show_all = False
    if current_user["role"] == "admin":
        show_all = True
    else:
        if current_user.get("branch_id"):
            authorized_branches = [current_user["branch_id"]]
        else:
            return []

    # 2. Fetch Consolidated Stock Data (contains batch-wise info)
    stock_map = await get_consolidated_stock_internal(branch_id=final_branches, godown_id=final_godowns, include_pending=False)
    
    # 3. Process and Filter
    today = datetime.now(timezone.utc).date()
    later = today + timedelta(days=alert_days)
    
    expiring_soon = []
    
    for item in stock_map.values():
        if item.get("item_status") == "INACTIVE":
            continue
            
        # Check if expiry tracking is enabled for this item
        if not item.get("expiry_tracking_enabled", False):
            continue
            
        expiry_str = item.get("expiry_date")
        if not expiry_str:
            continue
            
        qty = item.get("stock_quantity", 0)
        if qty <= 0:
            continue

        try:
            # Handle various date formats (YYYY-MM-DD or ISO)
            expiry_date_obj = datetime.fromisoformat(expiry_str.replace('Z', '+00:00')).date()
        except (ValueError, TypeError):
            try:
                expiry_date_obj = datetime.strptime(expiry_str[:10], "%Y-%m-%d").date()
            except:
                continue

        # Check if within window
        if today <= expiry_date_obj <= later:
            # Location filter (already applied in get_consolidated_stock_internal, but safe check)
            bid = item.get("branch_id")
            gid = item.get("godown_id")
            
            if not show_all:
                if bid and bid not in auth_branches: continue
                # Non-admins shouldn't really see godowns, but if gid matches their branch somehow? 
                # safer to rely on get_consolidated_stock_internal filtering.
                
            # Add to list
            expiring_soon.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "batch_number": item.get("batch_number"),
                "expiry_date": item.get("expiry_date"),
                "stock_quantity": qty,
                "unit": item.get("unit"),
                "branch_id": bid,
                "godown_id": item.get("godown_id"),
                "branch_name": item.get("branch_name"),
                "godown_name": item.get("godown_name")
            })

    # 4. Final Data Resolution (Names) - Already present in consolidated stock results for branches/godowns
    # but let's double check if we need to resolve it manually if missing
    needed_branches = set()
    needed_godowns = set()
    for e in expiring_soon:
        if not e.get("branch_name") and e.get("branch_id"): needed_branches.add(e["branch_id"])
        if not e.get("godown_name") and e.get("godown_id"): needed_godowns.add(e["godown_id"])

    if needed_branches or needed_godowns:
        branches_list, godowns_list = await asyncio.gather(
            db.branches.find({"id": {"$in": list(needed_branches)}}, {"id": 1, "name": 1, "_id": 0}).to_list(100) if needed_branches else asyncio.sleep(0, result=[]),
            db.godowns.find({"id": {"$in": list(needed_godowns)}}, {"id": 1, "name": 1, "_id": 0}).to_list(100) if needed_godowns else asyncio.sleep(0, result=[])
        )
        b_map = {b["id"]: b["name"] for b in branches_list}
        g_map = {g["id"]: g["name"] for g in godowns_list}
        for e in expiring_soon:
            if not e.get("branch_name") and e.get("branch_id"): e["branch_name"] = b_map.get(e["branch_id"])
            if not e.get("godown_name") and e.get("godown_id"): e["godown_name"] = g_map.get(e["godown_id"])

    # Sorting
    expiring_soon.sort(key=lambda x: (x.get("expiry_date", ""), x.get("branch_name", ""), x.get("name", "")))
    
    return expiring_soon

# Treatment Categories
@api_router.post("/treatment-categories", response_model=TreatmentCategory)
async def create_treatment_category(category_data: TreatmentCategoryCreate, current_user: dict = Depends(get_current_user)):
    # Use unified categories collection
    item_type = await db.item_types.find_one({"name": "Treatment"})
    item_type_id = item_type["id"] if item_type else "treatment_type"
    
    category_id = str(uuid.uuid4())
    category_dict = {
        "id": category_id,
        **category_data.model_dump(),
        "item_type_id": item_type_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(category_dict)
    return TreatmentCategory(**category_dict)

@api_router.get("/treatment-categories", response_model=List[TreatmentCategory])
async def get_treatment_categories(current_user: dict = Depends(get_current_user)):
    item_type = await db.item_types.find_one({"name": "Treatment"})
    item_type_id = item_type["id"] if item_type else "treatment_type"
    categories = await db.categories.find({"item_type_id": item_type_id}, {"_id": 0}).to_list(1000)
    return categories

@api_router.put("/treatment-categories/{category_id}")
async def update_treatment_category(category_id: str, category_data: TreatmentCategoryCreate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in category_data.model_dump().items() if v is not None}
    result = await db.categories.update_one({"id": category_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return updated

@api_router.delete("/treatment-categories/{category_id}")
async def delete_treatment_category(category_id: str, current_user: dict = Depends(get_current_user)):
    subcategory_count = await db.subcategories.count_documents({"category_id": category_id})
    if subcategory_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category with existing subcategories")
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# Treatment SubCategories
@api_router.post("/treatment-subcategories", response_model=TreatmentSubCategory)
async def create_treatment_subcategory(subcategory_data: TreatmentSubCategoryCreate, current_user: dict = Depends(get_current_user)):
    subcategory_id = str(uuid.uuid4())
    subcategory_dict = {
        "id": subcategory_id,
        **subcategory_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subcategories.insert_one(subcategory_dict)
    return TreatmentSubCategory(**subcategory_dict)

@api_router.get("/treatment-subcategories", response_model=List[TreatmentSubCategory])
async def get_treatment_subcategories(category_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category_id:
        query["category_id"] = category_id
    else:
        # If no category_id, we might want to only return subcategories of "Treatment" categories
        item_type = await db.item_types.find_one({"name": "Treatment"})
        item_type_id = item_type["id"] if item_type else "treatment_type"
        treatment_categories = await db.categories.find({"item_type_id": item_type_id}, {"id": 1}).to_list(1000)
        category_ids = [c["id"] for c in treatment_categories]
        query["category_id"] = {"$in": category_ids}

    subcategories = await db.subcategories.find(query, {"_id": 0}).to_list(1000)
    return subcategories

@api_router.put("/treatment-subcategories/{subcategory_id}")
async def update_treatment_subcategory(subcategory_id: str, subcategory_data: TreatmentSubCategoryCreate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in subcategory_data.model_dump().items() if v is not None}
    result = await db.treatment_subcategories.update_one({"id": subcategory_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    updated = await db.treatment_subcategories.find_one({"id": subcategory_id}, {"_id": 0})
    return updated

@api_router.delete("/treatment-subcategories/{subcategory_id}")
async def delete_treatment_subcategory(subcategory_id: str, current_user: dict = Depends(get_current_user)):
    # Check if subcategory is used by any treatment
    treatment_count = await db.treatments.count_documents({"subcategory_id": subcategory_id})
    if treatment_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete subcategory with existing treatments")
    
    result = await db.treatment_subcategories.delete_one({"id": subcategory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    return {"message": "Subcategory deleted successfully"}

# Treatments
@api_router.post("/treatments", response_model=Treatment)
async def create_treatment(treatment_data: TreatmentCreate, current_user: dict = Depends(get_current_user)):
    item_type = await db.item_types.find_one({"name": "Treatment"})
    item_type_id = item_type["id"] if item_type else "treatment_type"
    
    treatment_id = str(uuid.uuid4())
    treatment_dict = {
        "id": treatment_id,
        **treatment_data.model_dump(),
        "item_type_id": item_type_id,
        "mrp": treatment_data.charges, # Sync charges to MRP
        "created_at": datetime.now(timezone.utc).isoformat(),
        "item_status": "ACTIVE" # Default status for new treatments
    }
    await db.item_master.insert_one(treatment_dict)
    return Treatment(**treatment_dict)

@api_router.get("/treatments", response_model=List[Treatment])
async def get_treatments(category_id: Optional[str] = None, subcategory_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    item_type = await db.item_types.find_one({"name": "Treatment"})
    item_type_id = item_type["id"] if item_type else "treatment_type"
    
    query = {"item_type_id": item_type_id}
    if category_id:
        query["category_id"] = category_id
    if subcategory_id:
        query["subcategory_id"] = subcategory_id
    if status:
        query["item_status"] = status
    else:
        query["item_status"] = {"$ne": "INACTIVE"} # Default to not inactive
        
    treatments_data = await db.item_master.find(query, {"_id": 0}).to_list(1000)
    return treatments_data

@api_router.put("/treatments/{treatment_id}")
async def update_treatment(treatment_id: str, treatment_data: TreatmentCreate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in treatment_data.model_dump().items() if v is not None}
    # Sync charges to MRP
    if "charges" in update_dict:
        update_dict["mrp"] = update_dict["charges"]
        
    result = await db.item_master.update_one({"id": treatment_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Treatment not found")
    updated = await db.item_master.find_one({"id": treatment_id}, {"_id": 0})
    return updated

@api_router.delete("/treatments/{treatment_id}")
async def delete_treatment(treatment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.treatments.delete_one({"id": treatment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Treatment not found")
    return {"message": "Treatment deleted successfully"}

# Migration Endpoint
@api_router.post("/migrate-treatments")
async def migrate_treatments(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform migration")
    
    # 1. Ensure "Treatment" Item Type exists
    item_type = await db.item_types.find_one({"name": "Treatment"})
    if not item_type:
        item_type_id = "treatment_type" # Fixed ID for convenience
        item_type = {
            "id": item_type_id,
            "name": "Treatment",
            "description": "Clinical treatments and procedures",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.item_types.insert_one(item_type)
    else:
        item_type_id = item_type["id"]

    # 2. Migrate Treatment Categories
    old_categories = await db.treatment_categories.find({}, {"_id": 0}).to_list(1000)
    migrated_count = 0
    for old_cat in old_categories:
        # Check if already migrated
        exists = await db.categories.find_one({"name": old_cat["name"], "item_type_id": item_type_id})
        if not exists:
            new_cat = {
                "id": old_cat["id"], # Keep ID to maintain subcategory links
                "name": old_cat["name"],
                "description": old_cat.get("description"),
                "item_type_id": item_type_id,
                "created_at": old_cat.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            await db.categories.insert_one(new_cat)
            migrated_count += 1

    # 3. Migrate Treatment Subcategories
    old_subcategories = await db.treatment_subcategories.find({}, {"_id": 0}).to_list(1000)
    for old_sub in old_subcategories:
        exists = await db.subcategories.find_one({"name": old_sub["name"], "category_id": old_sub["category_id"]})
        if not exists:
            new_sub = {
                "id": old_sub["id"],
                "category_id": old_sub["category_id"],
                "name": old_sub["name"],
                "description": old_sub.get("description"),
                "created_at": old_sub.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            await db.subcategories.insert_one(new_sub)

    # 4. Migrate Treatments to Item Master
    old_treatments = await db.treatments.find({}, {"_id": 0}).to_list(1000)
    for old_t in old_treatments:
        exists = await db.item_master.find_one({"name": old_t["name"], "item_type_id": item_type_id})
        if not exists:
            new_item = {
                "id": old_t["id"],
                "name": old_t["name"],
                "item_type_id": item_type_id,
                "category_id": old_t.get("category_id"),
                "subcategory_id": old_t.get("subcategory_id"),
                "charges": old_t.get("charges", 0),
                "mrp": old_t.get("charges", 0), # Mirror charges to MRP
                "duration_minutes": old_t.get("duration_minutes"),
                "gst_applicable": old_t.get("gst_applicable", False),
                "gst_percentage": old_t.get("gst_percentage", 0),
                "description": old_t.get("description"),
                "created_at": old_t.get("created_at") or datetime.now(timezone.utc).isoformat(),
                "purpose": "for_sale",
                "item_status": "ACTIVE" # Default status for migrated treatments
            }
            await db.item_master.insert_one(new_item)

    return {"message": "Migration completed successfully", "categories_migrated": migrated_count}

@api_router.delete("/treatments/{treatment_id}")
async def delete_treatment(treatment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.treatments.delete_one({"id": treatment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Treatment not found")
    return {"message": "Treatment deleted successfully"}

# Doctors
@api_router.post("/doctors", response_model=Doctor)
async def create_doctor(doctor_data: DoctorCreate, current_user: dict = Depends(get_current_user)):
    doctor_id = str(uuid.uuid4())
    doctor_dict = {
        "id": doctor_id,
        **doctor_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.doctors.insert_one(doctor_dict)
    return Doctor(**doctor_dict)

@api_router.get("/doctors", response_model=List[Doctor])
async def get_doctors(branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    doctors = await db.doctors.find(query, {"_id": 0}).to_list(1000)
    return doctors

@api_router.put("/doctors/{doctor_id}", response_model=Doctor)
async def update_doctor(doctor_id: str, doctor_data: DoctorCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.doctors.find_one({"id": doctor_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    update_data = doctor_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.doctors.update_one({"id": doctor_id}, {"$set": update_data})
    updated = await db.doctors.find_one({"id": doctor_id}, {"_id": 0})
    return Doctor(**updated)

@api_router.delete("/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.doctors.find_one({"id": doctor_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    await db.doctors.delete_one({"id": doctor_id})
    return {"message": "Doctor deleted successfully"}

# Advanced Reports
@api_router.get("/reports/advanced")
async def get_advanced_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    branch_id: Optional[str] = None,
    report_type: str = "all",
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    # Date filtering
    if start_date and end_date:
        query["created_at"] = {"$gte": start_date, "$lte": end_date}
    
    # Treatment charges report
    treatment_revenue = 0
    treatment_by_payment = {}
    if report_type in ["all", "treatment"]:
        bills = await db.bills.find(query, {"_id": 0}).to_list(10000)
        treatment_revenue = sum(bill["total_amount"] for bill in bills)
        
        for bill in bills:
            mode = bill.get("payment_mode", "cash")
            treatment_by_payment[mode] = treatment_by_payment.get(mode, 0) + bill["total_amount"]
    
    # Pharmacy sales report
    pharmacy_revenue = 0
    pharmacy_by_payment = {}
    if report_type in ["all", "pharmacy"]:
        sales = await db.pharmacy_sales.find(query, {"_id": 0}).to_list(10000)
        pharmacy_revenue = sum(sale["total_amount"] for sale in sales)
        
        for sale in sales:
            mode = sale.get("payment_mode", "cash")
            pharmacy_by_payment[mode] = pharmacy_by_payment.get(mode, 0) + sale["total_amount"]
    
    # Combined payment modes
    all_payment_modes = {}
    for mode, amount in treatment_by_payment.items():
        all_payment_modes[mode] = all_payment_modes.get(mode, 0) + amount
    for mode, amount in pharmacy_by_payment.items():
        all_payment_modes[mode] = all_payment_modes.get(mode, 0) + amount
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "treatment_revenue": treatment_revenue,
        "treatment_by_payment_mode": treatment_by_payment,
        "pharmacy_revenue": pharmacy_revenue,
        "pharmacy_by_payment_mode": pharmacy_by_payment,
        "total_revenue": treatment_revenue + pharmacy_revenue,
        "total_by_payment_mode": all_payment_modes,
        "bills_count": len(bills) if report_type in ["all", "treatment"] else 0,
        "sales_count": len(sales) if report_type in ["all", "pharmacy"] else 0
    }

@api_router.get("/reports/comprehensive")
async def get_comprehensive_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    branch_id: Optional[str] = None,
    godown_id: Optional[str] = None,
    payment_mode: Optional[str] = None,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    doctor_id: Optional[str] = None,
    user_id: Optional[str] = None,
    bank_account_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    expense_category: Optional[str] = None,
    item_name: Optional[str] = None,
    item_type: Optional[str] = "all",
    stock_status: Optional[str] = "all",
    current_user: dict = Depends(get_current_user)
):
    """Comprehensive reports with all filtering options"""
    
    # Build base queries
    bill_query = {}
    sale_query = {}
    expense_query = {}
    purchase_query = {}
    bank_query = {}
    appointment_query = {}
    
    # Branch filter
    if branch_id:
        bill_query["branch_id"] = branch_id
        sale_query["branch_id"] = branch_id
        expense_query["branch_id"] = branch_id
        appointment_query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        branch_id = current_user["branch_id"]
        bill_query["branch_id"] = branch_id
        sale_query["branch_id"] = branch_id
        expense_query["branch_id"] = branch_id
        appointment_query["branch_id"] = branch_id
    
    # Godown filter
    if godown_id:
        purchase_query["godown_id"] = godown_id
        # Also filter sales if they are linked to a specific godown
        sale_query["godown_id"] = godown_id
    
    # Date filtering
    if start_date and end_date:
        date_filter = {"$gte": start_date, "$lte": end_date + "T23:59:59"}
        bill_query["created_at"] = date_filter
        sale_query["created_at"] = date_filter
        expense_query["created_at"] = date_filter
        purchase_query["created_at"] = date_filter
        # Fix: Ensure bank transactions and appointments include the whole day
        bank_query["transaction_date"] = {"$gte": start_date, "$lte": end_date}
        appointment_query["appointment_date"] = {"$gte": start_date, "$lte": end_date}
    
    # Payment mode filter
    if payment_mode:
        bill_query["payment_mode"] = payment_mode
        sale_query["payment_mode"] = payment_mode
        bank_query["payment_mode"] = payment_mode
    
    # Doctor filter
    if doctor_id:
        bill_query["doctor_id"] = doctor_id
        appointment_query["doctor_id"] = doctor_id
    
    # Staff/User filter
    if user_id:
        bill_query["created_by"] = user_id
        sale_query["created_by"] = user_id
        expense_query["created_by"] = user_id
        purchase_query["created_by"] = user_id
    
    # Bank Account filter
    if bank_account_id:
        bank_query["bank_account_id"] = bank_account_id
    
    # Patient filter
    if patient_id:
        bill_query["patient_id"] = patient_id
        sale_query["patient_id"] = patient_id
        appointment_query["patient_id"] = patient_id
    
    # Expense Category filter
    if expense_category:
        expense_query["category"] = expense_category

    # Item filters (Name and Type)
    if item_name:
        regex_name = {"$regex": item_name, "$options": "i"}
        bill_query["services.name"] = regex_name
        sale_query["items.name"] = regex_name
        
    # Fetch all data
    bills = await db.bills.find(bill_query, {"_id": 0}).to_list(10000)
    sales = await db.pharmacy_sales.find(sale_query, {"_id": 0}).to_list(10000)
    expenses = await db.expenses.find(expense_query, {"_id": 0}).to_list(10000)
    purchases = await db.purchase_entries.find(purchase_query, {"_id": 0}).to_list(10000)
    bank_transactions = await db.bank_transactions.find(bank_query, {"_id": 0}).to_list(10000)
    appointments = await db.appointments.find(appointment_query, {"_id": 0}).to_list(10000)

    # Filter by item_type if requested
    if item_type == "treatment":
        # Only keep treatments (bills usually represent treatments)
        sales = [] # In treatment mode, pharmacy sales are excluded
    elif item_type == "medicine":
        # Only keep medicines (sales usually represent medicines)
        bills = [] # In medicine mode, treatment bills are excluded

    # Handle Stock Status filter (requires fetching from medicines collection)
    medicines = []
    if stock_status != "all":
        med_query = {}
        if branch_id: med_query["branch_id"] = branch_id
        if item_name: med_query["name"] = {"$regex": item_name, "$options": "i"}
        
        if stock_status == "low":
            med_query["$expr"] = {"$lte": ["$stock_quantity", "$min_stock_level"]}
            med_query["stock_quantity"] = {"$gt": 0}
        elif stock_status == "out":
            med_query["stock_quantity"] = {"$lte": 0}
        elif stock_status == "in":
            med_query["$expr"] = {"$gt": ["$stock_quantity", "$min_stock_level"]}
            
        medicines = await db.medicines.find(med_query, {"_id": 0}).to_list(1000)

    # Filter by category if provided
    if category or subcategory:
        filtered_bills = []
        for bill in bills:
            match = False
            for service in bill.get("services", []):
                if category and service.get("category_id") != category: continue
                if subcategory and service.get("subcategory_id") != subcategory: continue
                match = True
                break
            if match: filtered_bills.append(bill)
        bills = filtered_bills

        filtered_sales = []
        for sale in sales:
            match = False
            for item in sale.get("items", []):
                if category and item.get("category") != category: continue
                if subcategory and item.get("subcategory") != subcategory: continue
                match = True
                break
            if match: filtered_sales.append(sale)
        sales = filtered_sales

    # Calculate revenue
    treatment_revenue = sum(bill.get("total_amount", 0) for bill in bills)
    pharmacy_revenue = sum(sale.get("total_amount", 0) for sale in sales)
    total_expenses = sum(exp.get("amount", 0) for exp in expenses)
    total_purchases = sum(p.get("total_amount", 0) for p in purchases)
    
    # Payment mode breakdown
    payment_breakdown = {}
    for bill in bills:
        mode = bill.get("payment_mode", "cash")
        payment_breakdown[mode] = payment_breakdown.get(mode, 0) + bill.get("total_amount", 0)
    for sale in sales:
        mode = sale.get("payment_mode", "cash")
        payment_breakdown[mode] = payment_breakdown.get(mode, 0) + sale.get("total_amount", 0)
    
    # Daily breakdown for charts
    daily_revenue = {}
    for bill in bills:
        date = bill.get("created_at", "")[:10]
        if not date: continue
        daily_revenue[date] = daily_revenue.get(date, {"treatment": 0, "pharmacy": 0})
        daily_revenue[date]["treatment"] += bill.get("total_amount", 0)
    for sale in sales:
        date = sale.get("created_at", "")[:10]
        if not date: continue
        daily_revenue[date] = daily_revenue.get(date, {"treatment": 0, "pharmacy": 0})
        daily_revenue[date]["pharmacy"] += sale.get("total_amount", 0)
    
    # Category breakdown for expenses
    expense_by_category = {}
    for exp in expenses:
        cat = exp.get("category", "Other")
        expense_by_category[cat] = expense_by_category.get(cat, 0) + exp.get("amount", 0)
    
    # Top selling items
    item_sales = {}
    for sale in sales:
        for item in sale.get("items", []):
            name = item.get("name", "Unknown")
            item_sales[name] = item_sales.get(name, {"quantity": 0, "revenue": 0})
            item_sales[name]["quantity"] += item.get("quantity", 0)
            item_sales[name]["revenue"] += item.get("total", 0)
    
    top_items = sorted(item_sales.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]
    
    return {
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "branch_id": branch_id,
            "godown_id": godown_id,
            "payment_mode": payment_mode,
            "doctor_id": doctor_id,
            "user_id": user_id,
            "bank_account_id": bank_account_id,
            "patient_id": patient_id,
            "stock_status": stock_status,
            "item_type": item_type
        },
        "summary": {
            "treatment_revenue": treatment_revenue,
            "pharmacy_revenue": pharmacy_revenue,
            "total_revenue": treatment_revenue + pharmacy_revenue,
            "total_expenses": total_expenses,
            "total_purchases": total_purchases,
            "net_profit": treatment_revenue + pharmacy_revenue - total_expenses,
            "bills_count": len(bills),
            "sales_count": len(sales),
            "expenses_count": len(expenses),
            "purchases_count": len(purchases),
            "appointments_count": len(appointments),
            "bank_transactions_count": len(bank_transactions),
            "stock_count": len(medicines)
        },
        "payment_breakdown": payment_breakdown,
        "expense_by_category": expense_by_category,
        "daily_revenue": daily_revenue,
        "top_selling_items": [{"name": name, **data} for name, data in top_items],
        "bills": bills[-100:],  # Last 100 bills
        "sales": sales[-100:],  # Last 100 sales
        "expenses": expenses[-100:],  # Last 100 expenses
        "bank_transactions": bank_transactions[-100:], # Last 100 transactions
        "appointments": appointments[-100:], # Last 100 appointments
        "medicines": medicines  # Medicines matching stock status
    }

# Godown Management
@api_router.post("/godowns", response_model=Godown)
async def create_godown(godown_data: GodownCreate, current_user: dict = Depends(get_current_user)):
    godown_id = str(uuid.uuid4())
    godown_dict = {
        "id": godown_id,
        **godown_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.godowns.insert_one(godown_dict)
    return Godown(**godown_dict)

@api_router.get("/godowns", response_model=List[Godown])
async def get_godowns(branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    godowns = await db.godowns.find(query, {"_id": 0}).to_list(1000)
    return godowns

@api_router.put("/godowns/{godown_id}", response_model=Godown)
async def update_godown(godown_id: str, godown_data: GodownCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.godowns.find_one({"id": godown_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Godown not found")
    
    update_data = godown_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.godowns.update_one({"id": godown_id}, {"$set": update_data})
    updated = await db.godowns.find_one({"id": godown_id}, {"_id": 0})
    return Godown(**updated)

@api_router.delete("/godowns/{godown_id}")
async def delete_godown(godown_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.godowns.find_one({"id": godown_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Godown not found")
    
    await db.godowns.delete_one({"id": godown_id})
    return {"message": "Godown deleted successfully"}

# Credit Sales Management
@api_router.post("/credit-sales", response_model=CreditSale)
async def create_credit_sale(credit_data: CreditSaleCreate, current_user: dict = Depends(get_current_user)):
    credit_id = str(uuid.uuid4())
    
    pending_amount = credit_data.total_amount - credit_data.paid_amount
    due_date = (datetime.now(timezone.utc) + timedelta(days=credit_data.credit_period_days)).date().isoformat()
    
    credit_dict = {
        "id": credit_id,
        **credit_data.model_dump(),
        "pending_amount": pending_amount,
        "due_date": due_date,
        "status": "pending" if pending_amount > 0 else "paid",
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.credit_sales.insert_one(credit_dict)
    return CreditSale(**credit_dict)

@api_router.get("/credit-sales", response_model=List[CreditSale])
async def get_credit_sales(status: Optional[str] = None, branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    credit_sales = await db.credit_sales.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return credit_sales

@api_router.post("/credit-payments", response_model=CreditPayment)
async def create_credit_payment(payment_data: CreditPaymentCreate, current_user: dict = Depends(get_current_user)):
    payment_id = str(uuid.uuid4())
    payment_dict = {
        "id": payment_id,
        **payment_data.model_dump(),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.credit_payments.insert_one(payment_dict)
    
    # Update credit sale
    credit_sale = await db.credit_sales.find_one({"id": payment_data.credit_sale_id})
    if credit_sale:
        new_paid = credit_sale["paid_amount"] + payment_data.amount
        new_pending = credit_sale["total_amount"] - new_paid
        new_status = "paid" if new_pending <= 0 else "pending"
        
        await db.credit_sales.update_one(
            {"id": payment_data.credit_sale_id},
            {"$set": {
                "paid_amount": new_paid,
                "pending_amount": new_pending,
                "status": new_status
            }}
        )
    
    return CreditPayment(**payment_dict)

@api_router.get("/credit-payments")
async def get_credit_payments(credit_sale_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if credit_sale_id:
        query["credit_sale_id"] = credit_sale_id
    payments = await db.credit_payments.find(query, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    return payments

# Settings Management
@api_router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        # Create default settings
        settings_id = str(uuid.uuid4())
        settings = {
            "id": settings_id,
            "clinic_name": "DentalFlow Clinic",
            "enable_gst": True,
            "default_gst_percentage": 18.0,
            "currency_symbol": "₹",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.settings.insert_one(settings)
        settings.pop("_id", None)
    return settings

@api_router.put("/settings")
async def update_settings(settings_data: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_dict = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    existing = await db.settings.find_one({})
    if existing:
        await db.settings.update_one({"id": existing["id"]}, {"$set": update_dict})
    else:
        settings_id = str(uuid.uuid4())
        update_dict["id"] = settings_id
        await db.settings.insert_one(update_dict)
    
    updated_settings = await db.settings.find_one({}, {"_id": 0})
    return updated_settings

# Logo Upload endpoint
@api_router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, GIF, WEBP")
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"clinic_logo_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get the base URL from environment or construct it - use /api/uploads so it goes through ingress
    logo_url = f"/api/uploads/{filename}"
    
    # Update settings with new logo URL
    existing = await db.settings.find_one({})
    if existing:
        await db.settings.update_one(
            {"id": existing["id"]},
            {"$set": {"logo_url": logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        settings_id = str(uuid.uuid4())
        await db.settings.insert_one({
            "id": settings_id,
            "logo_url": logo_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"logo_url": logo_url, "message": "Logo uploaded successfully"}

# Purchase Entry Management
@api_router.post("/purchase-entries", response_model=PurchaseEntry)
async def create_purchase_entry(purchase_data: PurchaseEntryCreate, current_user: dict = Depends(get_current_user)):
    purchase_id = str(uuid.uuid4())
    
    pending_amount = round((purchase_data.total_amount - purchase_data.paid_amount) * 100) / 100
    
    purchase_dict = {
        "id": purchase_id,
        **purchase_data.model_dump(),
        "pending_amount": pending_amount,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.purchase_entries.insert_one(purchase_dict)
    
    # Auto-log bank transaction for non-cash payments
    if purchase_data.paid_amount > 0 and purchase_data.payment_mode != "cash":
        await log_bank_transaction(
            amount=purchase_data.paid_amount,
            payment_mode=purchase_data.payment_mode,
            transaction_type="debit",
            reference_type="purchase_entry",
            reference_id=purchase_id,
            reference_number=purchase_data.invoice_number,
            description=f"Purchase - {purchase_data.supplier_name} - Inv: {purchase_data.invoice_number}",
            transaction_date=purchase_data.invoice_date,
            party_name=purchase_data.supplier_name,
            party_id=purchase_data.supplier_id,
            invoice_number=purchase_data.invoice_number,
            bank_account_id=purchase_data.bank_id
        )
    
    # Auto-log as expense if there's a paid amount
    if purchase_data.paid_amount > 0:
        expense_id = str(uuid.uuid4())
        expense_dict = {
            "id": expense_id,
            "category": "supplies",
            "description": f"Purchase - {purchase_data.supplier_name} - Inv: {purchase_data.invoice_number}",
            "amount": purchase_data.paid_amount,
            "date": purchase_data.invoice_date,
            "branch_id": purchase_data.branch_id or "default",
            "reference_id": purchase_id,
            "reference_type": "purchase_entry",
            "payment_mode": purchase_data.payment_mode,
            "payment_status": "paid",
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.expenses.insert_one(expense_dict)
    
    # Update medicine stock if items received
    if purchase_data.items_received_date:
        for item in purchase_data.items:
            medicine_id = item.get("medicine_id")
            if medicine_id:
                # Update existing medicine stock
                await db.medicines.update_one(
                    {"id": medicine_id},
                    {"$inc": {"stock_quantity": item["quantity"]}}
                )
            else:
                # Create new medicine entry
                medicine_id = str(uuid.uuid4())
                medicine_dict = {
                    "id": medicine_id,
                    "name": item["medicine_name"],
                    "description": item.get("description", ""),
                    "manufacturer": item.get("manufacturer", ""),
                    "category": item.get("category", "General"),
                    "subcategory": item.get("subcategory", ""),
                    "batch_number": item["batch_number"],
                    "expiry_date": item["expiry_date"],
                    "purchase_price": item["purchase_price"],
                    "mrp": item.get("mrp", 0),
                    "sales_price": item.get("sales_price", item.get("mrp", 0)),
                    "unit_price": item.get("sales_price", item.get("mrp", 0)),
                    "discount_percentage": item.get("discount_percentage", 0),
                    "stock_quantity": item["quantity"],
                    "min_stock_level": 10,
                    "supplier_id": purchase_data.supplier_id,
                    "branch_id": purchase_data.branch_id,
                    "godown_id": purchase_data.godown_id,
                    "gst_percentage": item.get("gst_percentage", 12.0),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "item_status": "ACTIVE" # Default status for new medicines
                }
                await db.medicines.insert_one(medicine_dict)
    
    return PurchaseEntry(**purchase_dict)

@api_router.get("/medicines", response_model=List[Medicine])
async def get_medicines(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    branch_id: Optional[str] = None,
    godown_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # Branch/Godown access control
    # ... (existing logic) ...
    if current_user["role"] != "admin":
        if not current_user.get("branch_id"):
             # If strict logic required: return []
             pass
        else:
             query["branch_id"] = current_user["branch_id"]
    
    if branch_id:
        query["branch_id"] = branch_id
    if godown_id:
        query["godown_id"] = godown_id
        
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    if status:
        query["item_status"] = status
    else:
        query["item_status"] = {"$ne": "INACTIVE"} # Default to not inactive
        
    medicines = await db.medicines.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return medicines

@api_router.get("/purchase-entries", response_model=List[PurchaseEntry])
async def get_purchase_entries(
    branch_id: Optional[str] = None,
    supplier_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user["role"] == "branch_manager" and current_user.get("branch_id"):
        query["branch_id"] = current_user["branch_id"]
    
    if supplier_id:
        query["supplier_id"] = supplier_id
    
    if start_date and end_date:
        query["invoice_date"] = {"$gte": start_date, "$lte": end_date}
    
    purchases = await db.purchase_entries.find(query, {"_id": 0}).sort("invoice_date", -1).to_list(1000)
    return purchases

async def get_consolidated_stock_internal(
    branch_id: Optional[Union[str, List[str]]] = None, 
    godown_id: Optional[Union[str, List[str]]] = None, 
    consolidate_batches=False,
    include_pending: bool = True
):
    """Aggregate stock from purchase entries and medicines collection, optionally filtering by location."""
    try:
        pe_query = {"items_received_date": None}
        med_query = {"purpose": {"$in": ["for_sale", None, ""]}}
        
        # Handle single ID or list of IDs for branch_id
        if branch_id:
            if isinstance(branch_id, list):
                pe_query["branch_id"] = {"$in": branch_id}
                med_query["branch_id"] = {"$in": branch_id}
            else:
                pe_query["branch_id"] = branch_id
                med_query["branch_id"] = branch_id
                
        # Handle single ID or list of IDs for godown_id
        if godown_id:
            if isinstance(godown_id, list):
                pe_query["godown_id"] = {"$in": godown_id}
                med_query["godown_id"] = {"$in": godown_id}
            else:
                pe_query["godown_id"] = godown_id
                med_query["godown_id"] = godown_id

        # Helper for safe conversion
        def safe_float(val, default=0.0):
            try:
                if val is None or val == "": return default
                return float(val)
            except (ValueError, TypeError):
                return default

        def safe_int(val, default=0):
            try:
                if val is None or val == "": return default
                return int(float(val))
            except (ValueError, TypeError):
                return default
        
        # 0. Pre-fetch units for name resolution
        unit_map = {}
        all_units = await db.item_units.find({}, {"id": 1, "name": 1, "_id": 0}).to_list(1000)
        for u in all_units:
            if u.get("id"):
                unit_map[u["id"]] = u.get("name")

        # 1. First pass: Collect all known batch info (expiry, manufacturer) for fallback
        batch_metadata_map = {}

        # 0. Pre-fetch Item Statuses and Min Levels for efficiency
        item_master_map = {}
        all_items = await db.item_master.find({}, {"name": 1, "item_status": 1, "discontinued_reason": 1, "min_stock_level": 1, "low_stock_threshold": 1, "low_stock_warning_enabled": 1, "unit_id": 1, "expiry_tracking_enabled": 1, "_id": 0}).to_list(10000)
        for i in all_items:
            if i.get("name"):
                uid = i.get("unit_id")
                unit_name = unit_map.get(uid, "") if uid else ""
                item_master_map[i["name"].strip()] = {
                    "status": i.get("item_status", "ACTIVE"),
                    "reason": i.get("discontinued_reason"),
                    "min_stock_level": safe_int(i.get("low_stock_threshold") or i.get("min_stock_level"), 0),
                    "low_stock_warning_enabled": bool(i.get("low_stock_warning_enabled", False)),
                    "expiry_tracking_enabled": bool(i.get("expiry_tracking_enabled", False)),
                    "unit": unit_name
                }

        # Aggregate items by name + batch + mrp (unique combinations)
        stock_map = {}
        if include_pending:
            purchases = await db.purchase_entries.find(pe_query, {"_id": 0}).to_list(1000)
            for purchase in purchases:
                for item in purchase.get("items", []):
                    purpose = item.get("item_purpose") or item.get("purpose") or "for_sale"
                    if purpose != "for_sale":
                        continue
                    
                    name = str(item.get("medicine_name", "")).strip()
                    batch = str(item.get("batch_number", "")).strip()
                    mrp = round(safe_float(item.get("mrp"), 0), 2)
                    expiry = item.get("expiry_date", "")
                    manufacturer = item.get("manufacturer", "")
                    
                    if expiry:
                        meta_key = (name.lower(), batch.lower())
                        if meta_key not in batch_metadata_map:
                            batch_metadata_map[meta_key] = {"expiry_date": expiry, "manufacturer": manufacturer}
                    
                    pid_branch = purchase.get("branch_id")
                    pid_godown = purchase.get("godown_id")
                    loc_id = pid_godown or pid_branch or "unknown"
                    key = f"{name}|{mrp:.2f}|{loc_id}" if consolidate_batches else f"{name}|{batch}|{mrp:.2f}|{loc_id}"
                    
                    if key not in stock_map:
                        master_info = item_master_map.get(name, {"status": "ACTIVE", "reason": None, "min_stock_level": 0, "low_stock_warning_enabled": False, "expiry_tracking_enabled": False, "unit": ""})
                        stock_map[key] = {
                            "id": str(uuid.uuid4()),
                            "name": name,
                            "batch_number": batch,
                            "expiry_date": expiry,
                            "mrp": mrp,
                            "stock_quantity": 0,
                            "quantity": 0,
                            "min_stock_level": master_info["min_stock_level"],
                            "low_stock_warning_enabled": master_info["low_stock_warning_enabled"],
                            "expiry_tracking_enabled": master_info["expiry_tracking_enabled"],
                            "unit": master_info["unit"],
                            "branch_id": pid_branch,
                            "godown_id": pid_godown,
                            "item_status": master_info["status"],
                            "discontinued_reason": master_info["reason"],
                            "manufacturer": manufacturer
                        }
                    
                    total_item_qty = safe_int(item.get("quantity"), 0) + safe_int(item.get("free_quantity", 0))
                    stock_map[key]["stock_quantity"] += total_item_qty
                    stock_map[key]["quantity"] = stock_map[key]["stock_quantity"]
        
        # 2. ALSO include items from medicines collection
        medicines_data = await db.medicines.find(med_query, {"_id": 0}).to_list(10000)

        # Pre-fill metadata map from medicines too
        for med in medicines_data:
            m_expiry = med.get("expiry_date")
            m_name = str(med.get("name", "")).strip()
            m_batch = str(med.get("batch_number", "")).strip()
            if m_expiry:
                meta_key = (m_name.lower(), m_batch.lower())
                if meta_key not in batch_metadata_map:
                    batch_metadata_map[meta_key] = {"expiry_date": m_expiry, "manufacturer": med.get("manufacturer", "")}

        for med in medicines_data:
            name = str(med.get("name", "")).strip()
            batch = str(med.get("batch_number", "")).strip()
            raw_mrp = med.get("mrp") or med.get("unit_price")
            mrp = round(safe_float(raw_mrp, 0), 2)
            
            med_branch = med.get("branch_id")
            med_godown = med.get("godown_id")
            loc_id = med_godown or med_branch or "unknown"
            key = f"{name}|{mrp:.2f}|{loc_id}" if consolidate_batches else f"{name}|{batch}|{mrp:.2f}|{loc_id}"
            
            if key not in stock_map:
                master_info = item_master_map.get(name, {"status": "ACTIVE", "reason": None, "min_stock_level": safe_int(med.get("min_stock_level"), 0), "low_stock_warning_enabled": False, "expiry_tracking_enabled": False, "unit": ""})
                meta = batch_metadata_map.get((name.lower(), batch.lower()), {})
                expiry = med.get("expiry_date") or meta.get("expiry_date", "")
                manufacturer = med.get("manufacturer") or meta.get("manufacturer", "")

                med_status = master_info["status"] if name in item_master_map else (med.get("item_status") or master_info["status"])
                med_reason = med.get("discontinued_reason") or master_info["reason"]
                
                med_unit = med.get("unit")
                if not med_unit:
                    uid = med.get("unit_id")
                    med_unit = unit_map.get(uid) or master_info["unit"]

                stock_map[key] = {
                    "id": med.get("id", str(uuid.uuid4())),
                    "name": name,
                    "batch_number": batch,
                    "mrp": mrp,
                    "sales_price": med.get("unit_price", mrp),
                    "expiry_date": expiry,
                    "gst_percentage": safe_float(med.get("gst_percentage"), 0),
                    "stock_quantity": 0,
                    "quantity": 0,
                    "manufacturer": manufacturer,
                    "godown_id": med_godown,
                    "branch_id": med_branch,
                    "item_status": med_status,
                    "discontinued_reason": med_reason,
                    "min_stock_level": master_info["min_stock_level"],
                    "low_stock_warning_enabled": master_info["low_stock_warning_enabled"],
                    "expiry_tracking_enabled": master_info["expiry_tracking_enabled"],
                    "unit": med_unit,
                    "created_at": med.get("created_at", "")
                }
            
            med_qty = safe_int(med.get("stock_quantity"), 0)
            stock_map[key]["stock_quantity"] += med_qty
            stock_map[key]["quantity"] = stock_map[key]["stock_quantity"]

        # 3. Post-Processing: Simulated FEFO Adjustment
        # If we ARE doing batch-wise reporting (consolidate_batches=False),
        # we must apply any negative adjustments (representing unsourced sales) 
        # to the positive batches in FEFO order.
        if not consolidate_batches:
            item_loc_groups = {}
            for key, item in stock_map.items():
                parts = key.split('|')
                if len(parts) < 4: continue
                group_key = f"{parts[0]}|{parts[2]}|{parts[3]}" # name|mrp|loc_id
                if group_key not in item_loc_groups:
                    item_loc_groups[group_key] = {"pos": [], "neg_total": 0}
                
                if item["stock_quantity"] < 0:
                    item_loc_groups[group_key]["neg_total"] += abs(item["stock_quantity"])
                    item["stock_quantity"] = 0
                else:
                    item_loc_groups[group_key]["pos"].append(item)
            
            for group_key, data in item_loc_groups.items():
                if data["neg_total"] <= 0 or not data["pos"]:
                    continue
                
                def fefo_sort(b):
                    exp = b.get("expiry_date")
                    exp_val = exp if exp and exp.strip() else "9999-12-31"
                    return (exp_val, b.get("created_at", ""))
                
                data["pos"].sort(key=fefo_sort)
                
                rem = data["neg_total"]
                for b in data["pos"]:
                    if rem <= 0: break
                    deduct = min(b["stock_quantity"], rem)
                    b["stock_quantity"] -= deduct
                    rem -= deduct
                    b["quantity"] = b["stock_quantity"]
            
            stock_map = {k: v for k, v in stock_map.items() if v["stock_quantity"] > 0}

        return stock_map

    except Exception as e:
        print(f"Error in get_consolidated_stock_internal: {str(e)}")
        return {}

@api_router.get("/pharmacy-stock")
async def get_pharmacy_stock(
    branch_id: Optional[str] = None,
    godown_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get aggregated stock from purchase entries and medicines collection."""
    res = await get_consolidated_stock_internal(branch_id=branch_id, godown_id=godown_id, consolidate_batches=True)
    stock_map = res
    
    # Filter out exactly zero stock_quantity items
    stock_list = [item for item in stock_map.values() if item["stock_quantity"] != 0]
    
    # Sort by name, then by expiry date (FEFO)
    stock_list.sort(key=lambda x: (x["name"].lower(), str(x["expiry_date"])))
    
    return stock_list

@api_router.get("/purchase-entries/{purchase_id}", response_model=PurchaseEntry)
async def get_purchase_entry(purchase_id: str, current_user: dict = Depends(get_current_user)):
    purchase = await db.purchase_entries.find_one({"id": purchase_id}, {"_id": 0})
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase entry not found")
    return PurchaseEntry(**purchase)

@api_router.put("/purchase-entries/{purchase_id}/receive")
async def mark_items_received(
    purchase_id: str,
    received_date: str,
    current_user: dict = Depends(get_current_user)
):
    purchase = await db.purchase_entries.find_one({"id": purchase_id})
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase entry not found")
    
    # Update purchase entry
    await db.purchase_entries.update_one(
        {"id": purchase_id},
        {"$set": {"items_received_date": received_date}}
    )
    
    # Update medicine stock
    for item in purchase["items"]:
        medicine_id = item.get("medicine_id")
        if medicine_id:
            await db.medicines.update_one(
                {"id": medicine_id},
                {"$inc": {"stock_quantity": item["quantity"]}}
            )
        else:
            # Create new medicine if doesn't exist
            medicine_id = str(uuid.uuid4())
            medicine_dict = {
                "id": medicine_id,
                "name": item["medicine_name"],
                "description": item.get("description", ""),
                "manufacturer": item.get("manufacturer", ""),
                "category": item.get("category", "General"),
                "subcategory": item.get("subcategory", ""),
                "batch_number": item["batch_number"],
                "expiry_date": item["expiry_date"],
                "purchase_price": item["purchase_price"],
                "mrp": item.get("mrp", 0),
                "sales_price": item.get("sales_price", item.get("mrp", 0)),
                "unit_price": item.get("sales_price", item.get("mrp", 0)),
                "discount_percentage": item.get("discount_percentage", 0),
                "stock_quantity": item["quantity"],
                "min_stock_level": 10,
                "supplier_id": purchase["supplier_id"],
                "branch_id": purchase["branch_id"],
                "godown_id": purchase.get("godown_id"),
                "gst_percentage": item.get("gst_percentage", 12.0),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.medicines.insert_one(medicine_dict)
    
    return {"message": "Items received and stock updated successfully"}

@api_router.put("/purchase-entries/{purchase_id}", response_model=PurchaseEntry)
async def update_purchase_entry(purchase_id: str, data: PurchaseEntryCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.purchase_entries.find_one({"id": purchase_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase entry not found")
    
    old_paid = existing.get("paid_amount", 0)
    new_paid = data.paid_amount
    
    update_data = data.model_dump()
    update_data["pending_amount"] = round((data.total_amount - data.paid_amount) * 100) / 100
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.purchase_entries.update_one({"id": purchase_id}, {"$set": update_data})
    
    # Log addition if paid amount increased
    if new_paid > old_paid:
        diff_amount = round((new_paid - old_paid) * 100) / 100
        
        # Log to Banking if not cash/credit
        if data.payment_mode not in ["cash", "credit"]:
            await log_bank_transaction(
                amount=diff_amount,
                payment_mode=data.payment_mode,
                transaction_type="debit",
                reference_type="purchase_entry",
                reference_id=purchase_id,
                reference_number=data.invoice_number,
                description=f"Purchase Update - {data.supplier_name} - Inv: {data.invoice_number}",
                transaction_date=datetime.now(timezone.utc).date().isoformat(),
                party_name=data.supplier_name,
                party_id=data.supplier_id,
                invoice_number=data.invoice_number,
                bank_account_id=data.bank_id
            )
        
        # Log as Expense
        expense_id = str(uuid.uuid4())
        expense_dict = {
            "id": expense_id,
            "category": "supplies",
            "description": f"Purchase Update - {data.supplier_name} - Inv: {data.invoice_number}",
            "amount": diff_amount,
            "date": datetime.now(timezone.utc).date().isoformat(),
            "branch_id": data.branch_id or existing.get("branch_id") or "default",
            "reference_id": purchase_id,
            "reference_type": "purchase_entry",
            "payment_mode": data.payment_mode,
            "payment_status": "partial" if data.pending_amount > 0 else "paid",
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.expenses.insert_one(expense_dict)

    updated = await db.purchase_entries.find_one({"id": purchase_id}, {"_id": 0})
    return PurchaseEntry(**updated)

@api_router.delete("/purchase-entries/{purchase_id}")
async def delete_purchase_entry(purchase_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.purchase_entries.find_one({"id": purchase_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase entry not found")
    
    result = await db.purchase_entries.delete_one({"id": purchase_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Purchase entry not found")
    return {"message": "Purchase entry deleted successfully"}

# ============ MASTER DATA ENDPOINTS ============

# Item Master endpoints
@api_router.post("/item-master", response_model=ItemMaster)
async def create_item_master(item_data: ItemMasterCreate, current_user: dict = Depends(get_current_user)):
    # Check if item with same name already exists
    existing_item = await db.item_master.find_one({"name": item_data.name})
    if existing_item:
        return ItemMaster(**existing_item)

    item_id = str(uuid.uuid4())
    item_dict = {
        "id": item_id,
        **item_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.item_master.insert_one(item_dict)
    return ItemMaster(**item_dict)

@api_router.get("/item-master", response_model=List[ItemMaster])
async def get_item_master(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["item_status"] = status
    items = await db.item_master.find(query, {"_id": 0}).to_list(10000)
    return items

@api_router.put("/item-master/{item_id}", response_model=ItemMaster)
async def update_item_master(item_id: str, item_data: ItemMasterCreate, current_user: dict = Depends(get_current_user)):
    await db.item_master.update_one({"id": item_id}, {"$set": item_data.model_dump()})
    item = await db.item_master.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return ItemMaster(**item)

@api_router.delete("/item-master/{item_id}")
async def delete_item_master(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.item_master.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# Item Type endpoints
@api_router.get("/item-types", response_model=List[ItemType])
async def get_item_types(current_user: dict = Depends(get_current_user)):
    item_types = await db.item_types.find({}, {"_id": 0}).to_list(100)
    return item_types

@api_router.post("/item-types", response_model=ItemType)
async def create_item_type(data: ItemTypeCreate, current_user: dict = Depends(get_current_user)):
    item_type_id = str(uuid.uuid4())
    item_type_dict = {
        "id": item_type_id,
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.item_types.insert_one(item_type_dict)
    return ItemType(**item_type_dict)

@api_router.put("/item-types/{type_id}", response_model=ItemType)
async def update_item_type(type_id: str, data: ItemTypeCreate, current_user: dict = Depends(get_current_user)):
    await db.item_types.update_one({"id": type_id}, {"$set": data.model_dump()})
    item_type = await db.item_types.find_one({"id": type_id}, {"_id": 0})
    if not item_type:
        raise HTTPException(status_code=404, detail="Item Type not found")
    return ItemType(**item_type)

@api_router.delete("/item-types/{type_id}")
async def delete_item_type(type_id: str, current_user: dict = Depends(get_current_user)):
    # Check if any categories are linked
    linked = await db.categories.count_documents({"item_type_id": type_id})
    if linked > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {linked} categories are linked to this item type")
    result = await db.item_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item Type not found")
    return {"message": "Item Type deleted successfully"}

@api_router.get("/api/initial-seed-item-types")
async def seed_initial_item_types(current_user: dict = Depends(get_current_user)):
    existing = await db.item_types.count_documents({})
    if existing > 0:
        return {"message": "Item types already exist", "count": existing}
    defaults = [
        {"id": str(uuid.uuid4()), "name": "General", "description": "General items", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "INSTUMENTS", "description": "Instruments and equipment", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.item_types.insert_many(defaults)
    return {"message": "Seeded default item types", "count": len(defaults)}

# Category endpoints
@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    category_id = str(uuid.uuid4())
    category_dict = {
        "id": category_id,
        **category_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(category_dict)
    return Category(**category_dict)

@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return categories

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    await db.categories.update_one({"id": category_id}, {"$set": category_data.model_dump()})
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category(**category)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# Subcategory endpoints
@api_router.post("/subcategories", response_model=Subcategory)
async def create_subcategory(subcategory_data: SubcategoryCreate, current_user: dict = Depends(get_current_user)):
    subcategory_id = str(uuid.uuid4())
    subcategory_dict = {
        "id": subcategory_id,
        **subcategory_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subcategories.insert_one(subcategory_dict)
    return Subcategory(**subcategory_dict)

@api_router.get("/subcategories", response_model=List[Subcategory])
async def get_subcategories(category_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category_id:
        query["category_id"] = category_id
    subcategories = await db.subcategories.find(query, {"_id": 0}).to_list(1000)
    return subcategories

@api_router.put("/subcategories/{subcategory_id}", response_model=Subcategory)
async def update_subcategory(subcategory_id: str, subcategory_data: SubcategoryCreate, current_user: dict = Depends(get_current_user)):
    await db.subcategories.update_one({"id": subcategory_id}, {"$set": subcategory_data.model_dump()})
    subcategory = await db.subcategories.find_one({"id": subcategory_id}, {"_id": 0})
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    return Subcategory(**subcategory)

# Bulk Supplier Payment Models
class BulkInvoicePayment(BaseModel):
    purchase_entry_id: str
    amount_allocated: float

class BulkPaymentRequest(BaseModel):
    supplier_id: str
    payment_date: str
    payment_mode: str
    bank_account_id: Optional[str] = None
    total_paid_amount: float
    transaction_reference: Optional[str] = None
    invoices: List[BulkInvoicePayment]

@api_router.post("/payments/bulk-supplier")
async def bulk_supplier_payment(payment_data: BulkPaymentRequest, current_user: dict = Depends(get_current_user)):
    # 1. Validate total allocation
    total_allocated = sum(inv.amount_allocated for inv in payment_data.invoices)
    if abs(total_allocated - payment_data.total_paid_amount) > 0.01:
        raise HTTPException(status_code=400, detail=f"Total allocated ({total_allocated}) does not match total paid amount ({payment_data.total_paid_amount})")

    # 2. Log single bank transaction
    transaction_id = str(uuid.uuid4())
    
    # Get supplier name for description
    supplier = await db.suppliers.find_one({"id": payment_data.supplier_id})
    supplier_name = supplier.get("name", "Unknown Supplier") if supplier else "Unknown Supplier"
    
    await log_bank_transaction(
        amount=payment_data.total_paid_amount,
        payment_mode=payment_data.payment_mode,
        transaction_type="debit", # Outgoing payment
        reference_type="bulk_purchase_payment",
        reference_id=transaction_id,
        reference_number=payment_data.transaction_reference or "",
        description=f"Bulk Payment to {supplier_name}",
        transaction_date=payment_data.payment_date,
        party_name=supplier_name,
        party_id=payment_data.supplier_id,
        bank_account_id=payment_data.bank_account_id
    )

    # 3. Update each purchase entry
    updated_entries = []
    for invoice in payment_data.invoices:
        purchase = await db.purchase_entries.find_one({"id": invoice.purchase_entry_id})
        if not purchase:
            continue
            
        new_paid = (purchase.get("paid_amount", 0) or 0) + invoice.amount_allocated
        grand_total = purchase.get("total_amount", 0) or 0
        
        status = "unpaid"
        if new_paid >= grand_total and grand_total > 0:
            status = "paid"
        elif new_paid > 0:
            status = "partial"
            
        # Append to transaction details
        new_detail = f"Paid {invoice.amount_allocated} on {payment_data.payment_date} via Bulk Payment"
        current_details = purchase.get("transaction_details", "")
        updated_details = f"{current_details}\n{new_detail}" if current_details else new_detail
        
        await db.purchase_entries.update_one(
            {"id": invoice.purchase_entry_id},
            {
                "$set": {
                    "paid_amount": new_paid,
                    "payment_status": status,
                    "transaction_details": updated_details
                }
            }
        )
        updated_entries.append(invoice.purchase_entry_id)

    return {"message": "Bulk payment recorded successfully", "transaction_id": transaction_id, "updated_entries": updated_entries}

@api_router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(subcategory_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.subcategories.delete_one({"id": subcategory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    return {"message": "Subcategory deleted successfully"}

# GST Slabs endpoints
@api_router.post("/gst-slabs", response_model=GSTSlab)
async def create_gst_slab(gst_data: GSTSlabCreate, current_user: dict = Depends(get_current_user)):
    gst_id = str(uuid.uuid4())
    gst_dict = {
        "id": gst_id,
        **gst_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.gst_slabs.insert_one(gst_dict)
    return GSTSlab(**gst_dict)

@api_router.get("/gst-slabs", response_model=List[GSTSlab])
async def get_gst_slabs(current_user: dict = Depends(get_current_user)):
    slabs = await db.gst_slabs.find({}, {"_id": 0}).to_list(100)
    return slabs

@api_router.put("/gst-slabs/{gst_id}", response_model=GSTSlab)
async def update_gst_slab(gst_id: str, gst_data: GSTSlabUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in gst_data.model_dump().items() if v is not None}
    await db.gst_slabs.update_one({"id": gst_id}, {"$set": update_dict})
    slab = await db.gst_slabs.find_one({"id": gst_id}, {"_id": 0})
    if not slab:
        raise HTTPException(status_code=404, detail="GST Slab not found")
    return GSTSlab(**slab)

@api_router.delete("/gst-slabs/{gst_id}")
async def delete_gst_slab(gst_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.gst_slabs.delete_one({"id": gst_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="GST Slab not found")
    return {"message": "GST Slab deleted successfully"}

# Item Units endpoints
@api_router.post("/item-units", response_model=ItemUnit)
async def create_item_unit(unit_data: ItemUnitCreate, current_user: dict = Depends(get_current_user)):
    unit_id = str(uuid.uuid4())
    unit_dict = {
        "id": unit_id,
        **unit_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.item_units.insert_one(unit_dict)
    return ItemUnit(**unit_dict)

@api_router.get("/item-units", response_model=List[ItemUnit])
async def get_item_units(current_user: dict = Depends(get_current_user)):
    units = await db.item_units.find({}, {"_id": 0}).to_list(100)
    return units

@api_router.put("/item-units/{unit_id}", response_model=ItemUnit)
async def update_item_unit(unit_id: str, unit_data: ItemUnitCreate, current_user: dict = Depends(get_current_user)):
    await db.item_units.update_one({"id": unit_id}, {"$set": unit_data.model_dump()})
    unit = await db.item_units.find_one({"id": unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return ItemUnit(**unit)

@api_router.delete("/item-units/{unit_id}")
async def delete_item_unit(unit_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.item_units.delete_one({"id": unit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"message": "Unit deleted successfully"}

# Dental Lab endpoints
@api_router.post("/dental-labs", response_model=DentalLab)
async def create_dental_lab(lab_data: DentalLabCreate, current_user: dict = Depends(get_current_user)):
    lab_dict = {
        "id": str(uuid.uuid4()),
        **lab_data.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.dental_labs.insert_one(lab_dict)
    return DentalLab(**lab_dict)

@api_router.get("/dental-labs", response_model=List[DentalLab])
async def get_dental_labs(current_user: dict = Depends(get_current_user)):
    labs = await db.dental_labs.find({}, {"_id": 0}).to_list(1000)
    return labs

@api_router.put("/dental-labs/{lab_id}", response_model=DentalLab)
async def update_dental_lab(lab_id: str, lab_data: DentalLabCreate, current_user: dict = Depends(get_current_user)):
    result = await db.dental_labs.update_one({"id": lab_id}, {"$set": lab_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lab not found")
    lab = await db.dental_labs.find_one({"id": lab_id}, {"_id": 0})
    return DentalLab(**lab)

@api_router.delete("/dental-labs/{lab_id}")
async def delete_dental_lab(lab_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.dental_labs.delete_one({"id": lab_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lab not found")
    return {"message": "Lab deleted successfully"}

# Lab Work Type endpoints
@api_router.get("/lab-work-types", response_model=List[LabWorkType])
async def get_lab_work_types(current_user: dict = Depends(get_current_user)):
    work_types = await db.lab_work_types.find({"is_active": True}, {"_id": 0}).to_list(100)
    return [LabWorkType(**wt) for wt in work_types]

@api_router.post("/lab-work-types", response_model=LabWorkType)
async def create_lab_work_type(data: LabWorkTypeCreate, current_user: dict = Depends(get_current_user)):
    work_type_dict = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lab_work_types.insert_one(work_type_dict)
    return LabWorkType(**work_type_dict)

@api_router.put("/lab-work-types/{wt_id}", response_model=LabWorkType)
async def update_lab_work_type(wt_id: str, data: LabWorkTypeCreate, current_user: dict = Depends(get_current_user)):
    result = await db.lab_work_types.update_one({"id": wt_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Work type not found")
    wt = await db.lab_work_types.find_one({"id": wt_id}, {"_id": 0})
    return LabWorkType(**wt)

@api_router.delete("/lab-work-types/{wt_id}")
async def delete_lab_work_type(wt_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.lab_work_types.delete_one({"id": wt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Work type not found")
    return {"message": "Work type deleted successfully"}

# Lab Material endpoints
@api_router.get("/lab-materials", response_model=List[LabMaterial])
async def get_lab_materials(current_user: dict = Depends(get_current_user)):
    materials = await db.lab_materials.find({"is_active": True}, {"_id": 0}).to_list(100)
    return [LabMaterial(**m) for m in materials]

@api_router.post("/lab-materials", response_model=LabMaterial)
async def create_lab_material(data: LabMaterialCreate, current_user: dict = Depends(get_current_user)):
    material_dict = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lab_materials.insert_one(material_dict)
    return LabMaterial(**material_dict)

@api_router.put("/lab-materials/{mat_id}", response_model=LabMaterial)
async def update_lab_material(mat_id: str, data: LabMaterialCreate, current_user: dict = Depends(get_current_user)):
    result = await db.lab_materials.update_one({"id": mat_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    mat = await db.lab_materials.find_one({"id": mat_id}, {"_id": 0})
    return LabMaterial(**mat)

@api_router.delete("/lab-materials/{mat_id}")
async def delete_lab_material(mat_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.lab_materials.delete_one({"id": mat_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"message": "Material deleted successfully"}

# Lab Order endpoints
@api_router.post("/lab-orders", response_model=LabOrder)
async def create_lab_order(order_data: LabOrderCreate, current_user: dict = Depends(get_current_user)):
    # Generate order number
    count = await db.lab_orders.count_documents({})
    order_number = f"LAB-{str(count + 1).zfill(5)}"
    
    # Get lab name if not provided
    lab_name = order_data.lab_name
    if not lab_name and order_data.lab_id:
        lab = await db.dental_labs.find_one({"id": order_data.lab_id})
        lab_name = lab.get("name", "") if lab else ""
    
    # Determine payment status
    payment_status = "pending"
    if order_data.paid_amount >= order_data.invoice_amount and order_data.invoice_amount > 0:
        payment_status = "paid"
    elif order_data.paid_amount > 0:
        payment_status = "partial"
    
    order_dict = {
        "id": str(uuid.uuid4()),
        "order_number": order_number,
        **order_data.model_dump(),
        "lab_name": lab_name,
        "status": "ordered",
        "payment_status": payment_status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lab_orders.insert_one(order_dict)
    return LabOrder(**order_dict)

@api_router.get("/lab-orders", response_model=List[LabOrder])
async def get_lab_orders(status: Optional[str] = None, lab_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    if lab_id:
        query["lab_id"] = lab_id
    orders = await db.lab_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.put("/lab-orders/{order_id}", response_model=LabOrder)
async def update_lab_order(order_id: str, order_data: LabOrderCreate, current_user: dict = Depends(get_current_user)):
    # Determine payment status
    payment_status = "pending"
    if order_data.paid_amount >= order_data.invoice_amount and order_data.invoice_amount > 0:
        payment_status = "paid"
    elif order_data.paid_amount > 0:
        payment_status = "partial"
    
    update_data = order_data.model_dump()
    update_data["payment_status"] = payment_status
    
    result = await db.lab_orders.update_one({"id": order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    order = await db.lab_orders.find_one({"id": order_id}, {"_id": 0})
    return LabOrder(**order)

@api_router.patch("/lab-orders/{order_id}/status")
async def update_lab_order_status(order_id: str, status: str, actual_delivery_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    update_data = {"status": status}
    if actual_delivery_date:
        update_data["actual_delivery_date"] = actual_delivery_date
    if status == "delivered" and not actual_delivery_date:
        update_data["actual_delivery_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    result = await db.lab_orders.update_one({"id": order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Status updated"}

@api_router.patch("/lab-orders/{order_id}/payment")
async def update_lab_order_payment(order_id: str, paid_amount: float, payment_mode: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    order = await db.lab_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    new_paid = (order.get("paid_amount", 0) or 0) + paid_amount
    invoice_amount = order.get("invoice_amount", 0) or 0
    
    payment_status = "pending"
    if new_paid >= invoice_amount and invoice_amount > 0:
        payment_status = "paid"
    elif new_paid > 0:
        payment_status = "partial"
    
    update_data = {
        "paid_amount": new_paid,
        "payment_status": payment_status,
        "payment_date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    if payment_mode:
        update_data["payment_mode"] = payment_mode
    
    await db.lab_orders.update_one({"id": order_id}, {"$set": update_data})
    return {"message": "Payment updated", "new_paid_amount": new_paid, "payment_status": payment_status}

@api_router.delete("/lab-orders/{order_id}")
async def delete_lab_order(order_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.lab_orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted successfully"}

# Serial Number endpoints
@api_router.post("/serial-numbers", response_model=SerialNumber)
async def create_serial_number(serial_data: SerialNumberCreate, current_user: dict = Depends(get_current_user)):
    # Check if config already exists for this combination
    existing = await db.serial_numbers.find_one({
        "branch_id": serial_data.branch_id,
        "document_type": serial_data.document_type,
        "financial_year": serial_data.financial_year
    })
    if existing:
        raise HTTPException(status_code=400, detail="Serial number config already exists for this branch, document type and financial year")
    
    serial_id = str(uuid.uuid4())
    serial_dict = {
        "id": serial_id,
        **serial_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.serial_numbers.insert_one(serial_dict)
    return serial_dict

@api_router.get("/serial-numbers", response_model=List[SerialNumber])
async def get_serial_numbers(branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if branch_id:
        query["branch_id"] = branch_id
    return await db.serial_numbers.find(query, {"_id": 0}).to_list(1000)

@api_router.get("/serial-numbers/{serial_id}", response_model=SerialNumber)
async def get_serial_number(serial_id: str, current_user: dict = Depends(get_current_user)):
    serial = await db.serial_numbers.find_one({"id": serial_id}, {"_id": 0})
    if not serial:
        raise HTTPException(status_code=404, detail="Serial number config not found")
    return serial

@api_router.put("/serial-numbers/{serial_id}", response_model=SerialNumber)
async def update_serial_number(serial_id: str, serial_data: SerialNumberCreate, current_user: dict = Depends(get_current_user)):
    result = await db.serial_numbers.update_one(
        {"id": serial_id},
        {"$set": serial_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Serial number config not found")
    return await db.serial_numbers.find_one({"id": serial_id}, {"_id": 0})

@api_router.delete("/serial-numbers/{serial_id}")
async def delete_serial_number(serial_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.serial_numbers.delete_one({"id": serial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Serial number config not found")
    return {"message": "Serial number config deleted successfully"}

@api_router.get("/serial-numbers/next/{branch_id}/{document_type}")
async def get_next_serial(branch_id: str, document_type: str, current_user: dict = Depends(get_current_user)):
    # Get current financial year
    now = datetime.now()
    if now.month < 4:
        fy = f"{now.year - 1}-{now.year}"
    else:
        fy = f"{now.year}-{now.year + 1}"
    
    serial = await db.serial_numbers.find_one({
        "branch_id": branch_id,
        "document_type": document_type,
        "financial_year": fy
    }, {"_id": 0})
    
    if not serial:
        return {"next_number": 1, "prefix": "", "formatted": "1"}
    
    return {
        "next_number": serial["current_number"],
        "prefix": serial.get("prefix", ""),
        "formatted": f"{serial.get('prefix', '')}{serial['current_number']}"
    }

@api_router.post("/serial-numbers/increment/{branch_id}/{document_type}")
async def increment_serial(branch_id: str, document_type: str, current_user: dict = Depends(get_current_user)):
    # Get current financial year
    now = datetime.now()
    if now.month < 4:
        fy = f"{now.year - 1}-{now.year}"
    else:
        fy = f"{now.year}-{now.year + 1}"
    
    result = await db.serial_numbers.find_one_and_update(
        {
            "branch_id": branch_id,
            "document_type": document_type,
            "financial_year": fy
        },
        {"$inc": {"current_number": 1}},
        return_document=True
    )
    
    if not result:
        return {"message": "No serial config found, using default"}
    return {"message": "Serial incremented", "new_number": result["current_number"]}

# Stock Transfer endpoints
@api_router.post("/stock-transfers", response_model=StockTransfer)
async def create_stock_transfer(transfer_data: StockTransferCreate, current_user: dict = Depends(get_current_user)):
    """Create a stock transfer between locations.
    Moves stock using FEFO logic at the source and accurately updates the destination.
    """
    
    # Generate transfer number
    today = datetime.now(timezone.utc)
    prefix = "TRF"
    year_suffix = today.strftime("%y")
    
    # Get count of transfers today for sequential numbering
    start_of_day = today.replace(hour=0, minute=0, second=0, microsecond=0)
    count = await db.stock_transfers.count_documents({
        "created_at": {"$gte": start_of_day.isoformat()}
    })
    transfer_number = f"{prefix}{year_suffix}{today.strftime('%m%d')}{str(count + 1).zfill(4)}"
    
    enriched_items = []
    # Process each item in the transfer
    for item_data in transfer_data.items:
        item_name = item_data.get("item_name", "").strip()
        requested_batch = item_data.get("batch_number", "").strip()
        quantity = float(item_data.get("quantity", 0))

        if not item_name or quantity <= 0:
            continue

        # 1. Deduct from source using FEFO (or specific batch if requested)
        from_branch = transfer_data.from_id if transfer_data.from_type == "branch" else None
        from_godown = transfer_data.from_id if transfer_data.from_type == "godown" else None
        
        deductions = await deduct_stock_fefo(
            item_name, 
            quantity, 
            branch_id=from_branch, 
            godown_id=from_godown, 
            batch_number=requested_batch if requested_batch else None
        )
        
        # 2. Add each deducted batch to destination
        for deduction in deductions:
            batch_num = deduction["batch_number"]
            exp_date = deduction["expiry_date"]
            deduct_qty = deduction["quantity"]
            deduct_mrp = deduction["mrp"]
            
            # Find manufacturer from source medicine to propagate
            src_med = await db.medicines.find_one({"id": deduction["medicine_id"]})
            manufacturer = src_med.get("manufacturer") if src_med else ""
            
            dest_query = {
                "name": item_name, 
                "batch_number": batch_num, 
                "mrp": {"$in": [deduct_mrp, int(deduct_mrp) if deduct_mrp.is_integer() else deduct_mrp]},
                "purpose": "for_sale"
            }
            if transfer_data.to_type == "godown":
                dest_query["godown_id"] = transfer_data.to_id
                dest_query["branch_id"] = None
            else:
                dest_query["branch_id"] = transfer_data.to_id
                dest_query["godown_id"] = None
                
            dest_item = await db.medicines.find_one(dest_query)
            if dest_item:
                update_fields = {"$inc": {"stock_quantity": deduct_qty}}
                # Ensure destination has expiry if missing but source has it
                if not dest_item.get("expiry_date") and exp_date:
                    update_fields["$set"] = {"expiry_date": exp_date}
                await db.medicines.update_one({"id": dest_item["id"]}, update_fields)
            else:
                new_dest_item = {
                    "id": str(uuid.uuid4()),
                    "name": item_name,
                    "batch_number": batch_num,
                    "expiry_date": exp_date,
                    "mrp": deduct_mrp,
                    "unit_price": deduct_mrp,
                    "stock_quantity": deduct_qty,
                    "purpose": "for_sale",
                    "manufacturer": manufacturer,
                    "godown_id": transfer_data.to_id if transfer_data.to_type == "godown" else None,
                    "branch_id": transfer_data.to_id if transfer_data.to_type == "branch" else None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.medicines.insert_one(new_dest_item)
                
        # Record the actual movement details
        item_copy = dict(item_data)
        item_copy["actual_deductions"] = deductions
        enriched_items.append(item_copy)

    # 3. Create transfer record
    transfer_id = str(uuid.uuid4())
    transfer_dict = {
        "id": transfer_id,
        "transfer_number": transfer_number,
        **transfer_data.model_dump(),
        "items": enriched_items,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.stock_transfers.insert_one(transfer_dict)
    return StockTransfer(**transfer_dict)

@api_router.get("/stock-transfers", response_model=List[StockTransfer])
async def get_stock_transfers(
    from_id: Optional[str] = None,
    to_id: Optional[str] = None,
    transfer_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if from_id:
        query["from_id"] = from_id
    if to_id:
        query["to_id"] = to_id
    if transfer_type:
        query["transfer_type"] = transfer_type
    transfers = await db.stock_transfers.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return transfers

@api_router.delete("/stock-transfers/{transfer_id}")
async def delete_stock_transfer(transfer_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a transfer and reverse the stock movement."""
    transfer = await db.stock_transfers.find_one({"id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    # Reverse stock movements
    for item in transfer.get("items", []):
        item_name = item.get("item_name", "").strip()
        batch_number = item.get("batch_number", "").strip()
        quantity = int(item.get("quantity", 0))
        mrp = round(float(item.get("mrp") or 0), 2)
        
        mrp_query = {"$in": [mrp, int(mrp) if mrp.is_integer() else mrp]}
        
        # Deduct from destination
        dest_query = {
            "name": item_name, 
            "batch_number": batch_number, 
            "mrp": mrp_query,
            "purpose": "for_sale"
        }
        if transfer.get("to_type") == "godown":
            dest_query["godown_id"] = transfer.get("to_id")
            dest_query["branch_id"] = None
        else:
            dest_query["branch_id"] = transfer.get("to_id")
            dest_query["godown_id"] = None
            
        await db.medicines.update_one(dest_query, {"$inc": {"stock_quantity": -quantity}})
            
        # Add back to source
        src_query = {
            "name": item_name, 
            "batch_number": batch_number, 
            "mrp": mrp_query,
            "purpose": "for_sale"
        }
        if transfer.get("from_type") == "godown":
            src_query["godown_id"] = transfer.get("from_id")
            src_query["branch_id"] = None
        else:
            src_query["branch_id"] = transfer.get("from_id")
            src_query["godown_id"] = None
            
        src_item = await db.medicines.find_one(src_query)
        if src_item:
            await db.medicines.update_one({"id": src_item["id"]}, {"$inc": {"stock_quantity": quantity}})
        else:
            # Create new record in source if it was deleted
            new_src_item = {
                "id": str(uuid.uuid4()),
                "name": item_name,
                "batch_number": batch_number,
                "mrp": mrp,
                "unit_price": mrp,
                "stock_quantity": quantity,
                "purpose": "for_sale",
                "godown_id": transfer.get("from_id") if transfer.get("from_type") == "godown" else None,
                "branch_id": transfer.get("from_id") if transfer.get("from_type") == "branch" else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.medicines.insert_one(new_src_item)
            
    await db.stock_transfers.delete_one({"id": transfer_id})
    return {"message": "Transfer deleted and stock reversed"}

@api_router.put("/stock-transfers/{transfer_id}", response_model=StockTransfer)
async def update_stock_transfer(transfer_id: str, transfer_data: StockTransferCreate, current_user: dict = Depends(get_current_user)):
    """Update a transfer by reversing the old movement and applying the new one."""
    old_transfer = await db.stock_transfers.find_one({"id": transfer_id})
    if not old_transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
        
    # 1. Reverse old movements
    for item in old_transfer.get("items", []):
        item_name = item.get("item_name", "").strip()
        batch_number = item.get("batch_number", "").strip()
        quantity = int(item.get("quantity", 0))
        mrp = round(float(item.get("mrp") or 0), 2)
        
        mrp_query = {"$in": [mrp, int(mrp) if mrp.is_integer() else mrp]}
        
        # Deduct from destination
        dest_query = {
            "name": item_name, 
            "batch_number": batch_number, 
            "mrp": mrp_query,
            "purpose": "for_sale"
        }
        if old_transfer.get("to_type") == "godown":
            dest_query["godown_id"] = old_transfer.get("to_id")
            dest_query["branch_id"] = None
        else:
            dest_query["branch_id"] = old_transfer.get("to_id")
            dest_query["godown_id"] = None
        await db.medicines.update_one(dest_query, {"$inc": {"stock_quantity": -quantity}})
        
        # Add back to source
        src_query = {
            "name": item_name, 
            "batch_number": batch_number, 
            "mrp": mrp_query,
            "purpose": "for_sale"
        }
        if old_transfer.get("from_type") == "godown":
            src_query["godown_id"] = old_transfer.get("from_id")
            src_query["branch_id"] = None
        else:
            src_query["branch_id"] = old_transfer.get("from_id")
            src_query["godown_id"] = None
            
        src_item = await db.medicines.find_one(src_query)
        if src_item:
            await db.medicines.update_one({"id": src_item["id"]}, {"$inc": {"stock_quantity": quantity}})
        else:
            # Recreate source item if deleted
            new_src_item = {
                "id": str(uuid.uuid4()),
                "name": item_name,
                "batch_number": batch_number,
                "mrp": mrp,
                "unit_price": mrp,
                "stock_quantity": quantity,
                "purpose": "for_sale",
                "godown_id": old_transfer.get("from_id") if old_transfer.get("from_type") == "godown" else None,
                "branch_id": old_transfer.get("from_id") if old_transfer.get("from_type") == "branch" else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.medicines.insert_one(new_src_item)

    # 2. Apply new movements (logic similar to create_stock_transfer)
    for item_data in transfer_data.items:
        # 1. Verify total available stock (Sum both collections)
        item_name = item_data.get("item_name", "").strip()
        batch_number = item_data.get("batch_number", "").strip()
        quantity = int(item_data.get("quantity", 0))
        mrp = round(float(item_data.get("mrp", 0)), 2)
        
        if not item_name or quantity <= 0:
            continue

        # Build matching query
        mrp_query = {"$in": [mrp, int(mrp) if mrp.is_integer() else mrp]}
        source_query = {
            "name": item_name, 
            "batch_number": batch_number, 
            "mrp": mrp_query,
            "purpose": "for_sale"
        }
        if transfer_data.from_type == "godown":
            source_query["godown_id"] = transfer_data.from_id
            source_query["branch_id"] = None
        else:
            source_query["branch_id"] = transfer_data.from_id
            source_query["godown_id"] = None

        available_qty = 0
        
        # Sum from purchase entries
        pe_query = {"items.medicine_name": item_name, "items.batch_number": batch_number}
        if transfer_data.from_type == "godown":
            pe_query["godown_id"] = transfer_data.from_id
        else:
            pe_query["branch_id"] = transfer_data.from_id
            
        pe_matches = await db.purchase_entries.find(pe_query).to_list(100)
        for pe in pe_matches:
            for itm in pe.get("items", []):
                if (itm.get("medicine_name", "").strip() == item_name and 
                    itm.get("batch_number", "").strip() == batch_number and
                    round(float(itm.get("mrp") or 0), 2) == mrp):
                    available_qty += int(itm.get("quantity", 0)) + int(itm.get("free_quantity", 0))
        
        # Factor in existing adjustments in medicines
        med_matches = await db.medicines.find(source_query).to_list(100)
        for med in med_matches:
            available_qty += int(med.get("stock_quantity") or 0)
            
        if available_qty < quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {item_name} at source. Available: {available_qty}")

        # 2. Deduct from source
        src_item = await db.medicines.find_one(source_query)
        if src_item:
            await db.medicines.update_one({"id": src_item["id"]}, {"$inc": {"stock_quantity": -quantity}})
        else:
            new_src_item = {
                "id": str(uuid.uuid4()),
                "name": item_name,
                "batch_number": batch_number,
                "mrp": mrp,
                "unit_price": mrp,
                "stock_quantity": -quantity,
                "purpose": "for_sale",
                "godown_id": transfer_data.from_id if transfer_data.from_type == "godown" else None,
                "branch_id": transfer_data.from_id if transfer_data.from_type == "branch" else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.medicines.insert_one(new_src_item)
        
        # 3. Add to destination
        dest_query = {
            "name": item_name, 
            "batch_number": batch_number, 
            "mrp": mrp_query,
            "purpose": "for_sale"
        }
        if transfer_data.to_type == "godown":
            dest_query["godown_id"] = transfer_data.to_id
            dest_query["branch_id"] = None
        else:
            dest_query["branch_id"] = transfer_data.to_id
            dest_query["godown_id"] = None
            
        dest_item = await db.medicines.find_one(dest_query)
        if dest_item:
            await db.medicines.update_one({"id": dest_item["id"]}, {"$inc": {"stock_quantity": quantity}})
        else:
            new_dest_item = {
                "id": str(uuid.uuid4()),
                "name": item_name,
                "batch_number": batch_number,
                "mrp": mrp,
                "unit_price": mrp,
                "stock_quantity": quantity,
                "purpose": "for_sale",
                "manufacturer": item_data.get("manufacturer", ""),
                "godown_id": transfer_data.to_id if transfer_data.to_type == "godown" else None,
                "branch_id": transfer_data.to_id if transfer_data.to_type == "branch" else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.medicines.insert_one(new_dest_item)

    # 3. Update the record
    updated_dict = {
        **old_transfer,
        **transfer_data.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"]
    }
    await db.stock_transfers.update_one({"id": transfer_id}, {"$set": updated_dict})
    
    return StockTransfer(**updated_dict)

@api_router.get("/stock-transfers/next-number")
async def get_next_transfer_number(current_user: dict = Depends(get_current_user)):
    """Get the next transfer number for display purposes."""
    today = datetime.now(timezone.utc)
    prefix = "TRF"
    year_suffix = today.strftime("%y")
    
    start_of_day = today.replace(hour=0, minute=0, second=0, microsecond=0)
    count = await db.stock_transfers.count_documents({
        "created_at": {"$gte": start_of_day.isoformat()}
    })
    transfer_number = f"{prefix}{year_suffix}{today.strftime('%m%d')}{str(count + 1).zfill(4)}"
    return {"transfer_number": transfer_number}

# Role Permissions endpoints
@api_router.post("/role-permissions", response_model=RolePermission)
async def create_role_permission(perm_data: RolePermissionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can manage permissions")
    
    perm_id = str(uuid.uuid4())
    perm_dict = {
        "id": perm_id,
        **perm_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.role_permissions.insert_one(perm_dict)
    return RolePermission(**perm_dict)

@api_router.get("/role-permissions", response_model=List[RolePermission])
async def get_role_permissions(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if role:
        query["role"] = role
    permissions = await db.role_permissions.find(query, {"_id": 0}).to_list(1000)
    return permissions

@api_router.put("/role-permissions/{perm_id}", response_model=RolePermission)
async def update_role_permission(perm_id: str, perm_data: RolePermissionUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can manage permissions")
    
    update_dict = {k: v for k, v in perm_data.model_dump().items() if v is not None}
    await db.role_permissions.update_one({"id": perm_id}, {"$set": update_dict})
    perm = await db.role_permissions.find_one({"id": perm_id}, {"_id": 0})
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    return RolePermission(**perm)

@api_router.delete("/role-permissions/{perm_id}")
async def delete_role_permission(perm_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can manage permissions")
    
    result = await db.role_permissions.delete_one({"id": perm_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Permission not found")
    return {"message": "Permission deleted successfully"}

# Initialize default GST slabs
@api_router.post("/init-gst-slabs")
async def init_default_gst_slabs(current_user: dict = Depends(get_current_user)):
    existing = await db.gst_slabs.count_documents({})
    if existing > 0:
        return {"message": "GST slabs already exist"}
    
    default_slabs = [
        {"name": "GST 0%", "percentage": 0, "description": "Exempted items"},
        {"name": "GST 5%", "percentage": 5, "description": "Essential items"},
        {"name": "GST 12%", "percentage": 12, "description": "Standard rate"},
        {"name": "GST 18%", "percentage": 18, "description": "Standard rate"},
        {"name": "GST 28%", "percentage": 28, "description": "Luxury items"},
    ]
    
    for slab in default_slabs:
        slab_id = str(uuid.uuid4())
        slab_dict = {
            "id": slab_id,
            **slab,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.gst_slabs.insert_one(slab_dict)
    
    return {"message": "Default GST slabs initialized"}

# Initialize default item units
@api_router.post("/init-item-units")
async def init_default_item_units(current_user: dict = Depends(get_current_user)):
    existing = await db.item_units.count_documents({})
    if existing > 0:
        return {"message": "Item units already exist"}
    
    default_units = [
        {"name": "Tablets", "short_name": "TAB"},
        {"name": "Capsules", "short_name": "CAP"},
        {"name": "Strips", "short_name": "STRIP"},
        {"name": "Bottles", "short_name": "BTL"},
        {"name": "Tubes", "short_name": "TUBE"},
        {"name": "Vials", "short_name": "VIAL"},
        {"name": "Ampoules", "short_name": "AMP"},
        {"name": "Sachets", "short_name": "SACH"},
        {"name": "Pieces", "short_name": "PCS"},
        {"name": "Box", "short_name": "BOX"},
    ]
    
    for unit in default_units:
        unit_id = str(uuid.uuid4())
        unit_dict = {
            "id": unit_id,
            **unit,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.item_units.insert_one(unit_dict)
    
    return {"message": "Default item units initialized"}

# Initialize default categories
@api_router.post("/init-categories")
async def init_default_categories(current_user: dict = Depends(get_current_user)):
    existing = await db.categories.count_documents({})
    if existing > 0:
        return {"message": "Categories already exist"}
    
    default_categories = [
        {"name": "General", "description": "General medicines"},
        {"name": "Antibiotics", "description": "Antibiotic medicines"},
        {"name": "Painkillers", "description": "Pain relief medicines"},
        {"name": "Dental", "description": "Dental specific medicines"},
        {"name": "Surgical", "description": "Surgical supplies"},
        {"name": "Consumables", "description": "Dental consumables"},
    ]
    
    for cat in default_categories:
        cat_id = str(uuid.uuid4())
        cat_dict = {
            "id": cat_id,
            **cat,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.categories.insert_one(cat_dict)
    
    return {"message": "Default categories initialized"}

# ============ BANK ACCOUNT ENDPOINTS ============

@api_router.post("/bank-accounts", response_model=BankAccount)
async def create_bank_account(bank_data: BankAccountCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can manage bank accounts")
    
    bank_id = str(uuid.uuid4())
    bank_dict = {
        "id": bank_id,
        **bank_data.model_dump(),
        "current_balance": bank_data.opening_balance,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bank_accounts.insert_one(bank_dict)
    return BankAccount(**bank_dict)

@api_router.get("/bank-accounts", response_model=List[BankAccount])
async def get_bank_accounts(current_user: dict = Depends(get_current_user)):
    accounts = await db.bank_accounts.find({}, {"_id": 0}).to_list(100)
    return accounts

@api_router.get("/bank-accounts/{bank_id}", response_model=BankAccount)
async def get_bank_account(bank_id: str, current_user: dict = Depends(get_current_user)):
    account = await db.bank_accounts.find_one({"id": bank_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return BankAccount(**account)

@api_router.put("/bank-accounts/{bank_id}", response_model=BankAccount)
async def update_bank_account(bank_id: str, bank_data: BankAccountUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can manage bank accounts")
    
    update_dict = {k: v for k, v in bank_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.bank_accounts.update_one({"id": bank_id}, {"$set": update_dict})
    account = await db.bank_accounts.find_one({"id": bank_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return BankAccount(**account)

@api_router.delete("/bank-accounts/{bank_id}")
async def delete_bank_account(bank_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can manage bank accounts")
    
    result = await db.bank_accounts.delete_one({"id": bank_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return {"message": "Bank account deleted successfully"}

# ============ BANK TRANSACTION ENDPOINTS ============

@api_router.get("/bank-transactions")
async def get_bank_transactions(
    bank_account_id: Optional[str] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if bank_account_id:
        query["bank_account_id"] = bank_account_id
    if transaction_type:
        query["transaction_type"] = transaction_type
    if start_date and end_date:
        query["transaction_date"] = {"$gte": start_date, "$lte": end_date}
    
    transactions = await db.bank_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return transactions

@api_router.post("/bank-transactions")
async def create_bank_transaction(txn_data: BankTransactionCreate, current_user: dict = Depends(get_current_user)):
    txn_id = str(uuid.uuid4())
    txn_dict = {
        "id": txn_id,
        **txn_data.model_dump(),
        "is_manual": True,  # Mark as manually added
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bank_transactions.insert_one(txn_dict)
    
    # Update bank balance
    bank = await db.bank_accounts.find_one({"id": txn_data.bank_account_id})
    if bank:
        balance_change = txn_data.amount if txn_data.transaction_type == "credit" else -txn_data.amount
        new_balance = bank.get("current_balance", 0) + balance_change
        await db.bank_accounts.update_one(
            {"id": txn_data.bank_account_id},
            {"$set": {"current_balance": new_balance}}
        )
    
    return {"message": "Transaction recorded", "id": txn_id}

@api_router.get("/bank-transactions/summary")
async def get_bank_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if start_date and end_date:
        query["transaction_date"] = {"$gte": start_date, "$lte": end_date}
    
    transactions = await db.bank_transactions.find(query, {"_id": 0}).to_list(10000)
    
    total_credit = sum(t["amount"] for t in transactions if t["transaction_type"] == "credit")
    total_debit = sum(t["amount"] for t in transactions if t["transaction_type"] == "debit")
    
    # Group by bank account
    by_bank = {}
    for t in transactions:
        bank_name = t.get("bank_name", "Unknown")
        if bank_name not in by_bank:
            by_bank[bank_name] = {"credit": 0, "debit": 0}
        if t["transaction_type"] == "credit":
            by_bank[bank_name]["credit"] += t["amount"]
        else:
            by_bank[bank_name]["debit"] += t["amount"]
    
    # Group by payment mode
    by_mode = {}
    for t in transactions:
        mode = t.get("payment_mode", "other")
        if mode not in by_mode:
            by_mode[mode] = {"credit": 0, "debit": 0}
        if t["transaction_type"] == "credit":
            by_mode[mode]["credit"] += t["amount"]
        else:
            by_mode[mode]["debit"] += t["amount"]
    
    return {
        "total_credit": total_credit,
        "total_debit": total_debit,
        "net_flow": total_credit - total_debit,
        "by_bank": by_bank,
        "by_payment_mode": by_mode,
        "transactions_count": len(transactions)
    }

# Helper function to auto-log bank transaction
async def log_bank_transaction(
    amount: float,
    payment_mode: str,
    transaction_type: str,
    reference_type: str,
    reference_id: str,
    reference_number: str,
    description: str,
    transaction_date: str,
    bank_account_id: Optional[str] = None,
    upi_id: Optional[str] = None,
    party_name: Optional[str] = None,
    party_id: Optional[str] = None,
    invoice_number: Optional[str] = None
):
    """Auto-log non-cash transactions to banking"""
    if payment_mode == "cash":
        return None
    
    # Find appropriate bank account
    bank = None
    if bank_account_id:
        bank = await db.bank_accounts.find_one({"id": bank_account_id, "is_active": True})
    elif upi_id:
        bank = await db.bank_accounts.find_one({"upi_ids": upi_id, "is_active": True})
    
    if not bank:
        # Use first active bank account as default
        bank = await db.bank_accounts.find_one({"is_active": True})
    
    if not bank:
        return None
    
    txn_id = str(uuid.uuid4())
    txn_dict = {
        "id": txn_id,
        "bank_account_id": bank["id"],
        "bank_name": bank["bank_name"],
        "transaction_type": transaction_type,
        "amount": amount,
        "payment_mode": payment_mode,
        "upi_id": upi_id,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "reference_number": reference_number,
        "description": description,
        "transaction_date": transaction_date,
        "party_name": party_name,
        "party_id": party_id,
        "invoice_number": invoice_number,
        "is_manual": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bank_transactions.insert_one(txn_dict)
    
    # Update bank balance
    balance_change = amount if transaction_type == "credit" else -amount
    new_balance = bank.get("current_balance", 0) + balance_change
    await db.bank_accounts.update_one(
        {"id": bank["id"]},
        {"$set": {"current_balance": new_balance}}
    )
    
    return txn_id

# ============ UPDATED ROLE PERMISSIONS WITH DATE RANGE ============

@api_router.post("/user-permissions")
async def create_user_permission(perm_data: RolePermissionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can manage permissions")
    
    perm_id = str(uuid.uuid4())
    perm_dict = {
        "id": perm_id,
        **perm_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_permissions.insert_one(perm_dict)
    return RolePermission(**perm_dict)

@api_router.get("/user-permissions")
async def get_user_permissions(user_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if user_id:
        query["user_id"] = user_id
    permissions = await db.user_permissions.find(query, {"_id": 0}).to_list(1000)
    return permissions

@api_router.put("/user-permissions/{perm_id}")
async def update_user_permission(perm_id: str, perm_data: RolePermissionUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can manage permissions")
    
    update_dict = {k: v for k, v in perm_data.model_dump().items() if v is not None}
    await db.user_permissions.update_one({"id": perm_id}, {"$set": update_dict})
    perm = await db.user_permissions.find_one({"id": perm_id}, {"_id": 0})
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    return RolePermission(**perm)

@api_router.delete("/user-permissions/{perm_id}")
async def delete_user_permission(perm_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can manage permissions")
    
    result = await db.user_permissions.delete_one({"id": perm_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Permission not found")
    return {"message": "Permission deleted successfully"}

app.include_router(api_router)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
