import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit, Package, Tags, Percent,
  Ruler, Users, Truck, Stethoscope,
  ArrowRightLeft, Shield, Upload, Download,
  FileSpreadsheet, CheckCircle, AlertCircle, Search,
  Pill, Box, ChevronRight, RotateCcw, MinusCircle,
  Wrench, Clock, Building2, Smartphone, X, Warehouse, Filter, Layers
} from 'lucide-react';

// Import InventoryTab component
import InventoryTab from '../components/InventoryTab';
import ItemModal from '../components/items/ItemModal';

const MasterData = ({ user }) => {
  // State for all master data
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [gstSlabs, setGstSlabs] = useState([]);
  const [itemUnits, setItemUnits] = useState([]);
  const [itemMaster, setItemMaster] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [dentalLabs, setDentalLabs] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [labWorkTypes, setLabWorkTypes] = useState([]);
  const [labMaterials, setLabMaterials] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [activeItemTypeId, setActiveItemTypeId] = useState('');

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suppliers');

  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [subcategoryDialog, setSubcategoryDialog] = useState(false);
  const [gstDialog, setGstDialog] = useState(false);
  const [unitDialog, setUnitDialog] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [inventoryDialog, setInventoryDialog] = useState(false);
  const [bankDialog, setBankDialog] = useState(false);
  const [labDialog, setLabDialog] = useState(false);
  const [labOrderDialog, setLabOrderDialog] = useState(false);
  const [workTypeDialog, setWorkTypeDialog] = useState(false);
  const [materialDialog, setMaterialDialog] = useState(false);
  const [itemTypeDialog, setItemTypeDialog] = useState(false);

  // Edit states
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingGst, setEditingGst] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editingPermission, setEditingPermission] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingInventory, setEditingInventory] = useState(null);
  const [editingBank, setEditingBank] = useState(null);
  const [editingItemType, setEditingItemType] = useState(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', item_type_id: '' });
  const [subcategoryForm, setSubcategoryForm] = useState({ category_id: '', name: '', description: '' });
  const [itemTypeForm, setItemTypeForm] = useState({ name: '', description: '' });
  const [gstForm, setGstForm] = useState({ name: '', percentage: '' });
  const [unitForm, setUnitForm] = useState({ name: '', abbreviation: '' });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierForm, setSupplierForm] = useState({
    name: '', contact_person: '', phone: '', email: '', address: '', gstin: '',
    bank_name: '', bank_branch: '', bank_account_number: '', bank_ifsc: '', gpay_number: '', upi_id: ''
  });
  const [permissionForm, setPermissionForm] = useState({
    user_id: '', user_name: '', module: '', can_view: true, can_add: false,
    can_edit: false, can_delete: false, date_restriction: 'all'
  });
  const [showPermissionPanel, setShowPermissionPanel] = useState(false);
  const [modulePermissions, setModulePermissions] = useState({});
  const [showCopyPermissions, setShowCopyPermissions] = useState(false);
  const [copyToUsers, setCopyToUsers] = useState([]);
  const [bankForm, setBankForm] = useState({
    bank_name: '', account_number: '', ifsc_code: '', account_holder: '',
    account_type: 'savings', opening_balance: 0, upi_ids: ''
  });
  const [bankTransactions, setBankTransactions] = useState([]);
  const [transactionDialog, setTransactionDialog] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    bank_account_id: '', transaction_type: 'credit', amount: '',
    payment_mode: 'cash', description: '', party_name: '',
    reference_number: '', transaction_date: new Date().toISOString().split('T')[0],
    purpose_type: 'professional'
  });
  const [itemForm, setItemForm] = useState({
    name: '', item_type_id: '', category_id: '', subcategory_id: '', unit_id: '',
    gst_percentage: '0', hsn_code: '', purpose: 'for_sale',
    charges: '', duration_minutes: '', gst_applicable: false,
    low_stock_warning_enabled: false, low_stock_threshold: '',
    item_status: 'ACTIVE', discontinued_reason: ''
  });
  const [inventoryForm, setInventoryForm] = useState({
    name: '', category: '', subcategory: '', unit: '',
    purchase_price: '', sales_price: '', stock_quantity: '',
    min_stock_level: '10', batch_number: '', expiry_date: '',
    gst_percentage: '0', hsn_code: '', purpose: 'for_sale',
    manufacturer: '', branch_id: '', godown_id: ''
  });

  // Dental Lab form states
  const [labForm, setLabForm] = useState({
    name: '', contact_person: '', phone: '', email: '', address: '', gstin: '',
    bank_name: '', bank_branch: '', bank_account_number: '', bank_ifsc: '', upi_id: ''
  });
  const [editingLab, setEditingLab] = useState(null);
  const [labOrderForm, setLabOrderForm] = useState({
    lab_id: '', patient_id: '', patient_name: '', doctor_id: '', doctor_name: '',
    work_type: '', work_description: '', teeth_numbers: '', shade: '', material: '',
    order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '',
    invoice_number: '', invoice_date: '', invoice_amount: '', paid_amount: '',
    payment_mode: '', notes: ''
  });
  const [editingLabOrder, setEditingLabOrder] = useState(null);
  const [labOrderFilter, setLabOrderFilter] = useState('all');

  // Work Type form states
  const [workTypeForm, setWorkTypeForm] = useState({ name: '', description: '' });
  const [editingWorkType, setEditingWorkType] = useState(null);

  // Material form states
  const [materialForm, setMaterialForm] = useState({ name: '', description: '' });
  const [editingMaterial, setEditingMaterial] = useState(null);

  // Return entry and stock adjustment states
  const [returnDialog, setReturnDialog] = useState(false);
  const [stockAdjustDialog, setStockAdjustDialog] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [returnForm, setReturnForm] = useState({
    supplier_id: '', quantity: '', reason: '', return_date: new Date().toISOString().split('T')[0]
  });
  const [stockAdjustForm, setStockAdjustForm] = useState({
    adjustment_type: 'reduce', quantity: '', reason: ''
  });

  // Serial number states
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [serialDialog, setSerialDialog] = useState(false);
  const [editingSerial, setEditingSerial] = useState(null);
  const [serialForm, setSerialForm] = useState({
    branch_id: '', godown_id: '', document_type: 'invoice', prefix: '', starting_number: '1',
    current_number: '1', financial_year: new Date().getFullYear().toString()
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'default'
  });

  // Bulk upload state
  const [bulkData, setBulkData] = useState('');
  const [bulkResults, setBulkResults] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const fileInputRef = useRef(null);

  // Helper to show confirmation dialog
  const showConfirm = (title, description, onConfirm, variant = 'default') => {
    setConfirmDialog({ open: true, title, description, onConfirm, variant });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [
        categoriesRes, subcategoriesRes, gstRes, unitsRes, itemsRes,
        suppliersRes, patientsRes, branchesRes, godownsRes, permissionsRes, usersRes,
        medicinesRes, serialRes, banksRes, transactionsRes, dentalLabsRes, labOrdersRes, workTypesRes, materialsRes,
        itemTypesRes
      ] = await Promise.all([
        axios.get(`${API}/categories`).catch(() => ({ data: [] })),
        axios.get(`${API}/subcategories`).catch(() => ({ data: [] })),
        axios.get(`${API}/gst-slabs`).catch(() => ({ data: [] })),
        axios.get(`${API}/item-units`).catch(() => ({ data: [] })),
        axios.get(`${API}/item-master`).catch(() => ({ data: [] })),
        axios.get(`${API}/suppliers`).catch(() => ({ data: [] })),
        axios.get(`${API}/patients`).catch(() => ({ data: [] })),
        axios.get(`${API}/branches`).catch(() => ({ data: [] })),
        axios.get(`${API}/godowns`).catch(() => ({ data: [] })),
        axios.get(`${API}/user-permissions`).catch(() => ({ data: [] })),
        axios.get(`${API}/users`).catch(() => ({ data: [] })),
        axios.get(`${API}/medicines`).catch(() => ({ data: [] })),
        axios.get(`${API}/serial-numbers`).catch(() => ({ data: [] })),
        axios.get(`${API}/bank-accounts`).catch(() => ({ data: [] })),
        axios.get(`${API}/bank-transactions`).catch(() => ({ data: [] })),
        axios.get(`${API}/dental-labs`).catch(() => ({ data: [] })),
        axios.get(`${API}/lab-orders`).catch(() => ({ data: [] })),
        axios.get(`${API}/lab-work-types`).catch(() => ({ data: [] })),
        axios.get(`${API}/lab-materials`).catch(() => ({ data: [] })),
        axios.get(`${API}/item-types`).catch(() => ({ data: [] })),
      ]);

      // If no item types, trigger seed
      if (itemTypesRes.data.length === 0) {
        await axios.get(`${API}/api/initial-seed-item-types`).catch(() => { });
        const seededRes = await axios.get(`${API}/item-types`).catch(() => ({ data: [] }));
        setItemTypes(seededRes.data);
        if (seededRes.data.length > 0 && !activeItemTypeId) {
          setActiveItemTypeId(seededRes.data[0].id);
        }
      } else {
        setItemTypes(itemTypesRes.data);
        if (itemTypesRes.data.length > 0 && !activeItemTypeId) {
          setActiveItemTypeId(itemTypesRes.data[0].id);
        }
      }
      setCategories(categoriesRes.data);
      setSubcategories(subcategoriesRes.data);
      setGstSlabs(gstRes.data);
      setItemUnits(unitsRes.data);
      setItemMaster(itemsRes.data);
      setSuppliers(suppliersRes.data);
      setPatients(patientsRes.data);
      setBranches(branchesRes.data);
      setGodowns(godownsRes.data);
      setUserPermissions(permissionsRes.data);
      setAllUsers(usersRes.data);
      setInventoryItems(medicinesRes.data);
      setSerialNumbers(serialRes.data);
      setBankAccounts(banksRes.data);
      setBankTransactions(transactionsRes.data);
      setDentalLabs(dentalLabsRes.data);
      setLabOrders(labOrdersRes.data);
      setLabWorkTypes(workTypesRes.data);
      setLabMaterials(materialsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}`, categoryForm);
        toast.success('Category updated');
      } else {
        await axios.post(`${API}/categories`, categoryForm);
        toast.success('Category added');
      }
      setCategoryDialog(false);
      setCategoryForm({ name: '', description: '', item_type_id: '' });
      setEditingCategory(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id) => {
    showConfirm(
      'Delete Category?',
      'Are you sure you want to delete this category? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/categories/${id}`);
          toast.success('Category deleted');
          fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // Subcategory handlers
  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubcategory) {
        await axios.put(`${API}/subcategories/${editingSubcategory.id}`, subcategoryForm);
        toast.success('Subcategory updated');
      } else {
        await axios.post(`${API}/subcategories`, subcategoryForm);
        toast.success('Subcategory added');
      }
      setSubcategoryDialog(false);
      setSubcategoryForm({ category_id: '', name: '', description: '' });
      setEditingSubcategory(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save subcategory');
    }
  };

  const handleDeleteSubcategory = async (id) => {
    showConfirm(
      'Delete Subcategory?',
      'Are you sure you want to delete this subcategory? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/subcategories/${id}`);
          toast.success('Subcategory deleted');
          fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // GST handlers
  const handleGstSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...gstForm, percentage: parseFloat(gstForm.percentage) };
      if (editingGst) {
        await axios.put(`${API}/gst-slabs/${editingGst.id}`, payload);
        toast.success('GST slab updated');
      } else {
        await axios.post(`${API}/gst-slabs`, payload);
        toast.success('GST slab added');
      }
      setGstDialog(false);
      setGstForm({ name: '', percentage: '' });
      setEditingGst(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save GST slab');
    }
  };

  const handleDeleteGst = async (id) => {
    showConfirm(
      'Delete GST Slab?',
      'Are you sure you want to delete this GST slab? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/gst-slabs/${id}`);
          toast.success('GST slab deleted');
          fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // Unit handlers
  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        await axios.put(`${API}/item-units/${editingUnit.id}`, unitForm);
        toast.success('Unit updated');
      } else {
        await axios.post(`${API}/item-units`, unitForm);
        toast.success('Unit added');
      }
      setUnitDialog(false);
      setUnitForm({ name: '', abbreviation: '' });
      setEditingUnit(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save unit');
    }
  };

  const handleDeleteUnit = async (id) => {
    showConfirm(
      'Delete Unit?',
      'Are you sure you want to delete this unit? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/item-units/${id}`);
          toast.success('Unit deleted');
          fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // Supplier handlers
  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await axios.put(`${API}/suppliers/${editingSupplier.id}`, supplierForm);
        toast.success('Supplier updated');
      } else {
        await axios.post(`${API}/suppliers`, supplierForm);
        toast.success('Supplier added');
      }
      setSupplierDialog(false);
      setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '', gstin: '' });
      setEditingSupplier(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save supplier');
    }
  };

  const handleDeleteSupplier = async (id) => {
    showConfirm(
      'Delete Supplier?',
      'Are you sure you want to delete this supplier? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/suppliers/${id}`);
          toast.success('Supplier deleted');
          fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // Permission handlers
  const handlePermissionSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedUser = allUsers.find(u => u.id === permissionForm.user_id);
      const payload = {
        ...permissionForm,
        user_name: selectedUser?.full_name || permissionForm.user_name
      };

      if (editingPermission) {
        await axios.put(`${API}/user-permissions/${editingPermission.id}`, payload);
        toast.success('Permission updated');
      } else {
        await axios.post(`${API}/user-permissions`, payload);
        toast.success('Permission added');
      }
      setPermissionDialog(false);
      setPermissionForm({
        user_id: '', user_name: '', module: '', can_view: true, can_add: false,
        can_edit: false, can_delete: false, date_restriction: 'all'
      });
      setEditingPermission(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save permission');
    }
  };

  const handleDeletePermission = async (id) => {
    showConfirm(
      'Delete Permission?',
      'Are you sure you want to delete this permission? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/user-permissions/${id}`);
          toast.success('Permission deleted');
          fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // Item Master handlers
  const handleItemSuccess = () => {
    fetchAllData();
  };

  const handleDeleteItem = async (id) => {
    showConfirm(
      'Delete Item?',
      'Are you sure you want to delete this item? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/item-master/${id}`);
          toast.success('Item deleted');
          fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // Inventory handlers (Medicines/Pharmacy Items)
  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: inventoryForm.name,
        category: inventoryForm.category,
        subcategory: inventoryForm.subcategory,
        unit: inventoryForm.unit,
        purchase_price: parseFloat(inventoryForm.purchase_price) || 0,
        unit_price: parseFloat(inventoryForm.sales_price) || 0,
        mrp: parseFloat(inventoryForm.sales_price) || 0,
        stock_quantity: parseInt(inventoryForm.stock_quantity) || 0,
        min_stock_level: parseInt(inventoryForm.min_stock_level) || 10,
        batch_number: inventoryForm.batch_number,
        expiry_date: inventoryForm.expiry_date || null,
        gst_percentage: parseFloat(inventoryForm.gst_percentage) || 0,
        hsn_code: inventoryForm.hsn_code,
        purpose: inventoryForm.purpose,
        manufacturer: inventoryForm.manufacturer,
        branch_id: inventoryForm.branch_id || null,
        godown_id: inventoryForm.godown_id || null,
      };

      if (editingInventory) {
        await axios.put(`${API}/medicines/${editingInventory.id}`, payload);
        toast.success('Inventory item updated');
      } else {
        await axios.post(`${API}/medicines`, payload);
        toast.success('Inventory item added');
      }
      setInventoryDialog(false);
      setInventoryForm({
        name: '', category: '', subcategory: '', unit: '',
        purchase_price: '', sales_price: '', stock_quantity: '',
        min_stock_level: '10', batch_number: '', expiry_date: '',
        gst_percentage: '0', hsn_code: '', purpose: 'for_sale',
        manufacturer: '', branch_id: '', godown_id: ''
      });
      setEditingInventory(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save inventory item');
    }
  };

  // Serial number handlers
  const handleSerialSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...serialForm,
        starting_number: parseInt(serialForm.starting_number) || 1,
        current_number: parseInt(serialForm.current_number) || parseInt(serialForm.starting_number) || 1,
      };
      if (editingSerial) {
        await axios.put(`${API}/serial-numbers/${editingSerial.id}`, payload);
        toast.success('Serial number updated');
      } else {
        await axios.post(`${API}/serial-numbers`, payload);
        toast.success('Serial number added');
      }
      setSerialDialog(false);
      setSerialForm({ branch_id: '', document_type: 'invoice', prefix: '', starting_number: '1', current_number: '1', financial_year: new Date().getFullYear().toString() });
      setEditingSerial(null);
      fetchAllData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const errMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(e => e.msg || e).join(', ') : 'Failed to save serial number');
      toast.error(errMsg);
    }
  };

  const handleDeleteSerial = async (id) => {
    showConfirm(
      'Delete Serial Number Configuration?',
      'Are you sure you want to delete this serial number configuration? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/serial-numbers/${id}`);
          toast.success('Serial number deleted');
          fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // Handle manual transaction submission
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!transactionForm.bank_account_id || !transactionForm.amount) {
      toast.error('Please fill required fields');
      return;
    }

    const selectedBank = bankAccounts.find(b => b.id === transactionForm.bank_account_id);

    showConfirm(
      'Add Transaction?',
      `Are you sure you want to add this ${transactionForm.transaction_type === 'credit' ? 'INFLOW' : 'OUTFLOW'} of ₹${transactionForm.amount}?`,
      async () => {
        try {
          const payload = {
            ...transactionForm,
            bank_name: selectedBank?.bank_name || '',
            amount: parseFloat(transactionForm.amount),
            reference_type: 'manual',
            reference_id: `MANUAL-${Date.now()}`,
            is_manual: true
          };
          await axios.post(`${API}/bank-transactions`, payload);
          toast.success('Transaction added successfully');
          setTransactionDialog(false);
          setTransactionForm({
            bank_account_id: '', transaction_type: 'credit', amount: '',
            payment_mode: 'cash', description: '', party_name: '',
            reference_number: '', transaction_date: new Date().toISOString().split('T')[0],
            purpose_type: 'professional'
          });
          fetchAllData();
        } catch (error) {
          const detail = error.response?.data?.detail;
          const msg = typeof detail === 'string' ? detail :
            Array.isArray(detail) ? detail.map(d => d.msg || d).join(', ') :
              'Failed to add transaction';
          toast.error(msg);
        }
      }
    );
  };

  // Dental Lab handlers
  const handleLabSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLab) {
        await axios.put(`${API}/dental-labs/${editingLab.id}`, labForm);
        toast.success('Lab updated');
      } else {
        await axios.post(`${API}/dental-labs`, labForm);
        toast.success('Lab added');
      }
      setLabDialog(false);
      setLabForm({
        name: '', contact_person: '', phone: '', email: '', address: '', gstin: '',
        bank_name: '', bank_branch: '', bank_account_number: '', bank_ifsc: '', upi_id: ''
      });
      setEditingLab(null);
      fetchAllData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail :
        Array.isArray(detail) ? detail.map(d => d.msg || d).join(', ') :
          'Failed to save lab';
      toast.error(msg);
    }
  };

  const handleDeleteLab = async (id) => {
    showConfirm('Delete Lab?', 'Are you sure you want to delete this dental lab?', async () => {
      try {
        await axios.delete(`${API}/dental-labs/${id}`);
        toast.success('Lab deleted');
        fetchAllData();
      } catch (error) {
        toast.error('Failed to delete lab');
      }
    }, 'destructive');
  };

  // Lab Order handlers
  const handleLabOrderSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...labOrderForm,
        invoice_amount: parseFloat(labOrderForm.invoice_amount) || 0,
        paid_amount: parseFloat(labOrderForm.paid_amount) || 0,
      };

      if (editingLabOrder) {
        await axios.put(`${API}/lab-orders/${editingLabOrder.id}`, payload);
        toast.success('Order updated');
      } else {
        await axios.post(`${API}/lab-orders`, payload);
        toast.success('Lab order created');
      }
      setLabOrderDialog(false);
      setLabOrderForm({
        lab_id: '', patient_id: '', patient_name: '', doctor_id: '', doctor_name: '',
        work_type: 'crown', work_description: '', teeth_numbers: '', shade: '', material: '',
        order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '',
        invoice_number: '', invoice_date: '', invoice_amount: '', paid_amount: '',
        payment_mode: '', notes: ''
      });
      setEditingLabOrder(null);
      fetchAllData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail :
        Array.isArray(detail) ? detail.map(d => d.msg || d).join(', ') :
          'Failed to save order';
      toast.error(msg);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.patch(`${API}/lab-orders/${orderId}/status?status=${status}`);
      toast.success('Status updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteLabOrder = async (id) => {
    showConfirm('Delete Order?', 'Are you sure you want to delete this lab order?', async () => {
      try {
        await axios.delete(`${API}/lab-orders/${id}`);
        toast.success('Order deleted');
        fetchAllData();
      } catch (error) {
        toast.error('Failed to delete order');
      }
    }, 'destructive');
  };

  // Work Type handlers
  const handleWorkTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWorkType) {
        await axios.put(`${API}/lab-work-types/${editingWorkType.id}`, workTypeForm);
        toast.success('Work type updated');
      } else {
        await axios.post(`${API}/lab-work-types`, workTypeForm);
        toast.success('Work type added');
      }
      setWorkTypeDialog(false);
      setWorkTypeForm({ name: '', description: '' });
      setEditingWorkType(null);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save work type');
    }
  };

  const handleDeleteWorkType = async (id) => {
    showConfirm('Delete Work Type?', 'Are you sure you want to delete this work type?', async () => {
      try {
        await axios.delete(`${API}/lab-work-types/${id}`);
        toast.success('Work type deleted');
        fetchAllData();
      } catch (error) {
        toast.error('Failed to delete work type');
      }
    }, 'destructive');
  };

  // Material handlers
  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await axios.put(`${API}/lab-materials/${editingMaterial.id}`, materialForm);
        toast.success('Material updated');
      } else {
        await axios.post(`${API}/lab-materials`, materialForm);
        toast.success('Material added');
      }
      setMaterialDialog(false);
      setMaterialForm({ name: '', description: '' });
      setEditingMaterial(null);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save material');
    }
  };

  const handleDeleteMaterial = async (id) => {
    showConfirm('Delete Material?', 'Are you sure you want to delete this material?', async () => {
      try {
        await axios.delete(`${API}/lab-materials/${id}`);
        toast.success('Material deleted');
        fetchAllData();
      } catch (error) {
        toast.error('Failed to delete material');
      }
    }, 'destructive');
  };

  // Get financial years for dropdown
  const getFinancialYears = () => {
    const currentYear = new Date().getFullYear();
    return [
      `${currentYear - 1}-${currentYear}`,
      `${currentYear}-${currentYear + 1}`,
      `${currentYear + 1}-${currentYear + 2}`
    ];
  };

  const documentTypes = [
    { value: 'invoice', label: 'Invoice' },
    { value: 'voucher', label: 'Voucher' },
    { value: 'estimate', label: 'Estimate' },
    { value: 'temporary_bill', label: 'Temporary Bill' },
    { value: 'return_order', label: 'Return Order' },
    { value: 'transfer', label: 'Stock Transfer' },
  ];

  // Get category/subcategory/item-type names by ID
  const getItemTypeName = (id) => itemTypes.find(t => t.id === id)?.name || '-';
  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '-';
  const getSubcategoryName = (id) => subcategories.find(s => s.id === id)?.name || '-';
  const getUnitName = (id) => itemUnits.find(u => u.id === id)?.name || '-';
  const getBranchName = (id) => branches.find(b => b.id === id)?.name || '-';

  // Filter subcategories by selected category
  const filteredSubcategoriesForItem = subcategories.filter(s => s.category_id === itemForm.category_id);

  // Item Type handlers
  const handleItemTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItemType) {
        await axios.put(`${API}/item-types/${editingItemType.id}`, itemTypeForm);
        toast.success('Item Type updated');
      } else {
        await axios.post(`${API}/item-types`, itemTypeForm);
        toast.success('Item Type added');
      }
      setItemTypeDialog(false);
      setItemTypeForm({ name: '', description: '' });
      setEditingItemType(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save item type');
    }
  };

  const handleDeleteItemType = async (id) => {
    showConfirm(
      'Delete Item Type?',
      'Are you sure you want to delete this item type? This will only work if no categories are linked to it.',
      async () => {
        try {
          await axios.delete(`${API}/item-types/${id}`);
          toast.success('Item Type deleted');
          fetchAllData();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // Patient Bulk Upload handlers
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = (event) => {
      if (isExcel) {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_csv(worksheet);
          setBulkData(csvData);
        } catch (err) {
          toast.error('Failed to parse Excel file');
        }
      } else {
        setBulkData(event.target.result);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkData.trim()) {
      toast.error('Please enter or upload patient data');
      return;
    }

    try {
      const lines = bulkData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

      const fieldMap = {
        'prefix': 'prefix', 'title': 'prefix', 'salutation': 'prefix',
        'patient_id': 'patient_id', 'id': 'patient_id', 'patient id': 'patient_id',
        'name': 'name', 'patient name': 'name',
        'phone': 'phone', 'mobile': 'phone', 'mobile_number': 'phone', 'mobile number': 'phone', 'contact': 'phone',
        'email': 'email', 'dob': 'dob', 'date of birth': 'dob',
        'age': 'age', 'gender': 'gender', 'sex': 'gender',
        'address': 'address', 'branch_id': 'branch_id'
      };

      const patientsToUpload = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const patient = {
          branch_id: user?.branch_id || branches[0]?.id || null,
          address: '',
          prefix: ''
        };

        headers.forEach((header, idx) => {
          const fieldName = fieldMap[header];
          if (fieldName && values[idx]) {
            patient[fieldName] = fieldName === 'age' ? parseInt(values[idx]) || null : values[idx];
          }
        });

        if (patient.patient_id && patient.name && patient.phone && patient.gender) {
          patientsToUpload.push(patient);
        }
      }

      if (patientsToUpload.length === 0) {
        toast.error('No valid patients found. Required: patient_id, name, mobile_number, gender');
        return;
      }

      const response = await axios.post(`${API}/patients/bulk-upload`, patientsToUpload);
      setBulkResults(response.data);

      if (response.data.created > 0) {
        toast.success(`${response.data.created} patients uploaded`);
        fetchAllData();
      }
      if (response.data.errors?.length > 0) {
        toast.warning(`${response.data.errors.length} failed`);
      }
    } catch (error) {
      toast.error('Failed to upload patients');
    }
  };

  const downloadTemplate = () => {
    const template = `prefix,patient_id,name,mobile_number,email,dob,age,gender,address
Mr,PAT001,John Doe,9876543210,john@example.com,1990-05-15,,male,123 Main Street
Mrs,PAT002,Jane Smith,9876543211,jane@example.com,,35,female,456 Oak Avenue`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patients_template.csv';
    a.click();
  };

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone?.includes(patientSearch)
  );

  const modules = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'billing', label: 'Billing' },
    { value: 'purchases', label: 'Purchase Entry' },
    { value: 'expenses', label: 'Expenses' },
    { value: 'banking', label: 'Banking' },
    { value: 'master_data', label: 'Master Data' },
    { value: 'reports', label: 'Reports' },
  ];

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-600 mt-2">Only administrators can access Master Data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="master-data-page">
      <div>
        <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
          Master Data
        </h1>
        <p className="mt-2 text-slate-600">Manage all master configurations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="suppliers"><Truck className="w-4 h-4 mr-1" />Suppliers</TabsTrigger>
          <TabsTrigger value="items"><Package className="w-4 h-4 mr-1" />Items</TabsTrigger>
          <TabsTrigger value="inventory"><Pill className="w-4 h-4 mr-1" />Inventory</TabsTrigger>
          <TabsTrigger value="dental-labs"><Wrench className="w-4 h-4 mr-1" />Lab Invoicing</TabsTrigger>
          <TabsTrigger value="banking"><Building2 className="w-4 h-4 mr-1" />Banking</TabsTrigger>
          <TabsTrigger value="serials"><FileSpreadsheet className="w-4 h-4 mr-1" />Serial Numbers</TabsTrigger>
          <TabsTrigger value="gst"><Percent className="w-4 h-4 mr-1" />GST</TabsTrigger>
          <TabsTrigger value="units"><Ruler className="w-4 h-4 mr-1" />Units</TabsTrigger>
          <TabsTrigger value="permissions"><Shield className="w-4 h-4 mr-1" />Permissions</TabsTrigger>
        </TabsList>


        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Suppliers ({suppliers.length})</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search suppliers..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Dialog open={supplierDialog} onOpenChange={(o) => { setSupplierDialog(o); if (!o) { setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '', gstin: '', bank_name: '', bank_branch: '', bank_account_number: '', bank_ifsc: '', gpay_number: '', upi_id: '' }); setEditingSupplier(null); } }}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingSupplier ? 'Edit' : 'Add'} Supplier</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSupplierSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Company Name *</Label>
                          <Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Contact Person</Label>
                          <Input value={supplierForm.contact_person} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Phone *</Label>
                          <Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>GSTIN</Label>
                          <Input value={supplierForm.gstin} onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value.toUpperCase() })} placeholder="e.g., 27AAAAA0000A1Z5" />
                        </div>
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Input value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
                        </div>
                      </div>

                      {/* Bank Details Section */}
                      <div className="border-t pt-4 mt-2">
                        <h4 className="font-semibold text-slate-700 mb-3">Bank Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input value={supplierForm.bank_name} onChange={(e) => setSupplierForm({ ...supplierForm, bank_name: e.target.value })} placeholder="e.g., HDFC Bank" />
                          </div>
                          <div className="space-y-2">
                            <Label>Branch</Label>
                            <Input value={supplierForm.bank_branch} onChange={(e) => setSupplierForm({ ...supplierForm, bank_branch: e.target.value })} placeholder="e.g., Chennai Main Branch" />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input value={supplierForm.bank_account_number} onChange={(e) => setSupplierForm({ ...supplierForm, bank_account_number: e.target.value })} placeholder="e.g., 1234567890" />
                          </div>
                          <div className="space-y-2">
                            <Label>IFSC Code</Label>
                            <Input value={supplierForm.bank_ifsc} onChange={(e) => setSupplierForm({ ...supplierForm, bank_ifsc: e.target.value.toUpperCase() })} placeholder="e.g., HDFC0001234" />
                          </div>
                        </div>
                      </div>

                      {/* UPI/GPay Section */}
                      <div className="border-t pt-4 mt-2">
                        <h4 className="font-semibold text-slate-700 mb-3">UPI / GPay Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>GPay Number</Label>
                            <Input value={supplierForm.gpay_number} onChange={(e) => setSupplierForm({ ...supplierForm, gpay_number: e.target.value })} placeholder="e.g., 9876543210" />
                          </div>
                          <div className="space-y-2">
                            <Label>UPI ID</Label>
                            <Input value={supplierForm.upi_id} onChange={(e) => setSupplierForm({ ...supplierForm, upi_id: e.target.value })} placeholder="e.g., supplier@upi" />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setSupplierDialog(false)}>Cancel</Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{editingSupplier ? 'Update' : 'Add'}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2 px-3 text-sm font-medium">Company</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Contact</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Phone</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">GSTIN</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Bank / UPI</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers
                      .filter(s => !supplierSearch ||
                        s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                        s.contact_person?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                        s.phone?.includes(supplierSearch) ||
                        s.gstin?.toLowerCase().includes(supplierSearch.toLowerCase())
                      )
                      .map((s) => (
                        <tr key={s.id} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium">{s.name}</td>
                          <td className="py-2 px-3">{s.contact_person || '-'}</td>
                          <td className="py-2 px-3">{s.phone}</td>
                          <td className="py-2 px-3 font-mono text-xs">{s.gstin || '-'}</td>
                          <td className="py-2 px-3 text-xs">
                            {s.bank_name && <p>{s.bank_name} - {s.bank_account_number}</p>}
                            {s.gpay_number && <p className="text-emerald-600">GPay: {s.gpay_number}</p>}
                            {s.upi_id && <p className="text-blue-600">UPI: {s.upi_id}</p>}
                            {!s.bank_name && !s.gpay_number && !s.upi_id && '-'}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => { setEditingSupplier(s); setSupplierForm({ ...s, bank_name: s.bank_name || '', bank_branch: s.bank_branch || '', bank_account_number: s.bank_account_number || '', bank_ifsc: s.bank_ifsc || '', gpay_number: s.gpay_number || '', upi_id: s.upi_id || '' }); setSupplierDialog(true); }}><Edit className="w-3 h-3" /></Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteSupplier(s.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Item Categories ({categories.length})</CardTitle>
              <Dialog open={categoryDialog} onOpenChange={(o) => { setCategoryDialog(o); if (!o) { setCategoryForm({ name: '', description: '' }); setEditingCategory(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Category</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle></DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Item Type *</Label>
                      <Select value={categoryForm.item_type_id} onValueChange={(v) => setCategoryForm({ ...categoryForm, item_type_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {itemTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setCategoryDialog(false)}>Cancel</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingCategory ? 'Update' : 'Add'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {categories.map((c) => (
                  <div key={c.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.description && <p className="text-sm text-slate-500">{c.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => { setEditingCategory(c); setCategoryForm(c); setCategoryDialog(true); }}><Edit className="w-3 h-3" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteCategory(c.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subcategories */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Subcategories ({subcategories.length})</h3>
                  <Dialog open={subcategoryDialog} onOpenChange={(o) => { setSubcategoryDialog(o); if (!o) { setSubcategoryForm({ category_id: '', name: '', description: '' }); setEditingSubcategory(null); } }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Subcategory</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{editingSubcategory ? 'Edit' : 'Add'} Subcategory</DialogTitle></DialogHeader>
                      <form onSubmit={handleSubcategorySubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Parent Category *</Label>
                          <Select value={subcategoryForm.category_id} onValueChange={(v) => setSubcategoryForm({ ...subcategoryForm, category_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input value={subcategoryForm.name} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })} required />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setSubcategoryDialog(false)}>Cancel</Button>
                          <Button type="submit">{editingSubcategory ? 'Update' : 'Add'}</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {subcategories.map((s) => (
                    <div key={s.id} className="p-3 border rounded flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-slate-500">{getCategoryName(s.category_id)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingSubcategory(s); setSubcategoryForm(s); setSubcategoryDialog(true); }}><Edit className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSubcategory(s.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Serial Numbers Tab */}
        <TabsContent value="serials">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Serial Number Configuration ({serialNumbers.length})</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Configure starting serial numbers for each branch and document type</p>
              </div>
              <Dialog open={serialDialog} onOpenChange={(o) => { setSerialDialog(o); if (!o) { setSerialForm({ branch_id: '', document_type: 'invoice', prefix: '', starting_number: '1', current_number: '1', financial_year: new Date().getFullYear().toString() }); setEditingSerial(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Add Serial Config</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingSerial ? 'Edit' : 'Add'} Serial Number Configuration</DialogTitle>
                    <DialogDescription>Set starting serial numbers for documents per branch/godown and financial year</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSerialSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Select value={serialForm.branch_id || "none"} onValueChange={(v) => setSerialForm({ ...serialForm, branch_id: v === "none" ? "" : v, godown_id: "" })}>
                          <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Godown</Label>
                        <Select value={serialForm.godown_id || "none"} onValueChange={(v) => setSerialForm({ ...serialForm, godown_id: v === "none" ? "" : v, branch_id: "" })}>
                          <SelectTrigger><SelectValue placeholder="Select godown" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {godowns.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Select either Branch or Godown for this serial configuration</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Document Type *</Label>
                        <Select value={serialForm.document_type} onValueChange={(v) => setSerialForm({ ...serialForm, document_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {documentTypes.map((dt) => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Financial Year *</Label>
                        <Select value={serialForm.financial_year} onValueChange={(v) => setSerialForm({ ...serialForm, financial_year: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {getFinancialYears().map((fy) => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prefix</Label>
                        <Input
                          value={serialForm.prefix}
                          onChange={(e) => setSerialForm({ ...serialForm, prefix: e.target.value.toUpperCase() })}
                          placeholder="e.g., INV, VCH"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Starting Number *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={serialForm.starting_number}
                          onChange={(e) => setSerialForm({ ...serialForm, starting_number: e.target.value, current_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Number</Label>
                        <Input
                          type="number"
                          min="1"
                          value={serialForm.current_number}
                          onChange={(e) => setSerialForm({ ...serialForm, current_number: e.target.value })}
                        />
                        <p className="text-xs text-slate-500">Next number to be used</p>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">Preview: <strong>{serialForm.prefix}{serialForm.current_number || serialForm.starting_number}</strong></p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setSerialDialog(false)}>Cancel</Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{editingSerial ? 'Update' : 'Add'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2 px-3 text-sm font-medium">Branch</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Document Type</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Financial Year</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Prefix</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Starting</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Current</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Preview</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serialNumbers.map((sn) => (
                      <tr key={sn.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium">{getBranchName(sn.branch_id)}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                            {documentTypes.find(d => d.value === sn.document_type)?.label || sn.document_type}
                          </span>
                        </td>
                        <td className="py-2 px-3">{sn.financial_year}</td>
                        <td className="py-2 px-3 font-mono">{sn.prefix || '-'}</td>
                        <td className="py-2 px-3 text-center">{sn.starting_number}</td>
                        <td className="py-2 px-3 text-center font-semibold text-emerald-600">{sn.current_number}</td>
                        <td className="py-2 px-3 font-mono text-sm">{sn.prefix}{sn.current_number}</td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditingSerial(sn);
                              setSerialForm({
                                branch_id: sn.branch_id || '',
                                document_type: sn.document_type || 'invoice',
                                prefix: sn.prefix || '',
                                starting_number: (sn.starting_number || 1).toString(),
                                current_number: (sn.current_number || 1).toString(),
                                financial_year: sn.financial_year || new Date().getFullYear().toString()
                              });
                              setSerialDialog(true);
                            }}><Edit className="w-3 h-3" /></Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteSerial(sn.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {serialNumbers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No serial number configurations. Add one for each branch and document type.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Tab */}
        <TabsContent value="gst">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>GST Slabs ({gstSlabs.length})</CardTitle>
              <Dialog open={gstDialog} onOpenChange={(o) => { setGstDialog(o); if (!o) { setGstForm({ name: '', percentage: '' }); setEditingGst(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 mr-2" />Add GST Slab</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingGst ? 'Edit' : 'Add'} GST Slab</DialogTitle></DialogHeader>
                  <form onSubmit={handleGstSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={gstForm.name} onChange={(e) => setGstForm({ ...gstForm, name: e.target.value })} placeholder="Standard GST" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Percentage *</Label>
                      <Input type="number" step="0.01" value={gstForm.percentage} onChange={(e) => setGstForm({ ...gstForm, percentage: e.target.value })} placeholder="18" required />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setGstDialog(false)}>Cancel</Button>
                      <Button type="submit" className="bg-amber-600 hover:bg-amber-700">{editingGst ? 'Update' : 'Add'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {gstSlabs.map((g) => (
                  <div key={g.id} className="p-4 border rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-600">{g.percentage}%</p>
                    <p className="text-sm text-slate-600">{g.name}</p>
                    <div className="flex justify-center gap-1 mt-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingGst(g); setGstForm(g); setGstDialog(true); }}><Edit className="w-3 h-3" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteGst(g.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Item Units ({itemUnits.length})</CardTitle>
              <Dialog open={unitDialog} onOpenChange={(o) => { setUnitDialog(o); if (!o) { setUnitForm({ name: '', abbreviation: '' }); setEditingUnit(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-2" />Add Unit</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingUnit ? 'Edit' : 'Add'} Unit</DialogTitle></DialogHeader>
                  <form onSubmit={handleUnitSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Unit Name *</Label>
                      <Input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="Tablets" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Abbreviation *</Label>
                      <Input value={unitForm.abbreviation} onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })} placeholder="TAB" required />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setUnitDialog(false)}>Cancel</Button>
                      <Button type="submit" className="bg-purple-600 hover:bg-purple-700">{editingUnit ? 'Update' : 'Add'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {itemUnits.map((u) => (
                  <div key={u.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.abbreviation}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingUnit(u); setUnitForm(u); setUnitDialog(true); }}><Edit className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUnit(u.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab - Item Type > Category > Subcategory > Item Name */}
        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">Item Master ({itemMaster.length})
                  <Select value={activeItemTypeId} onValueChange={setActiveItemTypeId}>
                    <SelectTrigger className="w-44 h-8 text-sm font-normal">
                      <SelectValue placeholder="All Item Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">Manage items with Item Types → Category → Subcategory → Item name</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={itemTypeDialog} onOpenChange={(o) => { setItemTypeDialog(o); if (!o) { setItemTypeForm({ name: '', description: '' }); setEditingItemType(null); } }}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><Plus className="w-4 h-4 mr-1" />Item Type</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingItemType ? 'Edit' : 'Add'} Item Type</DialogTitle></DialogHeader>
                    <form onSubmit={handleItemTypeSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input value={itemTypeForm.name} onChange={(e) => setItemTypeForm({ ...itemTypeForm, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={itemTypeForm.description} onChange={(e) => setItemTypeForm({ ...itemTypeForm, description: e.target.value })} rows={2} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setItemTypeDialog(false)}>Cancel</Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{editingItemType ? 'Update' : 'Add'}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={categoryDialog} onOpenChange={(o) => { setCategoryDialog(o); if (!o) { setCategoryForm({ name: '', description: '', item_type_id: '' }); setEditingCategory(null); } else { if (!editingCategory) setCategoryForm(prev => ({ ...prev, item_type_id: activeItemTypeId })); } }}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><Plus className="w-4 h-4 mr-1" />Category</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle></DialogHeader>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Item Type *</Label>
                        <Select value={categoryForm.item_type_id} onValueChange={(v) => setCategoryForm({ ...categoryForm, item_type_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {itemTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} rows={2} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setCategoryDialog(false)}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingCategory ? 'Update' : 'Add'}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={subcategoryDialog} onOpenChange={(o) => { setSubcategoryDialog(o); if (!o) { setSubcategoryForm({ category_id: '', name: '', description: '' }); setEditingSubcategory(null); } }}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><Plus className="w-4 h-4 mr-1" />Subcategory</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingSubcategory ? 'Edit' : 'Add'} Subcategory</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubcategorySubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select value={subcategoryForm.category_id} onValueChange={(v) => setSubcategoryForm({ ...subcategoryForm, category_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input value={subcategoryForm.name} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={subcategoryForm.description} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })} rows={2} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setSubcategoryDialog(false)}>Cancel</Button>
                        <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{editingSubcategory ? 'Update' : 'Add'}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <ItemModal
                  open={itemDialog}
                  onOpenChange={setItemDialog}
                  initialData={{ item_type_id: activeItemTypeId }}
                  editingItem={editingItem}
                  itemTypes={itemTypes}
                  categories={categories}
                  subcategories={subcategories}
                  itemUnits={itemUnits}
                  gstSlabs={gstSlabs}
                  onSuccess={handleItemSuccess}
                />
              </div>
            </CardHeader>
            <CardContent>
              {/* Item Type / Category / Subcategory Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h4 className="font-medium text-indigo-800 mb-2">Item Types ({itemTypes.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {itemTypes.map(t => (
                      <span key={t.id} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm flex items-center gap-1">
                        {t.name}
                        <button onClick={() => { setEditingItemType(t); setItemTypeForm(t); setItemTypeDialog(true); }} className="hover:text-indigo-900"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteItemType(t.id)} className="hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Categories ({categories.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <span key={c.id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm flex items-center gap-1">
                        {c.name}
                        <button onClick={() => { setEditingCategory(c); setCategoryForm(c); setCategoryDialog(true); }} className="hover:text-blue-900"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteCategory(c.id)} className="hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg">
                  <h4 className="font-medium text-teal-800 mb-2">Subcategories ({subcategories.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {subcategories.map(s => (
                      <span key={s.id} className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-sm flex items-center gap-1">
                        {getCategoryName(s.category_id)} <ChevronRight className="w-3 h-3" /> {s.name}
                        <button onClick={() => { setEditingSubcategory(s); setSubcategoryForm(s); setSubcategoryDialog(true); }} className="hover:text-teal-900"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteSubcategory(s.id)} className="hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium">Item Name</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Item Type</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Category</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Subcategory</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Unit</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Charges</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Duration</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">GST</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">HSN</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Purpose</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Low Stock</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Expiry</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemMaster.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium">{item.name}</td>
                        <td className="py-2 px-3">{getItemTypeName(item.item_type_id)}</td>
                        <td className="py-2 px-3">{item.category || getCategoryName(item.category_id)}</td>
                        <td className="py-2 px-3">{item.subcategory || getSubcategoryName(item.subcategory_id) || '-'}</td>
                        <td className="py-2 px-3">{item.unit || getUnitName(item.unit_id) || '-'}</td>
                        <td className="py-2 px-3">{item.charges ? `₹${item.charges}` : (item.mrp ? `₹${item.mrp}` : '-')}</td>
                        <td className="py-2 px-3">{item.duration_minutes ? `${item.duration_minutes}m` : '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${item.gst_percentage === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                            {item.gst_percentage || 0}%
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-sm">{item.hsn_code || '-'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${item.purpose === 'for_sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.purpose === 'for_sale' ? 'For Sale' : 'Internal'}
                          </span>
                          {item.item_status === 'INACTIVE' && <span className="ml-2 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Inactive</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.low_stock_warning_enabled ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">
                              ⚠ ≤{item.low_stock_threshold ?? 0}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.expiry_tracking_enabled ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">
                              Tracked
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditingItem(item);
                              setItemDialog(true);
                            }}><Edit className="w-3 h-3" /></Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <InventoryTab
            user={user}
            inventoryItems={inventoryItems}
            branches={branches}
            godowns={godowns}
            categories={categories}
            itemUnits={itemUnits}
            suppliers={suppliers}
            onRefresh={fetchAllData}
          />
        </TabsContent>


        {/* Dental Labs Tab */}
        <TabsContent value="dental-labs">
          <div className="space-y-6">
            {/* Labs Management Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Dental Labs ({dentalLabs.length})</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Manage dental laboratories and their details</p>
                </div>
                <Dialog open={labDialog} onOpenChange={(o) => { setLabDialog(o); if (!o) { setLabForm({ name: '', contact_person: '', phone: '', email: '', address: '', gstin: '', bank_name: '', bank_branch: '', bank_account_number: '', bank_ifsc: '', upi_id: '' }); setEditingLab(null); } }}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Add Lab</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingLab ? 'Edit' : 'Add'} Dental Lab</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleLabSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Lab Name *</Label>
                          <Input value={labForm.name} onChange={(e) => setLabForm({ ...labForm, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Contact Person</Label>
                          <Input value={labForm.contact_person} onChange={(e) => setLabForm({ ...labForm, contact_person: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone *</Label>
                          <Input value={labForm.phone} onChange={(e) => setLabForm({ ...labForm, phone: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" value={labForm.email} onChange={(e) => setLabForm({ ...labForm, email: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={labForm.address} onChange={(e) => setLabForm({ ...labForm, address: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>GSTIN</Label>
                        <Input value={labForm.gstin} onChange={(e) => setLabForm({ ...labForm, gstin: e.target.value.toUpperCase() })} />
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Bank Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input value={labForm.bank_name} onChange={(e) => setLabForm({ ...labForm, bank_name: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Branch</Label>
                            <Input value={labForm.bank_branch} onChange={(e) => setLabForm({ ...labForm, bank_branch: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input value={labForm.bank_account_number} onChange={(e) => setLabForm({ ...labForm, bank_account_number: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>IFSC Code</Label>
                            <Input value={labForm.bank_ifsc} onChange={(e) => setLabForm({ ...labForm, bank_ifsc: e.target.value.toUpperCase() })} />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <Label>UPI ID</Label>
                            <Input value={labForm.upi_id} onChange={(e) => setLabForm({ ...labForm, upi_id: e.target.value })} placeholder="e.g., lab@upi" />
                          </div>
                        </div>
                      </div>
                      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">{editingLab ? 'Update' : 'Add'} Lab</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left py-2 px-3">Lab Name</th>
                        <th className="text-left py-2 px-3">Contact</th>
                        <th className="text-left py-2 px-3">Phone</th>
                        <th className="text-left py-2 px-3">Bank Details</th>
                        <th className="text-right py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dentalLabs.map((lab) => (
                        <tr key={lab.id} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium">{lab.name}</td>
                          <td className="py-2 px-3">{lab.contact_person || '-'}</td>
                          <td className="py-2 px-3">{lab.phone}</td>
                          <td className="py-2 px-3 text-xs">
                            {lab.bank_name ? `${lab.bank_name} - ${lab.bank_account_number?.slice(-4)}` : '-'}
                            {lab.upi_id && <span className="text-blue-600 ml-2">UPI: {lab.upi_id}</span>}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => { setEditingLab(lab); setLabForm({ ...lab }); setLabDialog(true); }}><Edit className="w-3 h-3" /></Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteLab(lab.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dentalLabs.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Wrench className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No dental labs added yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Work Types Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Work Types ({labWorkTypes.length})</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Manage lab work types (Crown, Bridge, etc.)</p>
                </div>
                <Dialog open={workTypeDialog} onOpenChange={(o) => { setWorkTypeDialog(o); if (!o) { setWorkTypeForm({ name: '', description: '' }); setEditingWorkType(null); } }}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Add Work Type</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingWorkType ? 'Edit' : 'Add'} Work Type</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleWorkTypeSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input value={workTypeForm.name} onChange={(e) => setWorkTypeForm({ ...workTypeForm, name: e.target.value })} placeholder="e.g., Crown, Bridge" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={workTypeForm.description} onChange={(e) => setWorkTypeForm({ ...workTypeForm, description: e.target.value })} placeholder="Optional description" />
                      </div>
                      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">{editingWorkType ? 'Update' : 'Add'} Work Type</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[250px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left py-2 px-3">Name</th>
                        <th className="text-left py-2 px-3">Description</th>
                        <th className="text-right py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labWorkTypes.map((wt) => (
                        <tr key={wt.id} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium">{wt.name}</td>
                          <td className="py-2 px-3 text-slate-500">{wt.description || '-'}</td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => { setEditingWorkType(wt); setWorkTypeForm({ name: wt.name, description: wt.description || '' }); setWorkTypeDialog(true); }}><Edit className="w-3 h-3" /></Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteWorkType(wt.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {labWorkTypes.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Wrench className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No work types added yet</p>
                      <p className="text-sm">Add work types like Crown, Bridge, Denture, etc.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Materials Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Materials ({labMaterials.length})</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Manage lab materials (Zirconia, PFM, etc.)</p>
                </div>
                <Dialog open={materialDialog} onOpenChange={(o) => { setMaterialDialog(o); if (!o) { setMaterialForm({ name: '', description: '' }); setEditingMaterial(null); } }}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Add Material</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMaterial ? 'Edit' : 'Add'} Material</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleMaterialSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} placeholder="e.g., Zirconia, PFM, Acrylic" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} placeholder="Optional description" />
                      </div>
                      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">{editingMaterial ? 'Update' : 'Add'} Material</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[250px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left py-2 px-3">Name</th>
                        <th className="text-left py-2 px-3">Description</th>
                        <th className="text-right py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labMaterials.map((mat) => (
                        <tr key={mat.id} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium">{mat.name}</td>
                          <td className="py-2 px-3 text-slate-500">{mat.description || '-'}</td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => { setEditingMaterial(mat); setMaterialForm({ name: mat.name, description: mat.description || '' }); setMaterialDialog(true); }}><Edit className="w-3 h-3" /></Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteMaterial(mat.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {labMaterials.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Wrench className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No materials added yet</p>
                      <p className="text-sm">Add materials like Zirconia, PFM, Acrylic, etc.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lab Orders Card - Invoicing & Payments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lab Invoicing & Payments ({labOrders.length})</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Manage invoices and payments for lab orders</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={labOrderFilter}
                    onChange={(e) => setLabOrderFilter(e.target.value)}
                    className="w-[150px] h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    aria-label="Filter orders"
                  >
                    <option value="all">All Orders</option>
                    <option value="ordered">Ordered</option>
                    <option value="in_progress">In Progress</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <Dialog open={labOrderDialog} onOpenChange={(o) => { setLabOrderDialog(o); if (!o) { setLabOrderForm({ lab_id: '', patient_id: '', patient_name: '', doctor_id: '', doctor_name: '', work_type: '', work_description: '', teeth_numbers: '', shade: '', material: '', order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '', invoice_number: '', invoice_date: '', invoice_amount: '', paid_amount: '', payment_mode: '', notes: '' }); setEditingLabOrder(null); } }}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />New Order</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingLabOrder ? 'Edit' : 'New'} Lab Order</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleLabOrderSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="md_lab_id">Dental Lab *</Label>
                            <select
                              id="md_lab_id"
                              value={labOrderForm.lab_id}
                              onChange={(e) => { const lab = dentalLabs.find(l => l.id === e.target.value); setLabOrderForm({ ...labOrderForm, lab_id: e.target.value, lab_name: lab?.name || '' }); }}
                              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              required
                              aria-label="Select dental lab"
                            >
                              <option value="">Select lab</option>
                              {dentalLabs.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="md_work_type">Work Type *</Label>
                            <select
                              id="md_work_type"
                              value={labOrderForm.work_type}
                              onChange={(e) => setLabOrderForm({ ...labOrderForm, work_type: e.target.value })}
                              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              required
                              aria-label="Select work type"
                            >
                              <option value="">Select work type</option>
                              {labWorkTypes.map(wt => <option key={wt.id} value={wt.name}>{wt.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="md_patient_name">Patient Name</Label>
                            <Input id="md_patient_name" value={labOrderForm.patient_name} onChange={(e) => setLabOrderForm({ ...labOrderForm, patient_name: e.target.value })} placeholder="Patient name" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="md_doctor_name">Doctor Name</Label>
                            <Input id="md_doctor_name" value={labOrderForm.doctor_name} onChange={(e) => setLabOrderForm({ ...labOrderForm, doctor_name: e.target.value })} placeholder="Doctor name" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="md_teeth_numbers">Teeth Numbers</Label>
                            <Input id="md_teeth_numbers" value={labOrderForm.teeth_numbers} onChange={(e) => setLabOrderForm({ ...labOrderForm, teeth_numbers: e.target.value })} placeholder="e.g., 11, 12, 21" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="md_shade">Shade</Label>
                            <Input id="md_shade" value={labOrderForm.shade} onChange={(e) => setLabOrderForm({ ...labOrderForm, shade: e.target.value })} placeholder="e.g., A2, B1" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="md_material">Material</Label>
                            <select
                              id="md_material"
                              value={labOrderForm.material}
                              onChange={(e) => setLabOrderForm({ ...labOrderForm, material: e.target.value })}
                              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              aria-label="Select material"
                            >
                              <option value="">Select material</option>
                              {labMaterials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="md_work_description">Work Description</Label>
                          <Input id="md_work_description" value={labOrderForm.work_description} onChange={(e) => setLabOrderForm({ ...labOrderForm, work_description: e.target.value })} placeholder="Detailed work description" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="md_order_date">Order Date *</Label>
                            <Input id="md_order_date" type="date" value={labOrderForm.order_date} onChange={(e) => setLabOrderForm({ ...labOrderForm, order_date: e.target.value })} required />
                          </div>
                          <div className="space-y-2">
                            <Label>Expected Delivery</Label>
                            <Input type="date" value={labOrderForm.expected_delivery_date} onChange={(e) => setLabOrderForm({ ...labOrderForm, expected_delivery_date: e.target.value })} />
                          </div>
                        </div>
                        <div className="border-t pt-4">
                          <h4 className="font-semibold mb-3">Invoice & Payment</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Invoice Number</Label>
                              <Input value={labOrderForm.invoice_number} onChange={(e) => setLabOrderForm({ ...labOrderForm, invoice_number: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Invoice Date</Label>
                              <Input type="date" value={labOrderForm.invoice_date} onChange={(e) => setLabOrderForm({ ...labOrderForm, invoice_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Invoice Amount (₹)</Label>
                              <Input type="number" value={labOrderForm.invoice_amount} onChange={(e) => setLabOrderForm({ ...labOrderForm, invoice_amount: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="md_paid_amount">Paid Amount (₹)</Label>
                              <Input id="md_paid_amount" type="number" value={labOrderForm.paid_amount} onChange={(e) => setLabOrderForm({ ...labOrderForm, paid_amount: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="md_payment_mode">Payment Mode</Label>
                              <select
                                id="md_payment_mode"
                                value={labOrderForm.payment_mode}
                                onChange={(e) => setLabOrderForm({ ...labOrderForm, payment_mode: e.target.value })}
                                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                aria-label="Select payment mode"
                              >
                                <option value="">Select mode</option>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="md_notes">Notes</Label>
                          <Input id="md_notes" value={labOrderForm.notes} onChange={(e) => setLabOrderForm({ ...labOrderForm, notes: e.target.value })} placeholder="Additional notes" />
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">{editingLabOrder ? 'Update' : 'Create'} Order</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600">Ordered</p>
                    <p className="text-xl font-bold text-blue-700">{labOrders.filter(o => o.status === 'ordered').length}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-600">In Progress</p>
                    <p className="text-xl font-bold text-amber-700">{labOrders.filter(o => o.status === 'in_progress').length}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-xs text-emerald-600">Ready</p>
                    <p className="text-xl font-bold text-emerald-700">{labOrders.filter(o => o.status === 'ready').length}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-600">Pending Payment</p>
                    <p className="text-xl font-bold text-purple-700">₹{labOrders.filter(o => o.payment_status !== 'paid').reduce((sum, o) => sum + ((o.invoice_amount || 0) - (o.paid_amount || 0)), 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left py-2 px-3">Order #</th>
                        <th className="text-left py-2 px-3">Lab</th>
                        <th className="text-left py-2 px-3">Patient</th>
                        <th className="text-left py-2 px-3">Work Type</th>
                        <th className="text-left py-2 px-3">Dates</th>
                        <th className="text-center py-2 px-3">Status</th>
                        <th className="text-right py-2 px-3">Amount</th>
                        <th className="text-right py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labOrders.filter(o => labOrderFilter === 'all' || o.status === labOrderFilter).map((order) => (
                        <tr key={order.id} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-xs">{order.order_number}</td>
                          <td className="py-2 px-3 font-medium">{order.lab_name}</td>
                          <td className="py-2 px-3">{order.patient_name || '-'}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{order.work_type}</span>
                            {order.teeth_numbers && <span className="text-xs text-slate-500 ml-1">({order.teeth_numbers})</span>}
                          </td>
                          <td className="py-2 px-3 text-xs">
                            <p>📅 {new Date(order.order_date).toLocaleDateString('en-IN')}</p>
                            {order.expected_delivery_date && <p className="text-slate-500">🎯 {new Date(order.expected_delivery_date).toLocaleDateString('en-IN')}</p>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Select value={order.status} onValueChange={(v) => handleUpdateOrderStatus(order.id, v)}>
                              <SelectTrigger className={`h-7 text-xs ${order.status === 'delivered' ? 'bg-emerald-100' : order.status === 'ready' ? 'bg-blue-100' : order.status === 'in_progress' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ordered">Ordered</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="ready">Ready</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 px-3 text-right text-xs">
                            <p className="font-medium">₹{(order.invoice_amount || 0).toLocaleString('en-IN')}</p>
                            <p className={order.payment_status === 'paid' ? 'text-emerald-600' : order.payment_status === 'partial' ? 'text-amber-600' : 'text-red-600'}>
                              {order.payment_status === 'paid' ? '✓ Paid' : `Due: ₹${((order.invoice_amount || 0) - (order.paid_amount || 0)).toLocaleString('en-IN')}`}
                            </p>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => { setEditingLabOrder(order); setLabOrderForm({ ...order, invoice_amount: order.invoice_amount?.toString() || '', paid_amount: order.paid_amount?.toString() || '' }); setLabOrderDialog(true); }}><Edit className="w-3 h-3" /></Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteLabOrder(order.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {labOrders.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No lab orders yet</p>
                      <p className="text-sm">Create your first lab order to start tracking</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Banking Tab */}
        <TabsContent value="banking">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bank Accounts ({bankAccounts.length})</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Manage bank accounts, UPI IDs, and cards</p>
              </div>
              <Dialog open={bankDialog} onOpenChange={(o) => { setBankDialog(o); if (!o) { setBankForm({ bank_name: '', account_number: '', ifsc_code: '', account_holder: '', account_type: 'savings', opening_balance: 0, upi_ids: '' }); setEditingBank(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />Add Bank Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingBank ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const data = {
                        ...bankForm,
                        opening_balance: parseFloat(bankForm.opening_balance) || 0,
                        upi_ids: bankForm.upi_ids ? bankForm.upi_ids.split(',').map(u => u.trim()).filter(u => u) : []
                      };
                      if (editingBank) {
                        await axios.put(`${API}/bank-accounts/${editingBank.id}`, data);
                        toast.success('Bank account updated');
                      } else {
                        await axios.post(`${API}/bank-accounts`, data);
                        toast.success('Bank account added');
                      }
                      setBankDialog(false);
                      setBankForm({ bank_name: '', account_number: '', ifsc_code: '', account_holder: '', account_type: 'savings', opening_balance: 0, upi_ids: '' });
                      setEditingBank(null);
                      fetchAllData();
                    } catch (error) {
                      const detail = error.response?.data?.detail;
                      const msg = typeof detail === 'string' ? detail :
                        Array.isArray(detail) ? detail.map(d => d.msg || d).join(', ') :
                          'Failed to save bank account';
                      toast.error(msg);
                    }
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bank Name *</Label>
                        <Input value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input value={bankForm.account_holder} onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number *</Label>
                        <Input value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>IFSC Code</Label>
                        <Input value={bankForm.ifsc_code} onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Type</Label>
                        <Select value={bankForm.account_type} onValueChange={(v) => setBankForm({ ...bankForm, account_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="current">Current</SelectItem>
                            <SelectItem value="overdraft">Overdraft</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Opening Balance (₹)</Label>
                        <Input type="number" value={bankForm.opening_balance} onChange={(e) => setBankForm({ ...bankForm, opening_balance: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>UPI IDs (comma separated)</Label>
                      <Input
                        value={bankForm.upi_ids}
                        onChange={(e) => setBankForm({ ...bankForm, upi_ids: e.target.value })}
                        placeholder="e.g., clinic@upi, 9876543210@paytm"
                      />
                      <p className="text-xs text-slate-500">Enter multiple UPI IDs separated by commas</p>
                    </div>
                    <Button type="submit" className="w-full">{editingBank ? 'Update' : 'Add'} Bank Account</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium">Bank Name</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Account Details</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">UPI IDs</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Balance</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankAccounts.map((bank) => (
                      <tr key={bank.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <p className="font-medium">{bank.bank_name}</p>
                          <p className="text-xs text-slate-500 capitalize">{bank.account_type} Account</p>
                        </td>
                        <td className="py-2 px-3">
                          <p className="text-sm">{bank.account_number}</p>
                          {bank.ifsc_code && <p className="text-xs text-slate-500">IFSC: {bank.ifsc_code}</p>}
                          {bank.account_holder && <p className="text-xs text-slate-500">{bank.account_holder}</p>}
                        </td>
                        <td className="py-2 px-3">
                          {(bank.upi_ids || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(bank.upi_ids || []).map((upi, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center">
                                  <Smartphone className="w-3 h-3 mr-1" />{upi}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">No UPI IDs</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                          ₹{((bank.current_balance || bank.opening_balance || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditingBank(bank);
                              setBankForm({
                                bank_name: bank.bank_name,
                                account_number: bank.account_number,
                                ifsc_code: bank.ifsc_code || '',
                                account_holder: bank.account_holder || '',
                                account_type: bank.account_type || 'savings',
                                opening_balance: bank.opening_balance || 0,
                                upi_ids: (bank.upi_ids || []).join(', ')
                              });
                              setBankDialog(true);
                            }}><Edit className="w-3 h-3" /></Button>
                            <Button variant="destructive" size="sm" onClick={() => {
                              showConfirm(
                                'Delete Bank Account?',
                                'Are you sure you want to delete this bank account? This action cannot be undone.',
                                async () => {
                                  try {
                                    await axios.delete(`${API}/bank-accounts/${bank.id}`);
                                    toast.success('Bank account deleted');
                                    fetchAllData();
                                  } catch (error) {
                                    toast.error('Failed to delete bank account');
                                  }
                                },
                                'destructive'
                              );
                            }}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bankAccounts.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No bank accounts added yet</p>
                    <p className="text-sm">Add bank accounts to track payments</p>
                  </div>
                )}
              </div>

              {/* Transactions Section */}
              <div className="mt-8 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Money Inflow/Outflow</h3>
                    <p className="text-sm text-slate-500">Track all money movements - automatic and manual entries</p>
                  </div>
                  <Dialog open={transactionDialog} onOpenChange={(o) => {
                    setTransactionDialog(o);
                    if (!o) setTransactionForm({
                      bank_account_id: '', transaction_type: 'credit', amount: '',
                      payment_mode: 'cash', description: '', party_name: '',
                      reference_number: '', transaction_date: new Date().toISOString().split('T')[0],
                      purpose_type: 'professional'
                    });
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />Add Transaction
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Manual Transaction</DialogTitle>
                        <DialogDescription>Record money inflow or outflow manually</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleTransactionSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Type *</Label>
                            <Select value={transactionForm.transaction_type} onValueChange={(v) => setTransactionForm({ ...transactionForm, transaction_type: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="credit">💰 Money In (Credit)</SelectItem>
                                <SelectItem value="debit">💸 Money Out (Debit)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Purpose *</Label>
                            <Select value={transactionForm.purpose_type} onValueChange={(v) => setTransactionForm({ ...transactionForm, purpose_type: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="professional">🏢 Professional (P&L)</SelectItem>
                                <SelectItem value="personal">👤 Personal (Non-P&L)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Amount (₹) *</Label>
                            <Input
                              type="number"
                              value={transactionForm.amount}
                              onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                              placeholder="Enter amount"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Bank/Cash Account *</Label>
                            <Select value={transactionForm.bank_account_id} onValueChange={(v) => setTransactionForm({ ...transactionForm, bank_account_id: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">💵 Cash</SelectItem>
                                {bankAccounts.map(b => (
                                  <SelectItem key={b.id} value={b.id}>🏦 {b.bank_name} - {b.account_number?.slice(-4)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Select value={transactionForm.payment_mode} onValueChange={(v) => setTransactionForm({ ...transactionForm, payment_mode: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="netbanking">Net Banking</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="cheque">Cheque</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={transactionForm.transaction_date}
                              onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Reference No.</Label>
                            <Input
                              value={transactionForm.reference_number}
                              onChange={(e) => setTransactionForm({ ...transactionForm, reference_number: e.target.value })}
                              placeholder="Cheque/UTR/Receipt No."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Party Name / Source</Label>
                            <Input
                              value={transactionForm.party_name}
                              onChange={(e) => setTransactionForm({ ...transactionForm, party_name: e.target.value })}
                              placeholder="e.g., Supplier name, Patient name, Owner"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description / Purpose</Label>
                          <Input
                            value={transactionForm.description}
                            onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                            placeholder="e.g., Payment for supplies, Rent, Salary, Owner withdrawal"
                          />
                        </div>
                        <Button type="submit" className={`w-full ${transactionForm.transaction_type === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                          {transactionForm.transaction_type === 'credit' ? '💰 Add Inflow' : '💸 Add Outflow'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Transaction Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-600">Total Inflow</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      ₹{bankTransactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600">Total Outflow</p>
                    <p className="text-2xl font-bold text-red-700">
                      ₹{bankTransactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600">Net Balance</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ₹{(
                        bankTransactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + (t.amount || 0), 0) -
                        bankTransactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + (t.amount || 0), 0)
                      ).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-auto max-h-[400px] border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-left py-2 px-3">Type</th>
                        <th className="text-center py-2 px-3">Purpose</th>
                        <th className="text-left py-2 px-3">Account</th>
                        <th className="text-left py-2 px-3">Party/Source</th>
                        <th className="text-left py-2 px-3">Description</th>
                        <th className="text-right py-2 px-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankTransactions.slice().sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)).map((txn) => (
                        <tr key={txn.id} className={`border-b hover:bg-slate-50 ${txn.transaction_type === 'credit' ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                          <td className="py-2 px-3">{new Date(txn.transaction_date).toLocaleDateString('en-IN')}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${txn.transaction_type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {txn.transaction_type === 'credit' ? '↓ IN' : '↑ OUT'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${txn.purpose_type === 'personal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {txn.purpose_type === 'personal' ? '👤 Personal' : '🏢 Prof'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <p className="font-medium">{txn.bank_name || 'Cash'}</p>
                            <p className="text-xs text-slate-500">{txn.payment_mode}</p>
                          </td>
                          <td className="py-2 px-3">{txn.party_name || '-'}</td>
                          <td className="py-2 px-3 max-w-[200px] truncate">{txn.description}</td>
                          <td className={`py-2 px-3 text-right font-semibold ${txn.transaction_type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {txn.transaction_type === 'credit' ? '+' : '-'}₹{(txn.amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bankTransactions.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <p>No transactions yet</p>
                      <p className="text-sm">Add manual transactions or they will appear automatically from sales/purchases</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle>User Permissions</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Define module access for each user</p>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={permissionForm.user_id} onValueChange={(v) => {
                    const selectedUser = allUsers.find(u => u.id === v);
                    setPermissionForm({ ...permissionForm, user_id: v, user_name: selectedUser?.full_name || '' });
                    // Load existing permissions for this user
                    const existingPerms = userPermissions.filter(p => p.user_id === v);
                    if (existingPerms.length > 0) {
                      // Build permissions map from existing
                      const permsMap = {};
                      existingPerms.forEach(p => {
                        permsMap[p.module] = {
                          can_view: p.can_view,
                          can_add: p.can_add,
                          can_edit: p.can_edit,
                          can_delete: p.can_delete,
                          date_restriction: p.date_restriction || 'all',
                          id: p.id
                        };
                      });
                      setModulePermissions(permsMap);
                    } else {
                      // Reset to defaults
                      const defaultPerms = {};
                      modules.forEach(m => {
                        defaultPerms[m.value] = { can_view: false, can_add: false, can_edit: false, can_delete: false, date_restriction: 'all' };
                      });
                      setModulePermissions(defaultPerms);
                    }
                    setShowPermissionPanel(true);
                  }}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {allUsers.filter(u => u.role !== 'admin').map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {permissionForm.user_id && (
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => setShowPermissionPanel(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />Add Permission
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Permission Panel - Shows when user is selected */}
              {showPermissionPanel && permissionForm.user_id && (
                <div className="mb-6 border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">
                      Permissions for: {permissionForm.user_name || allUsers.find(u => u.id === permissionForm.user_id)?.full_name}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowPermissionPanel(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-white">
                          <th className="text-left py-3 px-4 text-sm font-medium w-40">Module</th>
                          <th className="text-center py-3 px-4 text-sm font-medium">View</th>
                          <th className="text-center py-3 px-4 text-sm font-medium">Add</th>
                          <th className="text-center py-3 px-4 text-sm font-medium">Edit</th>
                          <th className="text-center py-3 px-4 text-sm font-medium">Delete</th>
                          <th className="text-center py-3 px-4 text-sm font-medium w-32">Date Restriction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((m) => (
                          <tr key={m.value} className="border-b hover:bg-white">
                            <td className="py-3 px-4 font-medium">{m.label}</td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-indigo-600"
                                checked={modulePermissions[m.value]?.can_view || false}
                                onChange={(e) => setModulePermissions({
                                  ...modulePermissions,
                                  [m.value]: { ...modulePermissions[m.value], can_view: e.target.checked }
                                })}
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-indigo-600"
                                checked={modulePermissions[m.value]?.can_add || false}
                                onChange={(e) => setModulePermissions({
                                  ...modulePermissions,
                                  [m.value]: { ...modulePermissions[m.value], can_add: e.target.checked }
                                })}
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-indigo-600"
                                checked={modulePermissions[m.value]?.can_edit || false}
                                onChange={(e) => setModulePermissions({
                                  ...modulePermissions,
                                  [m.value]: { ...modulePermissions[m.value], can_edit: e.target.checked }
                                })}
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-indigo-600"
                                checked={modulePermissions[m.value]?.can_delete || false}
                                onChange={(e) => setModulePermissions({
                                  ...modulePermissions,
                                  [m.value]: { ...modulePermissions[m.value], can_delete: e.target.checked }
                                })}
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Select
                                value={modulePermissions[m.value]?.date_restriction || 'all'}
                                onValueChange={(v) => setModulePermissions({
                                  ...modulePermissions,
                                  [m.value]: { ...modulePermissions[m.value], date_restriction: v }
                                })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Time</SelectItem>
                                  <SelectItem value="today">Today Only</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => {
                      setShowPermissionPanel(false);
                      setPermissionForm({ user_id: '', user_name: '', module: '', can_view: true, can_add: false, can_edit: false, can_delete: false, date_restriction: 'all' });
                      setShowCopyPermissions(false);
                      setCopyToUsers([]);
                    }}>Cancel</Button>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={async () => {
                        try {
                          const selectedUser = allUsers.find(u => u.id === permissionForm.user_id);
                          // Save each module permission
                          for (const m of modules) {
                            const perm = modulePermissions[m.value];
                            if (perm && (perm.can_view || perm.can_add || perm.can_edit || perm.can_delete)) {
                              const payload = {
                                user_id: permissionForm.user_id,
                                user_name: selectedUser?.full_name || '',
                                module: m.value,
                                can_view: perm.can_view || false,
                                can_add: perm.can_add || false,
                                can_edit: perm.can_edit || false,
                                can_delete: perm.can_delete || false,
                                date_restriction: perm.date_restriction || 'all'
                              };

                              if (perm.id) {
                                // Update existing
                                await axios.put(`${API}/user-permissions/${perm.id}`, payload);
                              } else {
                                // Check if permission already exists for this user+module
                                const existing = userPermissions.find(p => p.user_id === permissionForm.user_id && p.module === m.value);
                                if (existing) {
                                  await axios.put(`${API}/user-permissions/${existing.id}`, payload);
                                } else {
                                  await axios.post(`${API}/user-permissions`, payload);
                                }
                              }
                            } else if (perm?.id || userPermissions.find(p => p.user_id === permissionForm.user_id && p.module === m.value)) {
                              // Delete permission if all unchecked
                              const existingId = perm?.id || userPermissions.find(p => p.user_id === permissionForm.user_id && p.module === m.value)?.id;
                              if (existingId) {
                                await axios.delete(`${API}/user-permissions/${existingId}`);
                              }
                            }
                          }
                          toast.success('Permissions updated successfully');
                          fetchAllData();
                        } catch (error) {
                          toast.error('Failed to update permissions');
                        }
                      }}
                    >
                      Update Permissions
                    </Button>
                  </div>

                  {/* Copy Permissions Section */}
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowCopyPermissions(!showCopyPermissions)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Copy above permissions to other users
                      <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${showCopyPermissions ? 'rotate-90' : ''}`} />
                    </Button>

                    {showCopyPermissions && (
                      <div className="mt-3 p-3 border rounded-lg bg-white">
                        <Label className="text-sm font-medium mb-2 block">Select users to apply these permissions:</Label>
                        <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                          {allUsers.filter(u => u.role !== 'admin' && u.id !== permissionForm.user_id).map((u) => (
                            <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-indigo-600"
                                checked={copyToUsers.includes(u.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCopyToUsers([...copyToUsers, u.id]);
                                  } else {
                                    setCopyToUsers(copyToUsers.filter(id => id !== u.id));
                                  }
                                }}
                              />
                              <span className="text-sm">{u.full_name}</span>
                              <span className="text-xs text-gray-500">({u.role})</span>
                            </label>
                          ))}
                        </div>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          disabled={copyToUsers.length === 0}
                          onClick={async () => {
                            try {
                              for (const targetUserId of copyToUsers) {
                                const targetUser = allUsers.find(u => u.id === targetUserId);
                                for (const m of modules) {
                                  const perm = modulePermissions[m.value];
                                  if (perm && (perm.can_view || perm.can_add || perm.can_edit || perm.can_delete)) {
                                    const payload = {
                                      user_id: targetUserId,
                                      user_name: targetUser?.full_name || '',
                                      module: m.value,
                                      can_view: perm.can_view || false,
                                      can_add: perm.can_add || false,
                                      can_edit: perm.can_edit || false,
                                      can_delete: perm.can_delete || false,
                                      date_restriction: perm.date_restriction || 'all'
                                    };

                                    // Check if permission already exists for this user+module
                                    const existing = userPermissions.find(p => p.user_id === targetUserId && p.module === m.value);
                                    if (existing) {
                                      await axios.put(`${API}/user-permissions/${existing.id}`, payload);
                                    } else {
                                      await axios.post(`${API}/user-permissions`, payload);
                                    }
                                  }
                                }
                              }
                              toast.success(`Permissions copied to ${copyToUsers.length} user(s)`);
                              setShowCopyPermissions(false);
                              setCopyToUsers([]);
                              fetchAllData();
                            } catch (error) {
                              toast.error('Failed to copy permissions');
                            }
                          }}
                        >
                          Apply to {copyToUsers.length} selected user(s)
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Existing Permissions Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2 px-3 text-sm font-medium">User</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Module</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">View</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Add</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Edit</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Delete</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Date</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userPermissions.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium">{p.user_name}</td>
                        <td className="py-2 px-3 capitalize">{p.module?.replace('_', ' ')}</td>
                        <td className="py-2 px-3 text-center">{p.can_view ? '✓' : '-'}</td>
                        <td className="py-2 px-3 text-center">{p.can_add ? '✓' : '-'}</td>
                        <td className="py-2 px-3 text-center">{p.can_edit ? '✓' : '-'}</td>
                        <td className="py-2 px-3 text-center">{p.can_delete ? '✓' : '-'}</td>
                        <td className="py-2 px-3 text-center text-xs">{p.date_restriction || 'all'}</td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="destructive" size="sm" onClick={() => handleDeletePermission(p.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          setConfirmDialog({ ...confirmDialog, open: false });
        }}
        variant={confirmDialog.variant}
      />
    </div>
  );
};

export default MasterData;
