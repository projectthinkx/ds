import React, { useState, useRef } from 'react';
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
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit, Search, Upload, Download,
  FileSpreadsheet, CheckCircle, AlertCircle,
  Pill, Box, RotateCcw, MinusCircle,
  Building2, Warehouse, Filter
} from 'lucide-react';

const InventoryTab = ({
  user,
  inventoryItems,
  branches,
  godowns,
  categories,
  itemUnits,
  suppliers,
  onRefresh
}) => {
  // Dialog states
  const [inventoryDialog, setInventoryDialog] = useState(false);
  const [invBulkDialog, setInvBulkDialog] = useState(false);
  const [returnDialog, setReturnDialog] = useState(false);
  const [stockAdjustDialog, setStockAdjustDialog] = useState(false);

  // Edit states
  const [editingInventory, setEditingInventory] = useState(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

  // Form states
  const [inventoryForm, setInventoryForm] = useState({
    name: '', category: '', subcategory: '', unit: '',
    purchase_price: '', sales_price: '', stock_quantity: '',
    min_stock_level: '10', batch_number: '', expiry_date: '',
    gst_percentage: '0', hsn_code: '', purpose: 'for_sale',
    manufacturer: '', branch_id: '', godown_id: '',
    item_status: 'ACTIVE', discontinued_reason: ''
  });

  const [returnForm, setReturnForm] = useState({
    supplier_id: '', quantity: '', reason: '', return_date: new Date().toISOString().split('T')[0]
  });

  const [stockAdjustForm, setStockAdjustForm] = useState({
    adjustment_type: 'reduce', quantity: '', reason: ''
  });

  // Bulk upload states
  const [invBulkData, setInvBulkData] = useState('');
  const [invBulkResults, setInvBulkResults] = useState(null);
  const invFileInputRef = useRef(null);

  // Filter states
  const [invSelectedGodowns, setInvSelectedGodowns] = useState([]);
  const [invSelectedBranches, setInvSelectedBranches] = useState([]);
  const [invAppliedGodowns, setInvAppliedGodowns] = useState([]);
  const [invAppliedBranches, setInvAppliedBranches] = useState([]);
  const [invSearchTerm, setInvSearchTerm] = useState('');

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false, title: '', description: '', onConfirm: null, variant: 'default'
  });

  const showConfirm = (title, description, onConfirm, variant = 'default') => {
    setConfirmDialog({ open: true, title, description, onConfirm, variant });
  };

  const isAdmin = user?.role === 'admin';

  // Helper functions
  const getBranchName = (branchId) => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || '-';
  };

  const getGodownName = (godownId) => {
    if (!godownId) return '-';
    const godown = godowns.find(g => g.id === godownId);
    return godown?.name || '-';
  };

  // Filter helpers
  const toggleInvGodown = (godownId) => {
    setInvSelectedGodowns(prev =>
      prev.includes(godownId)
        ? prev.filter(id => id !== godownId)
        : [...prev, godownId]
    );
  };

  const toggleInvBranch = (branchId) => {
    setInvSelectedBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleInvShowFilters = () => {
    setInvAppliedGodowns([...invSelectedGodowns]);
    setInvAppliedBranches([...invSelectedBranches]);
  };

  // Filtered inventory items
  const filteredInventoryItems = inventoryItems.filter(item => {
    const matchesSearch = !invSearchTerm ||
      item.name?.toLowerCase().includes(invSearchTerm.toLowerCase()) ||
      item.batch_number?.toLowerCase().includes(invSearchTerm.toLowerCase()) ||
      item.manufacturer?.toLowerCase().includes(invSearchTerm.toLowerCase());

    if (!isAdmin) {
      return matchesSearch && item.branch_id === user?.branch_id;
    }

    if (invAppliedGodowns.length === 0 && invAppliedBranches.length === 0) {
      return matchesSearch;
    }

    const godownMatch = invAppliedGodowns.includes(item.godown_id);
    const branchMatch = invAppliedBranches.includes(item.branch_id);

    return matchesSearch && (godownMatch || branchMatch);
  });

  // Handlers
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
        item_status: inventoryForm.item_status || 'ACTIVE',
        discontinued_reason: inventoryForm.item_status === 'INACTIVE' ? inventoryForm.discontinued_reason : null
      };

      if (editingInventory) {
        await axios.put(`${API}/medicines/${editingInventory.id}`, payload);
        toast.success('Inventory item updated');
      } else {
        await axios.post(`${API}/medicines`, payload);
        toast.success('Inventory item added');
      }
      setInventoryDialog(false);
      resetInventoryForm();
      setEditingInventory(null);
      onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save inventory item');
    }
  };

  const resetInventoryForm = () => {
    setInventoryForm({
      name: '', category: '', subcategory: '', unit: '',
      purchase_price: '', sales_price: '', stock_quantity: '',
      min_stock_level: '10', batch_number: '', expiry_date: '',
      gst_percentage: '0', hsn_code: '', purpose: 'for_sale',
      manufacturer: '', branch_id: '', godown_id: '',
      item_status: 'ACTIVE', discontinued_reason: ''
    });
  };

  const handleDeleteInventory = async (id) => {
    showConfirm(
      'Delete Inventory Item?',
      'Are you sure you want to delete this inventory item? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/medicines/${id}`);
          toast.success('Inventory item deleted');
          onRefresh();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete');
        }
      },
      'destructive'
    );
  };

  // Return entry handler
  const handleReturnEntry = async () => {
    if (!selectedInventoryItem || !returnForm.quantity) {
      toast.error('Please enter return quantity');
      return;
    }
    try {
      const returnQty = parseInt(returnForm.quantity);
      const currentStock = selectedInventoryItem.stock_quantity || 0;

      if (returnQty > currentStock) {
        toast.error('Return quantity cannot exceed current stock');
        return;
      }

      await axios.put(`${API}/medicines/${selectedInventoryItem.id}`, {
        ...selectedInventoryItem,
        stock_quantity: currentStock - returnQty
      });

      toast.success(`Returned ${returnQty} units of ${selectedInventoryItem.name} to supplier`);
      setReturnDialog(false);
      setReturnForm({ supplier_id: '', quantity: '', reason: '', return_date: new Date().toISOString().split('T')[0] });
      setSelectedInventoryItem(null);
      onRefresh();
    } catch (error) {
      toast.error('Failed to process return');
    }
  };

  // Stock adjustment handler
  const handleStockAdjustment = async () => {
    if (!selectedInventoryItem || !stockAdjustForm.quantity || !stockAdjustForm.reason) {
      toast.error('Please enter quantity and reason');
      return;
    }
    try {
      const adjustQty = parseInt(stockAdjustForm.quantity);
      const currentStock = selectedInventoryItem.stock_quantity || 0;
      let newStock;

      if (stockAdjustForm.adjustment_type === 'reduce') {
        if (adjustQty > currentStock) {
          toast.error('Cannot reduce below zero');
          return;
        }
        newStock = currentStock - adjustQty;
      } else {
        newStock = currentStock + adjustQty;
      }

      await axios.put(`${API}/medicines/${selectedInventoryItem.id}`, {
        ...selectedInventoryItem,
        stock_quantity: newStock
      });
      toast.success(`Stock adjusted: ${selectedInventoryItem.name} - ${stockAdjustForm.reason}`);
      setStockAdjustDialog(false);
      setStockAdjustForm({ adjustment_type: 'reduce', quantity: '', reason: '' });
      setSelectedInventoryItem(null);
      onRefresh();
    } catch (error) {
      toast.error('Failed to adjust stock');
    }
  };

  // Bulk upload handlers
  const handleInvFileUpload = (e) => {
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
          setInvBulkData(csvData);
        } catch (err) {
          toast.error('Failed to parse Excel file');
        }
      } else {
        setInvBulkData(event.target.result);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleInvBulkUpload = async () => {
    if (!invBulkData.trim()) {
      toast.error('Please enter or upload inventory data');
      return;
    }

    try {
      const lines = invBulkData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

      const fieldMap = {
        'name': 'name', 'item name': 'name', 'item_name': 'name',
        'manufacturer': 'manufacturer', 'mfr': 'manufacturer',
        'category': 'category', 'cat': 'category',
        'subcategory': 'subcategory', 'sub_category': 'subcategory',
        'unit': 'unit',
        'purchase_price': 'purchase_price', 'purchase price': 'purchase_price',
        'sales_price': 'unit_price', 'sales price': 'unit_price', 'mrp': 'unit_price',
        'stock': 'stock_quantity', 'stock_quantity': 'stock_quantity', 'qty': 'stock_quantity',
        'min_stock': 'min_stock_level', 'min_stock_level': 'min_stock_level',
        'batch': 'batch_number', 'batch_number': 'batch_number',
        'expiry': 'expiry_date', 'expiry_date': 'expiry_date',
        'gst': 'gst_percentage', 'gst_percentage': 'gst_percentage',
        'hsn': 'hsn_code', 'hsn_code': 'hsn_code',
        'purpose': 'purpose'
      };

      const itemsToUpload = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const item = {
          name: '', category: 'General', unit_price: 0,
          stock_quantity: 0, min_stock_level: 10, gst_percentage: 0, purpose: 'for_sale'
        };

        headers.forEach((header, idx) => {
          const fieldName = fieldMap[header];
          if (fieldName && values[idx]) {
            if (['purchase_price', 'unit_price', 'gst_percentage'].includes(fieldName)) {
              item[fieldName] = parseFloat(values[idx]) || 0;
            } else if (['stock_quantity', 'min_stock_level'].includes(fieldName)) {
              item[fieldName] = parseInt(values[idx]) || 0;
            } else if (fieldName === 'purpose') {
              item[fieldName] = values[idx].toLowerCase().includes('internal') ? 'internal_use' : 'for_sale';
            } else {
              item[fieldName] = values[idx];
            }
          }
        });

        if (item.name) {
          itemsToUpload.push(item);
        }
      }

      if (itemsToUpload.length === 0) {
        toast.error('No valid items found. Required: name');
        return;
      }

      const response = await axios.post(`${API}/medicines/bulk-upload`, itemsToUpload);
      setInvBulkResults(response.data);

      if (response.data.created > 0) {
        toast.success(`${response.data.created} inventory items uploaded`);
        onRefresh();
      }
      if (response.data.errors?.length > 0) {
        toast.warning(`${response.data.errors.length} failed`);
      }
    } catch (error) {
      toast.error('Failed to upload inventory items');
    }
  };

  const downloadInvTemplate = () => {
    const template = `name,manufacturer,category,subcategory,unit,purchase_price,sales_price,stock_quantity,min_stock,batch_number,expiry_date,gst_percentage,hsn_code,purpose
Paracetamol 500mg,Sun Pharma,Medicines,Tablets,TAB,2.50,5.00,100,20,BATCH001,2025-12-31,12,30049099,for_sale
Dental Gloves,MedPro,Consumables,Safety,BOX,150.00,200.00,50,10,GL2024,2026-06-30,18,40151100,internal_use`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_template.csv';
    a.click();
  };

  const openEditDialog = (item) => {
    setEditingInventory(item);
    setInventoryForm({
      name: item.name || '',
      category: item.category || '',
      subcategory: item.subcategory || '',
      unit: item.unit || '',
      purchase_price: (item.purchase_price || '').toString(),
      sales_price: (item.unit_price || item.mrp || '').toString(),
      stock_quantity: (item.stock_quantity || '').toString(),
      min_stock_level: (item.min_stock_level || 10).toString(),
      batch_number: item.batch_number || '',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
      gst_percentage: (item.gst_percentage || 0).toString(),
      hsn_code: item.hsn_code || '',
      purpose: item.purpose || 'for_sale',
      manufacturer: item.manufacturer || '',
      branch_id: item.branch_id || '',
      godown_id: item.godown_id || '',
      item_status: item.item_status || 'ACTIVE',
      discontinued_reason: item.discontinued_reason || ''
    });
    setInventoryDialog(true);
  };

  return (
    <>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventory ({inventoryItems.length})</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Directly enter pharmacy items (for sale) and other items (internal use)</p>
          </div>
          <div className="flex gap-2">
            {/* Bulk Upload Dialog */}
            <Dialog open={invBulkDialog} onOpenChange={(o) => { setInvBulkDialog(o); if (!o) { setInvBulkData(''); setInvBulkResults(null); } }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                  <Upload className="w-4 h-4 mr-2" />Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Inventory Items</DialogTitle>
                  <DialogDescription>Upload from CSV/Excel or paste data</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input ref={invFileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleInvFileUpload} className="hidden" />
                    <Button variant="outline" onClick={() => invFileInputRef.current?.click()}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Choose File
                    </Button>
                    <Button variant="outline" onClick={downloadInvTemplate}>
                      <Download className="w-4 h-4 mr-2" />Download Template
                    </Button>
                  </div>
                  <Textarea
                    value={invBulkData}
                    onChange={(e) => setInvBulkData(e.target.value)}
                    placeholder="name,manufacturer,category,sales_price,stock_quantity..."
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <div className="p-3 bg-blue-50 rounded text-sm text-blue-700">
                    <strong>Required:</strong> name | <strong>Optional:</strong> manufacturer, category, subcategory, unit, purchase_price, sales_price, stock_quantity, min_stock, batch_number, expiry_date, gst_percentage, hsn_code, purpose
                  </div>
                  {invBulkResults && (
                    <div className="p-3 border rounded">
                      <div className="flex gap-4">
                        <span className="text-emerald-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1" />{invBulkResults.created} created</span>
                        {invBulkResults.errors?.length > 0 && <span className="text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{invBulkResults.errors.length} failed</span>}
                      </div>
                      {invBulkResults.errors?.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 max-h-24 overflow-y-auto">
                          {invBulkResults.errors.map((err, idx) => (
                            <p key={idx}>Row {err.row}: {err.name} - {err.error}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setInvBulkDialog(false)}>Cancel</Button>
                    <Button onClick={handleInvBulkUpload} className="bg-emerald-600 hover:bg-emerald-700">Upload</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Single Item Dialog */}
            <Dialog open={inventoryDialog} onOpenChange={(o) => { setInventoryDialog(o); if (!o) { resetInventoryForm(); setEditingInventory(null); } }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Add Inventory Item</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingInventory ? 'Edit' : 'Add'} Inventory Item</DialogTitle>
                  <DialogDescription>Add pharmacy items or internal use items directly</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInventorySubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Item Name *</Label>
                      <Input value={inventoryForm.name} onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Manufacturer</Label>
                      <Input value={inventoryForm.manufacturer} onChange={(e) => setInventoryForm({ ...inventoryForm, manufacturer: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select value={inventoryForm.category} onValueChange={(v) => setInventoryForm({ ...inventoryForm, category: v })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="Medicines">Medicines</SelectItem>
                          <SelectItem value="Consumables">Consumables</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategory</Label>
                      <Input value={inventoryForm.subcategory} onChange={(e) => setInventoryForm({ ...inventoryForm, subcategory: e.target.value })} placeholder="e.g., Antibiotics" />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit *</Label>
                      <Select value={inventoryForm.unit} onValueChange={(v) => setInventoryForm({ ...inventoryForm, unit: v })}>
                        <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                        <SelectContent>
                          {itemUnits.map((u) => <SelectItem key={u.id} value={u.abbreviation}>{u.name} ({u.abbreviation})</SelectItem>)}
                          <SelectItem value="PCS">Pieces (PCS)</SelectItem>
                          <SelectItem value="TAB">Tablets (TAB)</SelectItem>
                          <SelectItem value="CAP">Capsules (CAP)</SelectItem>
                          <SelectItem value="BOX">Box (BOX)</SelectItem>
                          <SelectItem value="BTL">Bottle (BTL)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Price (₹)</Label>
                      <Input type="number" step="0.01" value={inventoryForm.purchase_price} onChange={(e) => setInventoryForm({ ...inventoryForm, purchase_price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Sales Price / MRP (₹)</Label>
                      <Input type="number" step="0.01" value={inventoryForm.sales_price} onChange={(e) => setInventoryForm({ ...inventoryForm, sales_price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Stock Quantity *</Label>
                      <Input type="number" value={inventoryForm.stock_quantity} onChange={(e) => setInventoryForm({ ...inventoryForm, stock_quantity: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Min Stock Level</Label>
                      <Input type="number" value={inventoryForm.min_stock_level} onChange={(e) => setInventoryForm({ ...inventoryForm, min_stock_level: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Batch Number</Label>
                      <Input value={inventoryForm.batch_number} onChange={(e) => setInventoryForm({ ...inventoryForm, batch_number: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input type="date" value={inventoryForm.expiry_date} onChange={(e) => setInventoryForm({ ...inventoryForm, expiry_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>GST</Label>
                      <Select value={inventoryForm.gst_percentage} onValueChange={(v) => setInventoryForm({ ...inventoryForm, gst_percentage: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No GST (0%)</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                          <SelectItem value="28">28%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>HSN Code</Label>
                      <Input value={inventoryForm.hsn_code} onChange={(e) => setInventoryForm({ ...inventoryForm, hsn_code: e.target.value })} placeholder="e.g., 30049099" />
                    </div>
                    <div className="space-y-2">
                      <Label>Purpose *</Label>
                      <Select value={inventoryForm.purpose} onValueChange={(v) => setInventoryForm({ ...inventoryForm, purpose: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="for_sale">For Sale (Pharmacy)</SelectItem>
                          <SelectItem value="internal_use">Internal Use Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Select value={inventoryForm.branch_id || "none"} onValueChange={(v) => setInventoryForm({ ...inventoryForm, branch_id: v === "none" ? "" : v, godown_id: "" })}>
                        <SelectTrigger><SelectValue placeholder="Select branch (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Godown</Label>
                      <Select value={inventoryForm.godown_id || "none"} onValueChange={(v) => setInventoryForm({ ...inventoryForm, godown_id: v === "none" ? "" : v, branch_id: "" })}>
                        <SelectTrigger><SelectValue placeholder="Select godown (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {godowns.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Item Status *</Label>
                      <Select value={inventoryForm.item_status} onValueChange={(v) => setInventoryForm({ ...inventoryForm, item_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {inventoryForm.item_status === 'INACTIVE' && (
                      <div className="space-y-2">
                        <Label>Reason for Discontinuation</Label>
                        <Input value={inventoryForm.discontinued_reason} onChange={(e) => setInventoryForm({ ...inventoryForm, discontinued_reason: e.target.value })} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Note: Select either Branch or Godown (not both)</p>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setInventoryDialog(false)}>Cancel</Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{editingInventory ? 'Update' : 'Add'} Item</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Section */}
          {isAdmin && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Filters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {godowns.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Warehouse className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-slate-600">Godowns</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {godowns.map((godown) => (
                        <label key={godown.id} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border hover:bg-amber-50">
                          <input
                            type="checkbox"
                            checked={invSelectedGodowns.includes(godown.id)}
                            onChange={() => toggleInvGodown(godown.id)}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-sm text-slate-600">{godown.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {branches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-600">Branches</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {branches.map((branch) => (
                        <label key={branch.id} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border hover:bg-blue-50">
                          <input
                            type="checkbox"
                            checked={invSelectedBranches.includes(branch.id)}
                            onChange={() => toggleInvBranch(branch.id)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-600">{branch.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button onClick={handleInvShowFilters} className="bg-emerald-600 hover:bg-emerald-700">Show</Button>
                {(invAppliedGodowns.length > 0 || invAppliedBranches.length > 0) && (
                  <>
                    <Button variant="outline" onClick={() => {
                      setInvSelectedGodowns([]);
                      setInvSelectedBranches([]);
                      setInvAppliedGodowns([]);
                      setInvAppliedBranches([]);
                    }}>Clear Filters</Button>
                    <span className="text-sm text-slate-500">
                      Showing items from {invAppliedGodowns.length} godown(s) and {invAppliedBranches.length} branch(es)
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, batch, manufacturer..."
                value={invSearchTerm}
                onChange={(e) => setInvSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600">For Sale Items</p>
                  <p className="text-2xl font-bold text-emerald-700">{filteredInventoryItems.filter(i => i.purpose === 'for_sale' || !i.purpose).length}</p>
                </div>
                <Pill className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Internal Use Items</p>
                  <p className="text-2xl font-bold text-purple-700">{filteredInventoryItems.filter(i => i.purpose === 'internal_use').length}</p>
                </div>
                <Box className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600">Low Stock Alerts</p>
                  <p className="text-2xl font-bold text-amber-700">{filteredInventoryItems.filter(i => (i.stock_quantity || 0) <= (i.min_stock_level || 10)).length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium">Item Name</th>
                  <th className="text-left py-2 px-3 text-sm font-medium">Category</th>
                  <th className="text-right py-2 px-3 text-sm font-medium">Purchase ₹</th>
                  <th className="text-right py-2 px-3 text-sm font-medium">Sales ₹</th>
                  <th className="text-center py-2 px-3 text-sm font-medium">Stock</th>
                  <th className="text-center py-2 px-3 text-sm font-medium">GST</th>
                  <th className="text-left py-2 px-3 text-sm font-medium">Purpose</th>
                  <th className="text-left py-2 px-3 text-sm font-medium">Location</th>
                  <th className="text-left py-2 px-3 text-sm font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventoryItems.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-slate-500">
                      {invSearchTerm || invAppliedGodowns.length > 0 || invAppliedBranches.length > 0
                        ? 'No items match your filters'
                        : 'No inventory items found'}
                    </td>
                  </tr>
                ) : (
                  filteredInventoryItems.map((item) => (
                    <tr key={item.id} className={`border-b hover:bg-slate-50 ${(item.stock_quantity || 0) <= (item.min_stock_level || 10) ? 'bg-red-50' : ''}`}>
                      <td className="py-2 px-3">
                        <p className="font-medium">{item.name}</p>
                        {item.manufacturer && <p className="text-xs text-slate-500">{item.manufacturer}</p>}
                      </td>
                      <td className="py-2 px-3">
                        <p className="text-sm">{item.category || '-'}</p>
                        {item.subcategory && <p className="text-xs text-slate-500">{item.subcategory}</p>}
                      </td>
                      <td className="py-2 px-3 text-right">₹{(item.purchase_price || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-600">₹{(item.unit_price || item.mrp || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-sm font-medium ${(item.stock_quantity || 0) <= (item.min_stock_level || 10) ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>
                          {item.stock_quantity || 0}
                        </span>
                        {(item.stock_quantity || 0) <= (item.min_stock_level || 10) && (
                          <span className="ml-1 text-xs text-red-600 font-semibold">⚠ Low</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${(item.gst_percentage || 0) === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                          {item.gst_percentage || 0}%
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${item.purpose === 'internal_use' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.purpose === 'internal_use' ? 'Internal' : 'For Sale'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500">
                        {item.branch_id ? getBranchName(item.branch_id) : (item.godown_id ? getGodownName(item.godown_id) : '-')}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {item.item_status === 'INACTIVE' ? <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">Inactive</span> : <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Active</span>}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" title="Return to Supplier" onClick={() => { setSelectedInventoryItem(item); setReturnDialog(true); }}>
                            <RotateCcw className="w-3 h-3 text-blue-600" />
                          </Button>
                          <Button variant="outline" size="sm" title="Adjust Stock" onClick={() => { setSelectedInventoryItem(item); setStockAdjustDialog(true); }}>
                            <MinusCircle className="w-3 h-3 text-amber-600" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteInventory(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Return Entry Dialog */}
          <Dialog open={returnDialog} onOpenChange={(o) => { setReturnDialog(o); if (!o) { setReturnForm({ supplier_id: '', quantity: '', reason: '', return_date: new Date().toISOString().split('T')[0] }); setSelectedInventoryItem(null); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <RotateCcw className="w-5 h-5 mr-2 text-blue-600" />
                  Return to Supplier
                </DialogTitle>
                <DialogDescription>Return items back to the supplier</DialogDescription>
              </DialogHeader>
              {selectedInventoryItem && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium">{selectedInventoryItem.name}</p>
                    <p className="text-sm text-slate-500">Current Stock: {selectedInventoryItem.stock_quantity || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Select value={returnForm.supplier_id} onValueChange={(v) => setReturnForm({ ...returnForm, supplier_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Return Quantity *</Label>
                      <Input type="number" value={returnForm.quantity} onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })} max={selectedInventoryItem.stock_quantity} />
                    </div>
                    <div className="space-y-2">
                      <Label>Return Date</Label>
                      <Input type="date" value={returnForm.return_date} onChange={(e) => setReturnForm({ ...returnForm, return_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })} placeholder="e.g., Expired, Damaged" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setReturnDialog(false)}>Cancel</Button>
                    <Button onClick={handleReturnEntry} className="bg-blue-600 hover:bg-blue-700">Process Return</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Stock Adjustment Dialog */}
          <Dialog open={stockAdjustDialog} onOpenChange={(o) => { setStockAdjustDialog(o); if (!o) { setStockAdjustForm({ adjustment_type: 'reduce', quantity: '', reason: '' }); setSelectedInventoryItem(null); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <MinusCircle className="w-5 h-5 mr-2 text-amber-600" />
                  Stock Adjustment
                </DialogTitle>
                <DialogDescription>Adjust stock for damage, loss, or corrections</DialogDescription>
              </DialogHeader>
              {selectedInventoryItem && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium">{selectedInventoryItem.name}</p>
                    <p className="text-sm text-slate-500">Current Stock: {selectedInventoryItem.stock_quantity || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Adjustment Type</Label>
                    <Select value={stockAdjustForm.adjustment_type} onValueChange={(v) => setStockAdjustForm({ ...stockAdjustForm, adjustment_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reduce">Reduce Stock</SelectItem>
                        <SelectItem value="increase">Increase Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input type="number" value={stockAdjustForm.quantity} onChange={(e) => setStockAdjustForm({ ...stockAdjustForm, quantity: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason *</Label>
                    <Select value={stockAdjustForm.reason} onValueChange={(v) => setStockAdjustForm({ ...stockAdjustForm, reason: v })}>
                      <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                        <SelectItem value="Stock Correction">Stock Correction</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setStockAdjustDialog(false)}>Cancel</Button>
                    <Button onClick={handleStockAdjustment} className="bg-amber-600 hover:bg-amber-700">Apply Adjustment</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  );
};

export default InventoryTab;
