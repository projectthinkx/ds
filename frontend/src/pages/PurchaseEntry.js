import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import ItemModal from '../components/items/ItemModal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Package, Search, Calendar, FileText, IndianRupee, Gift, Edit, Eye, Trash, Percent } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const PurchaseEntry = ({ user }) => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [gstSlabs, setGstSlabs] = useState([]);
  const [itemMaster, setItemMaster] = useState([]);
  const [itemUnits, setItemUnits] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [newItemDialog, setNewItemDialog] = useState(false);
  const [itemTypes, setItemTypes] = useState([]);
  const [itemFilterType, setItemFilterType] = useState('all');
  const [itemSearchIndex, setItemSearchIndex] = useState(null);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'default'
  });

  const showConfirm = (title, description, onConfirm, variant = 'default') => {
    setConfirmDialog({ open: true, title, description, onConfirm, variant });
  };

  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_name: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    ordered_date: '',
    items_received_date: '',
    total_amount: 0,
    total_discount: 0,
    total_gst: 0,
    paid_amount: 0,
    paid_on: '',
    payment_mode: 'cash',
    transaction_reference: '',
    transaction_details: '',
    branch_id: '',
    godown_id: '',
    payment_status: 'unpaid', // unpaid, partial, paid
    bank_id: '',
    round_off: 0,
  });
  const [roundOffSign, setRoundOffSign] = useState(1); // 1 for positive, -1 for negative

  // Bulk Payment State
  const [bulkPaymentDialog, setBulkPaymentDialog] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    supplier_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'cash',
    bank_id: '',
    transaction_reference: '',
    total_amount: '',
    allocations: {} // { invoice_id: amount }
  });
  const [pendingInvoices, setPendingInvoices] = useState([]);

  useEffect(() => {
    if (bulkForm.supplier_id) {
      // Filter unpaid/partial invoices for this supplier
      const pending = purchases.filter(p =>
        p.supplier_id === bulkForm.supplier_id &&
        (p.payment_status === 'unpaid' || p.payment_status === 'partial') &&
        p.pending_amount > 0
      ).sort((a, b) => new Date(a.invoice_date) - new Date(b.invoice_date)); // Oldest first
      setPendingInvoices(pending);

      // Reset allocations when supplier changes
      setBulkForm(prev => ({ ...prev, allocations: {} }));
    } else {
      setPendingInvoices([]);
    }
  }, [bulkForm.supplier_id, purchases]);

  const handleAutoAllocate = (totalAmount) => {
    let remaining = parseFloat(totalAmount) || 0;
    const newAllocations = {};

    pendingInvoices.forEach(inv => {
      if (remaining <= 0) {
        newAllocations[inv.id] = 0;
        return;
      }

      const allocate = Math.min(remaining, inv.pending_amount);
      newAllocations[inv.id] = allocate;
      remaining -= allocate;
    });

    setBulkForm(prev => ({
      ...prev,
      total_amount: totalAmount,
      allocations: newAllocations
    }));
  };

  const handleBulkSubmit = async () => {
    // Validate
    const totalAllocated = Object.values(bulkForm.allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const paidAmount = parseFloat(bulkForm.total_amount) || 0;

    if (Math.abs(totalAllocated - paidAmount) > 0.01) {
      toast.error(`Allocated amount (${totalAllocated}) does not match Total Paid Amount (${paidAmount})`);
      return;
    }

    if (paidAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (bulkForm.payment_mode !== 'cash' && !bulkForm.bank_id) {
      toast.error("Please select a bank account");
      return;
    }

    try {
      const payload = {
        supplier_id: bulkForm.supplier_id,
        payment_date: bulkForm.payment_date,
        payment_mode: bulkForm.payment_mode,
        bank_account_id: bulkForm.payment_mode === 'cash' ? null : bulkForm.bank_id,
        total_paid_amount: paidAmount,
        transaction_reference: bulkForm.transaction_reference,
        invoices: Object.entries(bulkForm.allocations)
          .filter(([_, amount]) => amount > 0)
          .map(([id, amount]) => ({
            purchase_entry_id: id,
            amount_allocated: amount
          }))
      };

      await axios.post(`${API}/payments/bulk-supplier`, payload);
      toast.success("Bulk payment recorded successfully");
      setBulkPaymentDialog(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to record bulk payment");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Robust click-outside listener for item dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (itemSearchIndex !== null) {
        const input = document.getElementById(`medicine_name_${itemSearchIndex}`);
        const listbox = document.getElementById(`item-listbox-${itemSearchIndex}`);
        if (input && !input.contains(event.target) && listbox && !listbox.contains(event.target)) {
          setItemSearchIndex(null);
          setHighlightedIndex(-1);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [itemSearchIndex]);

  // Cleanup effect: when modal closes, reset all states
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [
        purchasesRes, suppliersRes, branchesRes, godownsRes, categoriesRes,
        subcategoriesRes, gstRes, itemMasterRes, itemUnitsRes, banksRes, itemTypesRes
      ] = await Promise.all([
        axios.get(`${API}/purchase-entries`),
        axios.get(`${API}/suppliers`),
        axios.get(`${API}/branches`),
        axios.get(`${API}/godowns`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/subcategories`).catch(() => ({ data: [] })),
        axios.get(`${API}/gst-slabs`),
        axios.get(`${API}/item-master`),
        axios.get(`${API}/item-units`).catch(() => ({ data: [] })),
        axios.get(`${API}/bank-accounts`).catch(() => ({ data: [] })),
        axios.get(`${API}/item-types`).catch(() => ({ data: [] })),
      ]);
      setPurchases(purchasesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setBranches(branchesRes.data || []);
      setGodowns(godownsRes.data || []);
      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
      setGstSlabs((gstRes.data || []).filter(g => g.is_active));
      setItemMaster(itemMasterRes.data || []);
      setItemUnits(itemUnitsRes.data || []);
      setBanks((banksRes.data || []).filter(b => b.is_active));
      setItemTypes(itemTypesRes.data || []);

      // Initialize default categories and GST if empty
      if (categoriesRes.data.length === 0) {
        await axios.post(`${API}/init-categories`);
        const newCats = await axios.get(`${API}/categories`);
        setCategories(newCats.data);
      }
      if (gstRes.data.length === 0) {
        await axios.post(`${API}/init-gst-slabs`);
        const newGst = await axios.get(`${API}/gst-slabs`);
        setGstSlabs(newGst.data.filter(g => g.is_active));
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const SkeletonRow = () => (
    <TableRow className="animate-pulse">
      <TableCell className="w-12"><div className="h-4 w-4 bg-slate-200 rounded mx-auto"></div></TableCell>
      <TableCell><div className="h-4 w-32 bg-slate-200 rounded"></div></TableCell>
      <TableCell><div className="h-4 w-16 bg-slate-200 rounded"></div></TableCell>
      <TableCell><div className="h-4 w-20 bg-slate-200 rounded"></div></TableCell>
      <TableCell><div className="h-4 w-20 bg-slate-200 rounded"></div></TableCell>
      <TableCell><div className="h-4 w-20 bg-slate-200 rounded"></div></TableCell>
      <TableCell><div className="h-4 w-10 bg-slate-200 rounded ml-auto"></div></TableCell>
      <TableCell><div className="h-4 w-16 bg-slate-200 rounded ml-auto"></div></TableCell>
      <TableCell><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></TableCell>
      <TableCell className="w-20"><div className="h-8 w-8 bg-slate-200 rounded-full mx-auto"></div></TableCell>
    </TableRow>
  );

  const addItem = () => {
    // Check if there's already a draft item
    const hasDraft = items.some(item => item.status === 'draft');
    if (hasDraft) {
      toast.info('Please click Done to save the current item before adding a new one.');
      // Find and expand the draft item
      const draftIndex = items.findIndex(item => item.status === 'draft');
      if (draftIndex !== -1) setExpandedIndex(draftIndex);
      return;
    }

    const newItem = {
      medicine_name: '',
      item_type_id: itemFilterType !== 'all' ? itemFilterType : '',
      category_id: '',
      subcategory_id: '',
      category: '',
      subcategory: '',
      batch_number: '',
      expiry_date: '',
      quantity: 1,
      free_quantity: 0,
      purchase_price: 0,
      mrp: 0,
      sales_price: 0,
      discount_percentage: 0,
      gst_percentage: 12,
      manufacturer: '',
      item_purpose: 'for_sale', // for_sale or internal_use
      status: 'draft',
      isAutoFilled: false,
    };
    const updated = [...items, newItem];
    setItems(updated);
    setExpandedIndex(updated.length - 1);
    calculateTotals(updated);
  };

  const updateItem = (index, field, value) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setItems(updated);
    calculateTotals(updated);
  };

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    calculateTotals(updated);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const commitItem = (index) => {
    const item = items[index];
    if (!item.medicine_name) {
      toast.error('Item name is required');
      return;
    }
    if (!item.batch_number) {
      toast.error('Batch number is required');
      return;
    }
    if (item.expiry_tracking_enabled && !item.expiry_date) {
      toast.error('Expiry date is required');
      return;
    }
    if (parseFloat(item.quantity) <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (parseFloat(item.mrp) <= 0) {
      toast.error('MRP is required');
      return;
    }

    const updated = items.map((it, i) =>
      i === index ? { ...it, status: 'committed' } : it
    );
    setItems(updated);
    setExpandedIndex(null);
  };

  const calculateTotals = (itemsList, overridePaidAmount = null, overrideRoundOff = null) => {
    if (!itemsList) return { subtotal: 0, totalDiscount: 0, totalGst: 0, grandTotal: 0 };
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;

    itemsList.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.purchase_price) || 0;
      const discountPct = parseFloat(item.discount_percentage) || 0;
      const gstPct = parseFloat(item.gst_percentage) || 0;

      const itemTotal = qty * price;
      const itemDiscount = (itemTotal * discountPct) / 100;
      const afterDiscount = itemTotal - itemDiscount;
      const gstAmount = (afterDiscount * gstPct) / 100;

      subtotal += itemTotal;
      totalDiscount += itemDiscount;
      totalGst += gstAmount;
    });



    const initialGrandTotal = subtotal - totalDiscount + totalGst;
    // Use override if provided, otherwise use current state
    // Note: formData.round_off might be stale if we just updated it, so ideally we pass it.
    // However, for item updates, we want to keep existing round_off.
    // For round_off updates, we pass the new value.
    const roundOff = overrideRoundOff !== undefined && overrideRoundOff !== null
      ? parseFloat(overrideRoundOff) || 0
      : parseFloat(formData.round_off) || 0;

    const grandTotal = Math.round((initialGrandTotal + roundOff) * 100) / 100;

    setFormData((prev) => {
      const paidAmt = overridePaidAmount !== null ? parseFloat(overridePaidAmount) || 0 : parseFloat(prev.paid_amount) || 0;
      let status = 'unpaid';
      if (paidAmt >= grandTotal && grandTotal > 0) {
        status = 'paid';
      } else if (paidAmt > 0) {
        status = 'partial';
      }

      return {
        ...prev,
        total_amount: grandTotal,
        total_discount: Math.round(totalDiscount * 100) / 100,
        total_gst: Math.round(totalGst * 100) / 100,
        payment_status: status,
        paid_amount: overridePaidAmount !== null ? overridePaidAmount : prev.paid_amount,
        round_off: roundOff
      };
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      grandTotal
    };
  };

  const validateForm = () => {
    if (!formData.supplier_id) {
      toast.error('Supplier is required');
      return false;
    }
    if (!formData.invoice_number) {
      toast.error('Invoice number is required');
      return false;
    }
    if (!formData.invoice_date) {
      toast.error('Invoice date is required');
      return false;
    }
    if (!formData.godown_id) {
      toast.error('Godown is required');
      return false;
    }

    const committedItems = items.filter(item => item.status === 'committed');
    if (committedItems.length === 0) {
      toast.error('Please add and save (Done) at least one item');
      return false;
    }

    for (let i = 0; i < committedItems.length; i++) {
      const item = committedItems[i];
      // Custom validation for committed items (though redundant if commitItem does its job)
      if (!item.medicine_name || !item.batch_number || parseFloat(item.quantity) <= 0 || parseFloat(item.mrp) <= 0) {
        toast.error(`Incomplete item details for "${item.medicine_name || 'Unnamed item'}"`);
        return false;
      }
    }

    if (formData.payment_mode !== 'cash' && formData.payment_mode !== 'credit' && !formData.bank_id) {
      toast.error('Bank account is required');
      return false;
    }

    return true;
  };



  const handleItemSuccess = async (newItem) => {
    // Refresh item master
    const itemRes = await axios.get(`${API}/item-master`);
    setItemMaster(itemRes.data || []);

    // Update item in the current purchase entry
    if (itemSearchIndex !== null) {
      const index = itemSearchIndex;
      const masterItem = newItem;

      const updatedItem = {
        ...items[index],
        medicine_name: masterItem.name,
        item_type_id: masterItem.item_type_id || '',
        category_id: masterItem.category_id || '',
        subcategory_id: masterItem.subcategory_id || '',
        category: categories.find(c => c.id === masterItem.category_id)?.name || masterItem.category || '',
        subcategory: subcategories.find(s => s.id === masterItem.subcategory_id)?.name || masterItem.subcategory || '',
        expiry_tracking_enabled: !!masterItem.expiry_tracking_enabled,
        isAutoFilled: true
      };
      if (masterItem.gst_percentage) updatedItem.gst_percentage = masterItem.gst_percentage;
      if (masterItem.manufacturer) updatedItem.manufacturer = masterItem.manufacturer;
      if (masterItem.unit_id) updatedItem.unit_id = masterItem.unit_id;

      const newItems = [...items];
      newItems[index] = updatedItem;
      setItems(newItems);
      calculateTotals(newItems);

      // Clear search and close dropdown
      setTimeout(() => {
        setItemSearchIndex(null);
        setItemSearchTerm('');
        setHighlightedIndex(-1);
      }, 10);
    }
  };

  // Filter item master based on search
  const getFilteredItems = (search) => {
    if (!search || search.length < 2) return [];
    const lowerSearch = search.toLowerCase();

    // Create a Map to track unique names (indexed by lowercase name for robustness)
    const uniqueItems = new Map();

    itemMaster.forEach(item => {
      // Filter out inactive items for new purchases
      if (item.item_status === 'INACTIVE') return;

      const name = item.name || '';
      const lowerName = name.toLowerCase();

      // Apply search term filter
      if (!lowerName.includes(lowerSearch)) return;

      // Apply global item type filter if set
      if (itemFilterType !== 'all' && item.item_type_id !== itemFilterType) return;

      if (!uniqueItems.has(lowerName)) {
        uniqueItems.set(lowerName, item);
      }
    });

    return Array.from(uniqueItems.values()).slice(0, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    showConfirm(
      'Save Purchase Entry?',
      'Are you sure you want to save this purchase entry?',
      async () => {
        try {
          const payload = {
            ...formData,
            items: items.map((item) => ({
              ...item,
              quantity: parseInt(item.quantity) || 0,
              free_quantity: parseInt(item.free_quantity) || 0,
              purchase_price: parseFloat(item.purchase_price) || 0,
              mrp: parseFloat(item.mrp) || 0,
              sales_price: parseFloat(item.sales_price) || 0,
              discount_percentage: parseFloat(item.discount_percentage) || 0,
              gst_percentage: parseFloat(item.gst_percentage) || 0,
            })),
            total_amount: parseFloat(formData.total_amount) || 0,
            total_discount: parseFloat(formData.total_discount) || 0,
            total_gst: parseFloat(formData.total_gst) || 0,
            paid_amount: parseFloat(formData.paid_amount) || 0,
            payment_status: formData.payment_status,
            transaction_reference: formData.transaction_reference || '',
            transaction_details: formData.transaction_details || '',
            branch_id: formData.branch_id || null,
          };

          await axios.post(`${API}/purchase-entries`, payload);

          // Add items to item master
          for (const item of payload.items) {
            if (item.medicine_name && item.mrp > 0) {
              try {
                await axios.post(`${API}/item-master`, {
                  name: item.medicine_name,
                  mrp: item.mrp,
                  manufacturer: item.manufacturer || '',
                });
              } catch (err) {
                // Item might already exist, ignore
              }
            }
          }

          toast.success('Purchase entry created successfully!');
          setOpen(false);
          resetForm();
          fetchData();
        } catch (error) {
          toast.error('Failed to create purchase entry');
          console.error(error);
        }
      }
    );
  };

  const resetForm = () => {
    setItems([]);
    setEditingPurchase(null);
    setItemFilterType('all');
    setExpandedIndex(null);
    setItemSearchIndex(null);
    setIsLoadingItems(false);
    setFormData({
      supplier_id: '',
      supplier_name: '',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      ordered_date: '',
      items_received_date: '',
      total_amount: 0,
      total_discount: 0,
      total_gst: 0,
      paid_amount: 0,
      paid_on: '',
      payment_mode: 'cash',
      transaction_reference: '',
      transaction_details: '',
      branch_id: '',
      godown_id: '',
      payment_status: 'unpaid',
      bank_id: '',
      round_off: 0,
    });
    // Ensure totals are reset
    calculateTotals([], 0, 0);
  };

  const handleEdit = async (purchaseSummary) => {
    setOpen(true);
    setEditingPurchase(purchaseSummary);
    setIsLoadingItems(true);
    setItemFilterType('all');
    setExpandedIndex(null);

    try {
      // Fetch full details to ensure all items are populated correctly
      const res = await axios.get(`${API}/purchase-entries/${purchaseSummary.id}`);
      const purchase = res.data;

      setFormData({
        supplier_id: purchase.supplier_id || '',
        supplier_name: purchase.supplier_name || '',
        invoice_number: purchase.invoice_number || '',
        invoice_date: purchase.invoice_date || '',
        ordered_date: purchase.ordered_date || '',
        items_received_date: purchase.items_received_date || '',
        total_amount: purchase.total_amount || 0,
        total_discount: purchase.total_discount || 0,
        total_gst: purchase.total_gst || 0,
        paid_amount: purchase.paid_amount || 0,
        paid_on: purchase.paid_on || '',
        payment_mode: purchase.payment_mode || 'cash',
        transaction_reference: purchase.transaction_reference || '',
        transaction_details: purchase.transaction_details || '',
        branch_id: purchase.branch_id || '',
        godown_id: purchase.godown_id || '',
        payment_status: purchase.payment_status || 'unpaid',
        bank_id: purchase.bank_id || '',
      });

      const committedItems = (purchase.items || []).map(item => ({
        ...item,
        status: 'committed',
        isAutoFilled: true
      }));

      // Calculate initial totals from items to derive round off
      let calcSub = 0, calcDisc = 0, calcGst = 0;
      committedItems.forEach((item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.purchase_price) || 0;
        const discountPct = parseFloat(item.discount_percentage) || 0;
        const gstPct = parseFloat(item.gst_percentage) || 0;
        const itemTotal = qty * price;
        const itemDiscount = (itemTotal * discountPct) / 100;
        const afterDiscount = itemTotal - itemDiscount;
        const gstAmount = (afterDiscount * gstPct) / 100;
        calcSub += itemTotal;
        calcDisc += itemDiscount;
        calcGst += gstAmount;
      });

      const calculatedTotal = calcSub - calcDisc + calcGst;
      const derivedRoundOff = (purchase.total_amount || 0) - calculatedTotal;
      const roundOffVal = Math.round(derivedRoundOff * 100) / 100;

      setItems(committedItems);
      setFormData(prev => ({ ...prev, round_off: roundOffVal }));
      calculateTotals(committedItems, purchase.paid_amount, roundOffVal);
    } catch (error) {
      console.error("Error fetching purchase details:", error);
      toast.error("Failed to load purchase details");
      setOpen(false);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPurchase) return;

    if (!validateForm()) return;

    showConfirm(
      'Update Purchase Entry',
      'Are you sure you want to update this purchase entry?',
      async () => {
        try {
          const committedItems = items.filter(item => item.status === 'committed');
          const totals = calculateTotals(committedItems);
          const payload = {
            ...formData,
            items: committedItems.map((item) => ({
              ...item,
              quantity: parseInt(item.quantity) || 0,
              free_quantity: parseInt(item.free_quantity) || 0,
              purchase_price: parseFloat(item.purchase_price) || 0,
              mrp: parseFloat(item.mrp) || 0,
              sales_price: parseFloat(item.sales_price) || 0,
              discount_percentage: parseFloat(item.discount_percentage) || 0,
              gst_percentage: parseFloat(item.gst_percentage) || 0,
            })),
            total_amount: totals.grandTotal,
            total_discount: totals.totalDiscount,
            total_gst: totals.totalGst,
            paid_amount: parseFloat(formData.paid_amount) || 0,
            branch_id: formData.branch_id || null,
          };

          await axios.put(`${API}/purchase-entries/${editingPurchase.id}`, payload);
          toast.success('Purchase entry updated successfully!');
          setOpen(false);
          resetForm();
          fetchData();
        } catch (error) {
          toast.error('Failed to update purchase entry');
          console.error(error);
        }
      }
    );
  };

  const handleDelete = (purchase) => {
    showConfirm(
      'Delete Purchase Entry',
      `Are you sure you want to delete invoice "${purchase.invoice_number}" from ${purchase.supplier_name}? This action cannot be undone.`,
      async () => {
        try {
          await axios.delete(`${API}/purchase-entries/${purchase.id}`);
          toast.success('Purchase entry deleted successfully!');
          fetchData();
        } catch (error) {
          toast.error('Failed to delete purchase entry');
          console.error(error);
        }
      },
      'destructive'
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      (p?.invoice_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p?.supplier_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.total_amount, 0);
  const totalPendingAmount = purchases.reduce((sum, p) => sum + p.pending_amount, 0);
  const totalDiscounts = purchases.reduce((sum, p) => sum + (p.total_discount || 0), 0);

  // Calculate item subtotal (before discount and GST)
  const getItemSubtotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.purchase_price) || 0;
      return sum + (qty * price);
    }, 0);
  };

  return (
    <div className="space-y-6" data-testid="purchase-entry-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Purchase Entry
          </h1>
          <p className="mt-2 text-slate-600">Manage pharmacy stock purchases</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setBulkForm({
                supplier_id: '',
                payment_date: new Date().toISOString().split('T')[0],
                payment_mode: 'cash',
                bank_id: '',
                transaction_reference: '',
                total_amount: '',
                allocations: {}
              });
              setBulkPaymentDialog(true);
            }}
          >
            <IndianRupee className="w-4 h-4 mr-2" />
            Record Bulk Payment
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="add-purchase-button"
                onClick={() => {
                  resetForm();
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Purchase Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPurchase ? 'Edit Purchase Entry' : 'Create Purchase Entry'}</DialogTitle>
                <DialogDescription>
                  {editingPurchase ? 'Update invoice and item details' : 'Enter invoice and item details for new stock purchase'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={(e) => { e.preventDefault(); editingPurchase ? handleUpdate() : handleSubmit(e); }} className="space-y-6">
                {/* Invoice Details Section */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Invoice Details
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Supplier *</Label>
                      <select
                        id="supplier"
                        value={formData.supplier_id}
                        onChange={(e) => {
                          const supplier = suppliers.find((s) => s.id === e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            supplier_id: e.target.value,
                            supplier_name: supplier?.name || '',
                          }));
                        }}
                        className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        data-testid="supplier-select"

                        aria-label="Select supplier"
                      >
                        <option value="">Select supplier</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice_number">Invoice Number *</Label>
                      <Input
                        id="invoice_number"
                        value={formData.invoice_number}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, invoice_number: e.target.value }))
                        }
                        placeholder="INV-001"
                        data-testid="invoice-number-input"

                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice_date">Invoice Date *</Label>
                      <Input
                        id="invoice_date"
                        type="date"
                        value={formData.invoice_date}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, invoice_date: e.target.value }))
                        }
                        data-testid="invoice-date-input"

                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ordered_date">Ordered Date</Label>
                      <Input
                        id="ordered_date"
                        type="date"
                        value={formData.ordered_date}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, ordered_date: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="items_received_date">Items Received Date</Label>
                      <Input
                        id="items_received_date"
                        type="date"
                        value={formData.items_received_date}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, items_received_date: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="godown">Godown * (Required)</Label>
                      <select
                        id="godown"
                        value={formData.godown_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, godown_id: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-emerald-500 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        data-testid="godown-select"

                        aria-label="Select godown"
                      >
                        <option value="">Select godown</option>
                        {godowns.map((godown) => (
                          <option key={godown.id} value={godown.id}>
                            {godown.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branch">Branch (Optional)</Label>
                      <select
                        id="branch"
                        value={formData.branch_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, branch_id: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        data-testid="branch-select"
                        aria-label="Select branch"
                      >
                        <option value="">Select branch</option>
                        <option value="none">None</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment_status">Payment Status</Label>
                      <select
                        id="payment_status"
                        value={formData.payment_status}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                        className={`w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${formData.payment_status === 'paid' ? 'border-green-500 bg-green-50 text-green-700' :
                          formData.payment_status === 'partial' ? 'border-amber-500 bg-amber-50 text-amber-700' :
                            'border-red-500 bg-red-50 text-red-700'
                          }`}
                        aria-label="Payment status"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partially Paid</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Items Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Purchase Items
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-500 whitespace-nowrap">Filter Type:</Label>
                        <select
                          value={itemFilterType}
                          onChange={(e) => setItemFilterType(e.target.value)}
                          className="h-8 px-2 rounded border border-slate-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="all">All Types</option>
                          {itemTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                </div>

                {/* List View for non-expanded items */}
                {(isLoadingItems || (items.length > 0)) && (
                  <div className="mb-4 border rounded-lg overflow-hidden bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-20 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingItems ? (
                          <>
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                          </>
                        ) : items.length > 0 && items.some((item, i) => i !== expandedIndex && item.status === 'committed') ? (
                          items.map((item, idx) => (
                            idx !== expandedIndex && item.status === 'committed' && (
                              <TableRow key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                <TableCell className="text-center font-medium text-slate-500">#{idx + 1}</TableCell>
                                <TableCell className="font-medium text-slate-900">{item.medicine_name || <span className="text-slate-400 italic">No Name</span>}</TableCell>
                                <TableCell className="text-xs text-indigo-700 font-semibold lowercase first-letter:uppercase">
                                  {itemTypes.find(t => t.id === item.item_type_id)?.name || '-'}
                                </TableCell>
                                <TableCell className="text-xs text-blue-600 truncate max-w-[100px]" title={item.category || categories.find(c => c.id === item.category_id)?.name}>
                                  {item.category || categories.find(c => c.id === item.category_id)?.name || '-'}
                                </TableCell>
                                <TableCell className="text-slate-600">{item.batch_number || '-'}</TableCell>
                                <TableCell className="text-slate-600 text-xs">{item.expiry_date || '-'}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  {item.quantity}
                                  {parseFloat(item.free_quantity) > 0 && (
                                    <span className="ml-1 text-emerald-600 text-xs font-semibold" title="Free Quantity">+{item.free_quantity}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-slate-600">{formatCurrency(item.purchase_price)}</TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.purchase_price) || 0))}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                      onClick={() => setExpandedIndex(idx)}
                                      title="Edit Item"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500 hover:bg-red-50"
                                      onClick={() => removeItem(idx)}
                                      title="Delete Item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-slate-400 italic">
                              No items added yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="space-y-4">
                  {items.map((item, index) => (
                    index === expandedIndex && (
                      <div
                        key={index}
                        className="p-4 bg-emerald-50/30 rounded-lg border-2 border-emerald-100 shadow-sm"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                              {index + 1}
                            </span>
                            <span className="text-sm font-semibold text-emerald-900">
                              {item.status === 'draft' ? "Add New Item Details" : `Editing Item Detail #${index + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => commitItem(index)}
                            >
                              Done
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-slate-500 hover:text-slate-700"
                              onClick={() => {
                                if (item.status === 'draft') {
                                  removeItem(index);
                                } else {
                                  setExpandedIndex(null);
                                }
                              }}
                            >
                              {item.status === 'draft' ? 'Cancel' : 'Collapse'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50"
                              onClick={() => {
                                removeItem(index);
                                setExpandedIndex(Math.max(0, items.length - 2));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-6 gap-3">
                          <div className="col-span-3 space-y-2">
                            <Label htmlFor={`medicine_name_${index}`}>Medicine/Item Name *</Label>
                            <div className="flex gap-1">
                              {/* Item Type Filter synced with main filter */}
                              <select
                                value={itemFilterType}
                                onChange={(e) => setItemFilterType(e.target.value)}
                                className="h-10 px-2 rounded-md border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[120px]"
                              >
                                <option value="all">All Types</option>
                                {itemTypes.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                              <div className="relative flex-1">
                                <Input
                                  id={`medicine_name_${index}`}
                                  value={item.medicine_name}
                                  onChange={(e) => {
                                    updateItem(index, 'medicine_name', e.target.value);
                                    setItemSearchIndex(index);
                                    setItemSearchTerm(e.target.value);
                                    setHighlightedIndex(-1);
                                  }}
                                  onFocus={() => {
                                    setItemSearchIndex(index);
                                    setItemSearchTerm(item.medicine_name);
                                    setHighlightedIndex(-1);
                                  }}
                                  onKeyDown={(e) => {
                                    const filteredItems = getFilteredItems(itemSearchTerm);

                                    // Auto-adjust type filter if typing and no match in current type
                                    // (Optional, but user said filter strictly, so we keep it strictly)

                                    // Tab key - open Add New Item dialog if no match
                                    if (e.key === 'Tab' && itemSearchTerm && itemSearchTerm.length >= 2 && filteredItems.length === 0) {
                                      e.preventDefault();
                                      setNewItemDialog(true);
                                      return;
                                    }

                                    if (filteredItems.length === 0) return;

                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      setHighlightedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      setHighlightedIndex(prev => Math.max(prev - 1, 0));
                                    } else if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const indexToSelect = highlightedIndex >= 0 ? highlightedIndex : 0;
                                      const selectedItem = filteredItems[indexToSelect];
                                      if (selectedItem) {
                                        // Validation for missing category/subcategory
                                        if (!selectedItem.category_id || !selectedItem.subcategory_id) {
                                          toast.error('Master data missing category/subcategory for this item');
                                        }

                                        // Prepare full update to avoid state clobbering
                                        const updatedItem = {
                                          ...items[index],
                                          medicine_name: selectedItem.name,
                                          item_type_id: selectedItem.item_type_id || '',
                                          category_id: selectedItem.category_id || '',
                                          subcategory_id: selectedItem.subcategory_id || '',
                                          category: selectedItem.category || '',
                                          subcategory: selectedItem.subcategory || '',
                                          expiry_tracking_enabled: !!selectedItem.expiry_tracking_enabled,
                                          isAutoFilled: true
                                        };
                                        if (selectedItem.gst_percentage) updatedItem.gst_percentage = selectedItem.gst_percentage;
                                        if (selectedItem.manufacturer) updatedItem.manufacturer = selectedItem.manufacturer;
                                        if (selectedItem.unit_id) updatedItem.unit_id = selectedItem.unit_id;

                                        const newItems = [...items];
                                        newItems[index] = updatedItem;
                                        setItems(newItems);
                                        calculateTotals(newItems);

                                        setItemSearchIndex(null);
                                        setItemSearchTerm('');
                                        setHighlightedIndex(-1);
                                      }
                                    } else if (e.key === 'Escape') {
                                      setItemSearchIndex(null);
                                      setHighlightedIndex(-1);
                                    }
                                  }}
                                  placeholder="Search or type item name"
                                  autoComplete="off"

                                  aria-autocomplete="list"
                                  aria-controls={`item-listbox-${index}`}
                                  aria-expanded={itemSearchIndex === index && itemSearchTerm && getFilteredItems(itemSearchTerm).length > 0}
                                />
                                {itemSearchIndex === index && itemSearchTerm && getFilteredItems(itemSearchTerm).length > 0 && (
                                  <div
                                    id={`item-listbox-${index}`}
                                    role="listbox"
                                    className="absolute z-[100] w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-64 overflow-y-auto pointer-events-auto"
                                    onMouseDown={(e) => e.preventDefault()}
                                  >
                                    {getFilteredItems(itemSearchTerm).map((masterItem, idx) => (
                                      <button
                                        key={`item-${masterItem.id || masterItem.name}-${idx}`}
                                        type="button"
                                        role="option"
                                        aria-selected={highlightedIndex === idx}
                                        className={`w-full text-left p-3 cursor-pointer text-sm select-none border-b border-slate-100 last:border-0 transition-colors ${highlightedIndex === idx ? 'bg-emerald-100' : 'bg-white hover:bg-slate-50'}`}
                                        onMouseMove={() => setHighlightedIndex(idx)}
                                        onMouseDown={(e) => {
                                          e.preventDefault(); // Keep focus on input
                                          e.stopPropagation();

                                          // Validation for missing category/subcategory
                                          if (!masterItem.category_id || !masterItem.subcategory_id) {
                                            toast.error('Master data missing category/subcategory for this item');
                                          }

                                          // Prepare full update to avoid state clobbering
                                          const updatedItem = {
                                            ...items[index],
                                            medicine_name: masterItem.name,
                                            item_type_id: masterItem.item_type_id || '',
                                            category_id: masterItem.category_id || '',
                                            subcategory_id: masterItem.subcategory_id || '',
                                            category: masterItem.category || '',
                                            subcategory: masterItem.subcategory || '',
                                            expiry_tracking_enabled: !!masterItem.expiry_tracking_enabled,
                                            isAutoFilled: true
                                          };
                                          if (masterItem.gst_percentage) updatedItem.gst_percentage = masterItem.gst_percentage;
                                          if (masterItem.manufacturer) updatedItem.manufacturer = masterItem.manufacturer;
                                          if (masterItem.unit_id) updatedItem.unit_id = masterItem.unit_id;

                                          const newItems = [...items];
                                          newItems[index] = updatedItem;
                                          setItems(newItems);
                                          calculateTotals(newItems);

                                          // Clear search and close dropdown
                                          setTimeout(() => {
                                            setItemSearchIndex(null);
                                            setItemSearchTerm('');
                                            setHighlightedIndex(-1);
                                          }, 10);
                                        }}
                                      >
                                        <div className="pointer-events-none">
                                          <p className="font-bold text-slate-900">{masterItem.name}</p>
                                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 mt-1">
                                            {masterItem.item_type_id && (
                                              <span className="px-1 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 flex items-center">
                                                {itemTypes.find(t => t.id === masterItem.item_type_id)?.name || 'Unknown Type'}
                                              </span>
                                            )}
                                            {masterItem.category && (
                                              <span className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 flex items-center">
                                                {masterItem.category}
                                              </span>
                                            )}
                                            {masterItem.subcategory && (
                                              <span className="px-1 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 flex items-center">
                                                {masterItem.subcategory}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {/* No match message */}
                                {itemSearchIndex === index && itemSearchTerm && itemSearchTerm.length >= 2 && getFilteredItems(itemSearchTerm).length === 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-2 text-sm text-amber-700">
                                    No item found. Click + to add new item.
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={!itemSearchTerm || itemSearchTerm.length < 2 || getFilteredItems(itemSearchTerm).length > 0}
                                onClick={() => {
                                  setItemSearchIndex(index);
                                  // Open unified item modal
                                  setNewItemDialog(true);
                                }}
                                title={itemSearchTerm && itemSearchTerm.length >= 2 && getFilteredItems(itemSearchTerm).length === 0 ? "Add new item to master" : "Type item name first (no match to enable)"}
                                aria-label="Add new item"
                                className={itemSearchTerm && itemSearchTerm.length >= 2 && getFilteredItems(itemSearchTerm).length === 0 ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50' : ''}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`batch_${index}`}>Batch Number *</Label>
                            <Input
                              id={`batch_${index}`}
                              value={item.batch_number}
                              onChange={(e) =>
                                updateItem(index, 'batch_number', e.target.value)
                              }
                              placeholder="BATCH001"
                            />

                          </div>
                          <div className="space-y-2">
                            <Label>Expiry Date *</Label>
                            <Input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) =>
                                updateItem(index, 'expiry_date', e.target.value)
                              }
                              className={item.expiry_tracking_enabled && !item.expiry_date ? 'border-red-400 focus:ring-red-500' : ''}

                            />
                            {item.expiry_tracking_enabled && <span className="text-[10px] text-red-500">* Required for tracking</span>}
                          </div>
                          <div className="space-y-2">
                            <Label>Manufacturer</Label>
                            <Input
                              value={item.manufacturer}
                              onChange={(e) =>
                                updateItem(index, 'manufacturer', e.target.value)
                              }
                              placeholder="Company name"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-blue-800 text-xs font-semibold">Category</Label>
                              {item.isAutoFilled && (
                                <button
                                  type="button"
                                  onClick={() => updateItem(index, 'isAutoFilled', false)}
                                  className="text-[10px] text-blue-600 hover:underline"
                                >
                                  Change
                                </button>
                              )}
                            </div>
                            <select
                              value={item.category_id}
                              disabled={item.isAutoFilled}
                              onChange={(e) => {
                                const cat = categories.find(c => c.id === e.target.value);
                                const newItems = [...items];
                                newItems[index] = { ...newItems[index], category_id: e.target.value, category: cat?.name || '', subcategory_id: '' };
                                setItems(newItems);
                              }}
                              className={`w-full h-8 px-2 rounded border border-blue-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${item.isAutoFilled ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`}
                            >
                              <option value="">Select Category</option>
                              {categories
                                .filter(c => !item.item_type_id || c.item_type_id === item.item_type_id)
                                .map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-slate-700 text-xs font-semibold">Subcategory</Label>
                            </div>
                            <select
                              value={item.subcategory_id}
                              disabled={item.isAutoFilled}
                              onChange={(e) => {
                                const sub = subcategories.find(s => s.id === e.target.value);
                                const newItems = [...items];
                                newItems[index] = { ...newItems[index], subcategory_id: e.target.value, subcategory: sub?.name || '' };
                                setItems(newItems);
                              }}
                              className={`w-full h-8 px-2 rounded border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-slate-500 ${item.isAutoFilled ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`}
                            >
                              <option value="">Select Subcategory</option>
                              {subcategories
                                .filter(s => !item.category_id || s.category_id === item.category_id)
                                .map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-9 gap-3 mt-3">
                          <div className="space-y-2">
                            <Label>Quantity *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, 'quantity', e.target.value)
                              }
                            />

                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center">
                              <Gift className="w-3 h-3 mr-1 text-emerald-600" />Free Qty
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={item.free_quantity}
                              onChange={(e) =>
                                updateItem(index, 'free_quantity', e.target.value)
                              }
                              className="border-emerald-300"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Purchase ₹ *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.purchase_price}
                              onChange={(e) =>
                                updateItem(index, 'purchase_price', e.target.value)
                              }
                            />

                          </div>
                          <div className="space-y-2">
                            <Label>MRP ₹ *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.mrp}
                              onChange={(e) => updateItem(index, 'mrp', e.target.value)}
                            />

                          </div>
                          <div className="space-y-2">
                            <Label>Sales ₹</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.sales_price}
                              onChange={(e) =>
                                updateItem(index, 'sales_price', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Discount %</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.discount_percentage}
                              onChange={(e) =>
                                updateItem(index, 'discount_percentage', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`gst_${index}`}>GST %</Label>
                            <select
                              id={`gst_${index}`}
                              value={item.gst_percentage.toString()}
                              onChange={(e) => updateItem(index, 'gst_percentage', parseFloat(e.target.value))}
                              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              aria-label="Select GST percentage"
                            >
                              {gstSlabs.map((gst) => (
                                <option key={gst.id} value={gst.percentage.toString()}>
                                  {gst.percentage}%
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`purpose_${index}`}>Purpose</Label>
                            <select
                              id={`purpose_${index}`}
                              value={item.item_purpose || 'for_sale'}
                              onChange={(e) => updateItem(index, 'item_purpose', e.target.value)}
                              className={`w-full h-10 px-3 rounded-md border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${item.item_purpose === 'internal_use' ? 'border-amber-500 bg-amber-50' : 'border-slate-300'}`}
                              aria-label="Select item purpose"
                            >
                              <option value="for_sale">For Sale</option>
                              <option value="internal_use">Internal Use</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-8 gap-3 mt-3">
                          <div className="space-y-2">
                            <Label>Line Total</Label>
                            <div className="h-9 px-3 py-2 bg-slate-100 rounded text-sm font-medium">
                              {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.purchase_price) || 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )))}

                  {items.length === 0 && (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                      No items added. Click &quot;Add Item&quot; to start adding medicines.
                    </div>
                  )}
                </div>


                {/* Section 3: Payment Details - Collapsible */}
                <div className={`p-4 rounded-lg space-y-4 ${formData.payment_status === 'unpaid' ? 'bg-red-50 border border-red-200' : formData.payment_status === 'partial' ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                  <h3 className="font-semibold flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" />
                    Payment Details
                    {formData.payment_status === 'unpaid' && <span className="text-xs px-2 py-0.5 bg-red-200 text-red-700 rounded-full">Unpaid</span>}
                    {formData.payment_status === 'partial' && <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-700 rounded-full">Partial</span>}
                    {formData.payment_status === 'paid' && <span className="text-xs px-2 py-0.5 bg-green-200 text-green-700 rounded-full">Paid</span>}
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment_mode">Payment Mode</Label>
                      <select
                        id="payment_mode"
                        value={formData.payment_mode}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value, bank_id: e.target.value === 'cash' || e.target.value === 'credit' ? '' : prev.bank_id }))}
                        className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        aria-label="Select payment mode"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="netbanking">Net Banking</option>
                        <option value="cheque">Cheque</option>
                        <option value="credit">Credit (Pay Later)</option>
                      </select>
                    </div>
                    {formData.payment_mode !== 'cash' && formData.payment_mode !== 'credit' && (
                      <div className="space-y-2">
                        <Label htmlFor="bank_id">Bank Account *</Label>
                        <select
                          id="bank_id"
                          value={formData.bank_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, bank_id: e.target.value }))}
                          className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"

                          aria-label="Select bank account"
                        >
                          <option value="">Select Bank</option>
                          {banks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.bank_name} - {bank.account_number.slice(-4)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="paid_amount">Paid Amount (₹)</Label>
                      <Input
                        id="paid_amount"
                        type="number"
                        step="0.01"
                        value={formData.paid_amount}
                        onChange={(e) => {
                          calculateTotals(items, e.target.value);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paid_on">Paid On</Label>
                      <Input
                        id="paid_on"
                        type="date"
                        value={formData.paid_on}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, paid_on: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transaction_reference">Transaction Reference</Label>
                      <Input
                        id="transaction_reference"
                        value={formData.transaction_reference}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, transaction_reference: e.target.value }))
                        }
                        placeholder="UTR / Cheque No."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transaction_details">Transaction Details / Remarks</Label>
                    <Textarea
                      id="transaction_details"
                      value={formData.transaction_details}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, transaction_details: e.target.value }))
                      }
                      placeholder="Bank name, additional remarks..."
                      rows={2}
                    />
                  </div>
                </div>


                {/* Totals Section */}
                {items.length > 0 && (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="grid grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-slate-600">Subtotal</div>
                        <div className="text-xl font-bold text-slate-900">
                          {formatCurrency(getItemSubtotal())}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-red-600">Total Discount</div>
                        <div className="text-xl font-bold text-red-600">
                          -{formatCurrency(formData.total_discount)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-blue-600">Total GST</div>
                        <div className="text-xl font-bold text-blue-600">
                          +{formatCurrency(formData.total_gst)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-slate-500 mb-1">Correction / Round Off</div>
                        <div className="flex justify-center items-center gap-1">
                          <div className="flex border border-emerald-300 rounded-md overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setRoundOffSign(1);
                                const absVal = Math.abs(parseFloat(formData.round_off) || 0);
                                const newVal = absVal;
                                setFormData(prev => ({ ...prev, round_off: newVal }));
                                calculateTotals(items, null, newVal);
                              }}
                              className={`px-2 py-1 text-xs font-bold ${roundOffSign === 1
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRoundOffSign(-1);
                                const absVal = Math.abs(parseFloat(formData.round_off) || 0);
                                const newVal = -absVal;
                                setFormData(prev => ({ ...prev, round_off: newVal }));
                                calculateTotals(items, null, newVal);
                              }}
                              className={`px-2 py-1 text-xs font-bold ${roundOffSign === -1
                                ? 'bg-red-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                              −
                            </button>
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            value={Math.abs(parseFloat(formData.round_off) || 0)}
                            onChange={(e) => {
                              const absVal = parseFloat(e.target.value) || 0;
                              const newVal = absVal * roundOffSign;
                              setFormData(prev => ({ ...prev, round_off: newVal }));
                              calculateTotals(items, null, newVal);
                            }}
                            className="w-20 h-8 text-center font-bold text-slate-700 border-emerald-300 focus:border-emerald-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-emerald-600">Grand Total</div>
                        <div className="text-2xl font-bold text-emerald-700">
                          {formatCurrency(formData.total_amount)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-emerald-200 flex items-center justify-center space-x-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <Gift className="w-4 h-4 mr-1 text-emerald-600" />
                        Free Items: {items.reduce((sum, item) => sum + (parseInt(item.free_quantity) || 0), 0)}
                      </div>
                      <div className="text-sm text-slate-600">
                        Total Items: {items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={items.length === 0 || !formData.godown_id}
                    data-testid="submit-purchase-button"
                  >
                    {editingPurchase ? 'Update Purchase Entry' : 'Create Purchase Entry'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Unified Add New Item Modal */}
      <ItemModal
        open={newItemDialog}
        onOpenChange={(o) => {
          setNewItemDialog(o);
          if (!o) setItemSearchIndex(null);
        }}
        initialData={{
          name: items[itemSearchIndex]?.medicine_name || itemSearchTerm,
          item_type_id: itemFilterType === 'all' ? '' : (itemTypes.find(t => t.name.toLowerCase() === itemFilterType.toLowerCase())?.id || '')
        }}
        itemTypes={itemTypes}
        categories={categories}
        subcategories={subcategories}
        itemUnits={itemUnits}
        gstSlabs={gstSlabs}
        onSuccess={handleItemSuccess}
      />

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-sm font-medium text-slate-600">Total Purchases</div>
            <Package className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">{purchases.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-sm font-medium text-slate-600">Total Purchase Value</div>
            <IndianRupee className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">
              {formatCurrency(totalPurchaseValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-sm font-medium text-slate-600">Total Discounts</div>
            <Percent className="w-5 h-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(totalDiscounts)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-sm font-medium text-slate-600">Pending Payments</div>
            <FileText className="w-5 h-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {formatCurrency(totalPendingAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by invoice or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              data-testid="search-input"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-600">Loading purchases...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-8 text-slate-600">No purchases found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Invoice No.
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Supplier
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Invoice Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Items
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Discount
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      GST
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
                      Total Details
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="border-b border-slate-100 h-16 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">
                        {purchase.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {purchase.supplier_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(purchase.invoice_date)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {purchase.items?.length || 0} item(s)
                      </td>
                      <td className="py-3 px-4 text-sm text-red-600">
                        {formatCurrency(purchase.total_discount || 0)}
                      </td>
                      <td className="py-3 px-4 text-sm text-blue-600">
                        {formatCurrency(purchase.total_gst || 0)}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-slate-900 text-right">
                        <div>{formatCurrency(purchase.total_amount)}</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Paid: {formatCurrency(purchase.paid_amount || 0)}
                        </div>
                        {(purchase.pending_amount > 0 ||
                          purchase.total_amount > (purchase.paid_amount || 0)) && (
                            <div className="text-[10px] font-normal text-red-500">
                              Pending:{" "}
                              {formatCurrency(
                                purchase.pending_amount ||
                                purchase.total_amount - (purchase.paid_amount || 0)
                              )}
                            </div>
                          )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex flex-col items-center text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${purchase.payment_status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : purchase.payment_status === "partial"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                              }`}
                          >
                            {purchase.payment_status === "paid"
                              ? "Paid"
                              : purchase.payment_status === "partial"
                                ? "Partially Paid"
                                : "Unpaid"}
                          </span>
                          {purchase.payment_mode && (
                            <span className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">
                              {purchase.payment_mode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(purchase)}
                            title="Edit purchase entry"
                            aria-label="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(purchase)}
                            title="Delete purchase entry"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Bulk Payment Dialog */}
      <Dialog open={bulkPaymentDialog} onOpenChange={setBulkPaymentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Bulk Supplier Payment</DialogTitle>
            <DialogDescription>
              Pay multiple invoices for a single supplier in one transaction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select Supplier</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={bulkForm.supplier_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBulkForm(prev => ({ ...prev, supplier_id: val, allocations: {}, total_amount: '' }));
                  }}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={bulkForm.payment_date}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Paid Amount (₹)</Label>
                <Input
                  type="number"
                  value={bulkForm.total_amount}
                  onChange={(e) => handleAutoAllocate(e.target.value)}
                  placeholder="Enter total amount"
                  className="font-bold text-emerald-600"
                />
              </div>
            </div>

            {bulkForm.supplier_id && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right w-40">Allocation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-slate-500">
                          No pending invoices found for this supplier
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingInvoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                          <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.total_amount)}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">{formatCurrency(inv.pending_amount)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="text-right h-8"
                              value={bulkForm.allocations[inv.id] !== undefined ? bulkForm.allocations[inv.id] : ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setBulkForm(prev => ({
                                  ...prev,
                                  allocations: { ...prev.allocations, [inv.id]: val }
                                }));
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 bg-slate-50 border-t flex justify-end gap-6 text-sm">
                  <div>
                    Total Pending: <span className="font-bold">{formatCurrency(pendingInvoices.reduce((sum, i) => sum + i.pending_amount, 0))}</span>
                  </div>
                  <div>
                    Total Allocated: <span className={`font-bold ${Math.abs(Object.values(bulkForm.allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0) - (parseFloat(bulkForm.total_amount) || 0)) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(Object.values(bulkForm.allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={bulkForm.payment_mode}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, payment_mode: e.target.value }))}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              {bulkForm.payment_mode !== 'cash' && (
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={bulkForm.bank_id}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, bank_id: e.target.value }))}
                  >
                    <option value="">Select Bank</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number.slice(-4)}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Transaction Ref</Label>
                <Input
                  placeholder="UTR / Cheque No."
                  value={bulkForm.transaction_reference}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, transaction_reference: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setBulkPaymentDialog(false)}>Cancel</Button>
              <Button onClick={handleBulkSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                Confirm Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseEntry;
