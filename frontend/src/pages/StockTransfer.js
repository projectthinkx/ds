import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Search, ArrowRightLeft, Package, Warehouse, Building2,
  Plus, Calendar, FileText, ChevronRight, Trash2, Edit
} from 'lucide-react';

const StockTransfer = ({ user }) => {
  const [pharmacyStock, setPharmacyStock] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [branches, setBranches] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog state
  const [transferDialog, setTransferDialog] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [nextTransferNumber, setNextTransferNumber] = useState('');

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    transfer_date: new Date().toISOString().split('T')[0],
    transfer_type: 'godown_to_branch',
    from_type: 'godown',
    from_id: '',
    from_name: '',
    to_type: 'branch',
    to_id: '',
    to_name: '',
    notes: ''
  });

  // Items added to the transfer list
  const [addedItems, setAddedItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stockRes, godownsRes, branchesRes, transfersRes, nextNumRes] = await Promise.all([
        axios.get(`${API}/pharmacy-stock`),
        axios.get(`${API}/godowns`),
        axios.get(`${API}/branches`),
        axios.get(`${API}/stock-transfers`),
        axios.get(`${API}/stock-transfers/next-number`)
      ]);
      setPharmacyStock(stockRes.data);
      setGodowns(godownsRes.data);
      setBranches(branchesRes.data);
      setTransfers(transfersRes.data);
      setNextTransferNumber(nextNumRes.data.transfer_number);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const openTransferDialog = () => {
    setEditingTransfer(null);
    setTransferForm({
      transfer_date: new Date().toISOString().split('T')[0],
      transfer_type: 'godown_to_branch',
      from_type: 'godown',
      from_id: '',
      from_name: '',
      to_type: 'branch',
      to_id: '',
      to_name: '',
      notes: ''
    });
    setAddedItems([]);
    setItemSearch('');
    setTransferDialog(true);
  };

  const handleEdit = (transfer) => {
    setEditingTransfer(transfer);
    setTransferForm({
      transfer_date: transfer.transfer_date,
      transfer_type: transfer.transfer_type,
      from_type: transfer.from_type,
      from_id: transfer.from_id,
      from_name: transfer.from_name,
      to_type: transfer.to_type,
      to_id: transfer.to_id,
      to_name: transfer.to_name,
      notes: transfer.notes || ''
    });

    // Map backend items to frontend format
    const items = transfer.items.map(item => {
      // We need to find the item in pharmacy stock to get the available quantity
      const stockItem = pharmacyStock.find(s =>
        s.name === item.item_name && s.batch_number === item.batch_number
      );

      return {
        name: item.item_name,
        batch_number: item.batch_number,
        mrp: item.mrp,
        quantity: stockItem ? stockItem.quantity + item.quantity : item.quantity,
        transfer_quantity: item.quantity
      };
    });

    setAddedItems(items);
    setItemSearch('');
    setHighlightedIndex(-1);
    setTransferDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transfer? Stock movement will be reversed.')) {
      return;
    }

    try {
      await axios.delete(`${API}/stock-transfers/${id}`);
      toast.success('Transfer deleted and stock reversed');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const handleTransferTypeChange = (type) => {
    setTransferForm(prev => ({
      ...prev,
      transfer_type: type,
      from_type: type === 'godown_to_branch' ? 'godown' : 'branch',
      from_id: '',
      from_name: '',
      to_id: '',
      to_name: ''
    }));
    setAddedItems([]);
    setItemSearch('');
  };

  const handleFromChange = (id) => {
    const fromType = transferForm.transfer_type === 'godown_to_branch' ? 'godown' : 'branch';
    const source = fromType === 'godown'
      ? godowns.find(g => g.id === id)
      : branches.find(b => b.id === id);

    setTransferForm(prev => ({
      ...prev,
      from_id: id,
      from_name: source?.name || ''
    }));
    setAddedItems([]);
    setItemSearch('');
  };

  const handleToChange = (id) => {
    const branch = branches.find(b => b.id === id);
    setTransferForm(prev => ({
      ...prev,
      to_id: id,
      to_name: branch?.name || ''
    }));
  };

  const handleSelectItem = (item) => {
    if (!item) return;

    // Check if item already exists in the list
    const exists = addedItems.find(i =>
      i.name === item.name &&
      i.batch_number === item.batch_number &&
      i.mrp === item.mrp
    );

    if (exists) {
      toast.error('Item already added to list');
      setItemSearch('');
      setHighlightedIndex(-1);
      return;
    }

    const newItem = {
      ...item,
      item_name: item.name, // For backend compatibility
      transfer_quantity: 1
    };

    setAddedItems(prev => [...prev, newItem]);
    setItemSearch('');
    setHighlightedIndex(-1);
    toast.success(`${item.name} added to transfer list`);
  };

  const updateItemQuantity = (index, qty) => {
    const newItems = [...addedItems];
    const available = newItems[index].quantity;
    const value = parseInt(qty) || 0;

    if (value > available) {
      toast.error(`Only ${available} units available in stock`);
      newItems[index].transfer_quantity = available;
    } else {
      newItems[index].transfer_quantity = value;
    }
    setAddedItems(newItems);
  };

  const removeItem = (index) => {
    setAddedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id || addedItems.length === 0) {
      toast.error('Please fill all required fields and add at least one item');
      return;
    }

    // Validate quantities
    const invalidItem = addedItems.find(i => !i.transfer_quantity || i.transfer_quantity <= 0);
    if (invalidItem) {
      toast.error(`Please enter a valid quantity for ${invalidItem.name}`);
      return;
    }

    if (transferForm.from_id === transferForm.to_id) {
      toast.error('Source and destination cannot be the same');
      return;
    }

    try {
      const payload = {
        ...transferForm,
        items: addedItems.map(i => ({
          item_name: i.name,
          batch_number: i.batch_number,
          quantity: i.transfer_quantity,
          mrp: i.mrp
        }))
      };

      if (editingTransfer) {
        await axios.put(`${API}/stock-transfers/${editingTransfer.id}`, payload);
        toast.success('Stock transfer updated successfully!');
      } else {
        await axios.post(`${API}/stock-transfers`, payload);
        toast.success('Stock transferred successfully!');
      }
      setTransferDialog(false);
      setEditingTransfer(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  // Filter items based on selected source
  const filteredItems = pharmacyStock.filter(item => {
    if (!transferForm.from_id) return false;

    const matchesSource = transferForm.from_type === 'godown'
      ? item.godown_id === transferForm.from_id
      : item.branch_id === transferForm.from_id;

    const matchesSearch = item.name.toLowerCase().includes(itemSearch.toLowerCase());

    return matchesSource && matchesSearch && item.quantity > 0;
  });

  // Filter transfers based on search
  const filteredTransfers = transfers.filter(t =>
    t.transfer_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.from_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.to_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.items?.some(item => item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="stock-transfer-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Stock Transfer
          </h1>
          <p className="mt-2 text-slate-600">Transfer items between godowns and branches</p>
        </div>
        {isAdmin && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={openTransferDialog}
            data-testid="new-transfer-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Transfer
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Transfers</p>
                <p className="text-2xl font-bold">{transfers.length}</p>
              </div>
              <ArrowRightLeft className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Godown to Branch</p>
                <p className="text-2xl font-bold">
                  {transfers.filter(t => t.transfer_type === 'godown_to_branch').length}
                </p>
              </div>
              <Warehouse className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Branch to Branch</p>
                <p className="text-2xl font-bold">
                  {transfers.filter(t => t.transfer_type === 'branch_to_branch').length}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Items in Stock</p>
                <p className="text-2xl font-bold">{pharmacyStock.length}</p>
              </div>
              <Package className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transfer History</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransfers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No transfers found</p>
              {isAdmin && <p className="text-sm">Click "New Transfer" to create one</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Transfer #</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Items</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">From</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">To</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-emerald-600">
                          {transfer.transfer_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(transfer.transfer_date)}</td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {transfer.items?.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium">{item.item_name}</span>
                              <span className="text-slate-500 ml-2">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {transfer.from_type === 'godown' ? (
                            <Warehouse className="w-3 h-3 text-blue-500" />
                          ) : (
                            <Building2 className="w-3 h-3 text-purple-500" />
                          )}
                          <span className="text-sm">{transfer.from_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-purple-500" />
                          <span className="text-sm">{transfer.to_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant={transfer.transfer_type === 'godown_to_branch' ? 'default' : 'secondary'}>
                            {transfer.transfer_type === 'godown_to_branch' ? 'Godown→Branch' : 'Branch→Branch'}
                          </Badge>
                          {isAdmin && (
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => handleEdit(transfer)}
                                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Edit Transfer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(transfer.id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete Transfer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
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

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransfer ? `Edit Transfer: ${editingTransfer.transfer_number}` : 'New Stock Transfer'}</DialogTitle>
            <DialogDescription>
              {editingTransfer ? 'Update quantities or items for this transfer' : 'Transfer multiple items between godowns and branches'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Transfer Number & Date */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-xs text-slate-500">Transfer Number</Label>
                <p className="font-mono font-semibold text-emerald-600">{editingTransfer ? editingTransfer.transfer_number : nextTransferNumber}</p>
              </div>
              <div>
                <Label htmlFor="transfer_date">Transfer Date *</Label>
                <Input
                  id="transfer_date"
                  type="date"
                  value={transferForm.transfer_date}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, transfer_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Transfer Type Selection */}
            <div>
              <Label>Transfer Type *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => handleTransferTypeChange('godown_to_branch')}
                  className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${transferForm.transfer_type === 'godown_to_branch'
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <Warehouse className={`w-6 h-6 ${transferForm.transfer_type === 'godown_to_branch' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div className="text-left">
                    <p className="font-medium">Godown to Branch</p>
                    <p className="text-xs text-slate-500">Transfer from warehouse</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleTransferTypeChange('branch_to_branch')}
                  className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${transferForm.transfer_type === 'branch_to_branch'
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <Building2 className={`w-6 h-6 ${transferForm.transfer_type === 'branch_to_branch' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div className="text-left">
                    <p className="font-medium">Branch to Branch</p>
                    <p className="text-xs text-slate-500">Inter-branch transfer</p>
                  </div>
                </button>
              </div>
            </div>

            {/* From & To Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from_location">From {transferForm.from_type === 'godown' ? 'Godown' : 'Branch'} *</Label>
                <select
                  id="from_location"
                  value={transferForm.from_id}
                  onChange={(e) => handleFromChange(e.target.value)}
                  className="w-full h-10 px-3 mt-1 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select {transferForm.from_type === 'godown' ? 'godown' : 'branch'}</option>
                  {transferForm.from_type === 'godown'
                    ? godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                    : branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                  }
                </select>
              </div>
              <div>
                <Label htmlFor="to_branch">To Branch *</Label>
                <select
                  id="to_branch"
                  value={transferForm.to_id}
                  onChange={(e) => handleToChange(e.target.value)}
                  className="w-full h-10 px-3 mt-1 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select branch</option>
                  {branches
                    .filter(b => transferForm.transfer_type === 'godown_to_branch' || b.id !== transferForm.from_id)
                    .map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                  }
                </select>
              </div>
            </div>

            {/* Item Selection */}
            {transferForm.from_id && (
              <div className="space-y-4">
                <div className="relative">
                  <Label>Search & Add Items *</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Type item name to add..."
                      value={itemSearch}
                      onChange={(e) => {
                        setItemSearch(e.target.value);
                        setHighlightedIndex(-1);
                      }}
                      onKeyDown={(e) => {
                        if (filteredItems.length === 0) return;

                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHighlightedIndex(prev => (prev + 1) % filteredItems.length);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHighlightedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          const indexToSelect = highlightedIndex >= 0 ? highlightedIndex : 0;
                          handleSelectItem(filteredItems[indexToSelect]);
                        } else if (e.key === 'Escape') {
                          setItemSearch('');
                          setHighlightedIndex(-1);
                        }
                      }}
                      className="pl-9"
                    />
                    {itemSearch && filteredItems.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredItems.map((item, idx) => (
                          <div
                            key={`${item.name}-${item.batch_number}-${item.mrp}`}
                            className={`p-3 cursor-pointer border-b last:border-b-0 group transition-colors ${highlightedIndex === idx ? 'bg-emerald-100' : 'hover:bg-emerald-50'
                              }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectItem(item);
                            }}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-semibold text-slate-900 group-hover:text-emerald-700">{item.name}</span>
                                <div className="flex gap-3 text-xs text-slate-500">
                                  <span>Batch: {item.batch_number}</span>
                                  <span>|</span>
                                  <span>Stock: {item.quantity}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-emerald-600 font-semibold">{formatCurrency(item.mrp)}</span>
                                <div className="text-[10px] text-slate-400">MRP</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {itemSearch && filteredItems.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-3 text-center text-slate-500 text-sm">
                        No items found with stock in selected source
                      </div>
                    )}
                  </div>
                </div>

                {/* Added Items List */}
                {addedItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left p-3 font-medium text-slate-600">Item Details</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-24">Available</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-32">Transfer Qty</th>
                          <th className="text-right p-3 font-medium text-slate-600 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {addedItems.map((item, index) => (
                          <tr key={index} className="border-b last:border-b-0 hover:bg-slate-50/50">
                            <td className="p-3">
                              <p className="font-medium text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">Batch: {item.batch_number} | MRP: {formatCurrency(item.mrp)}</p>
                            </td>
                            <td className="p-3 text-center text-slate-600 font-mono">
                              {item.quantity}
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min="1"
                                max={item.quantity}
                                value={item.transfer_quantity}
                                onChange={(e) => updateItemQuantity(index, e.target.value)}
                                className="h-8 text-center font-bold text-emerald-700"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => removeItem(index)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {addedItems.length > 0 && (
              <div>
                <Label htmlFor="notes">Transfer Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Reason for transfer, person responsible, etc..."
                  className="mt-1"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setTransferDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSubmitTransfer}
                disabled={addedItems.length === 0 || !transferForm.to_id}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                {editingTransfer ? 'Update Transfer' : `Transfer ${addedItems.length} ${addedItems.length === 1 ? 'Item' : 'Items'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTransfer;
