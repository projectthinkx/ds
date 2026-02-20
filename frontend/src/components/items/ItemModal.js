import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';

const ItemModal = ({
    open,
    onOpenChange,
    initialData = {},
    editingItem = null,
    itemTypes = [],
    categories = [],
    subcategories = [],
    itemUnits = [],
    onSuccess
}) => {
    const [itemForm, setItemForm] = useState({
        name: '',
        item_type_id: '',
        category_id: '',
        subcategory_id: '',
        unit_id: '',
        gst_percentage: '0',
        hsn_code: '',
        purpose: 'for_sale',
        charges: '',
        duration_minutes: '',
        gst_applicable: false,
        low_stock_warning_enabled: false,
        low_stock_threshold: '',
        expiry_tracking_enabled: false,
        item_status: 'ACTIVE',
        discontinued_reason: ''
    });

    useEffect(() => {
        if (open) {
            if (editingItem) {
                setItemForm({
                    ...editingItem,
                    gst_percentage: (editingItem.gst_percentage || 0).toString(),
                    charges: (editingItem.charges || 0).toString(),
                    duration_minutes: (editingItem.duration_minutes || '').toString(),
                    gst_applicable: !!editingItem.gst_applicable,
                    low_stock_warning_enabled: !!editingItem.low_stock_warning_enabled,
                    low_stock_threshold: editingItem.low_stock_threshold != null ? editingItem.low_stock_threshold.toString() : '',
                    expiry_tracking_enabled: !!editingItem.expiry_tracking_enabled,
                    item_status: editingItem.item_status || 'ACTIVE',
                    discontinued_reason: editingItem.discontinued_reason || ''
                });
            } else {
                setItemForm({
                    name: initialData.name || '',
                    item_type_id: initialData.item_type_id || (itemTypes.length > 0 ? itemTypes[0].id : ''),
                    category_id: initialData.category_id || '',
                    subcategory_id: initialData.subcategory_id || '',
                    unit_id: initialData.unit_id || '',
                    gst_percentage: initialData.gst_percentage || '0',
                    hsn_code: initialData.hsn_code || '',
                    purpose: initialData.purpose || 'for_sale',
                    charges: initialData.charges || '',
                    duration_minutes: initialData.duration_minutes || '',
                    gst_applicable: initialData.gst_applicable || false,
                    low_stock_warning_enabled: initialData.low_stock_warning_enabled || false,
                    low_stock_threshold: initialData.low_stock_threshold || '',
                    expiry_tracking_enabled: initialData.expiry_tracking_enabled || false,
                    item_status: initialData.item_status || 'ACTIVE',
                    discontinued_reason: initialData.discontinued_reason || ''
                });
            }
        }
    }, [open, editingItem, initialData, itemTypes]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (itemForm.low_stock_warning_enabled) {
            const thresh = parseFloat(itemForm.low_stock_threshold);
            if (itemForm.low_stock_threshold === '' || isNaN(thresh) || thresh < 0) {
                toast.error('Please enter a valid threshold quantity (>= 0) for Low Stock Warning');
                return;
            }
        }

        try {
            const payload = {
                ...itemForm,
                gst_percentage: parseFloat(itemForm.gst_percentage) || 0,
                charges: parseFloat(itemForm.charges) || 0,
                duration_minutes: parseInt(itemForm.duration_minutes) || null,
                gst_applicable: !!itemForm.gst_applicable,
                low_stock_warning_enabled: !!itemForm.low_stock_warning_enabled,
                low_stock_threshold: itemForm.low_stock_warning_enabled
                    ? (parseFloat(itemForm.low_stock_threshold) >= 0 ? parseFloat(itemForm.low_stock_threshold) : null)
                    : null,
                item_status: itemForm.item_status || 'ACTIVE',
                discontinued_reason: itemForm.item_status === 'INACTIVE' ? itemForm.discontinued_reason : null
            };

            let response;
            if (editingItem) {
                response = await axios.put(`${API}/item-master/${editingItem.id}`, payload);
                toast.success('Item updated');
            } else {
                response = await axios.post(`${API}/item-master`, payload);
                toast.success('Item added');
            }

            const savedItem = { ...payload, id: editingItem?.id || response.data.id || response.data._id };
            onSuccess(savedItem);
            onOpenChange(false);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save item');
        }
    };

    const filteredCategories = categories.filter(c => c.item_type_id === itemForm.item_type_id);
    const filteredSubcategories = subcategories.filter(s => s.category_id === itemForm.category_id);
    const selectedItemType = itemTypes.find(t => t.id === itemForm.item_type_id);
    const isTreatment = selectedItemType?.name === 'Treatment';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit' : 'Add'} Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Item Name *</Label>
                        <Input
                            value={itemForm.name}
                            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Item Type *</Label>
                        <Select
                            value={itemForm.item_type_id}
                            onValueChange={(v) => setItemForm({ ...itemForm, item_type_id: v, category_id: '', subcategory_id: '' })}
                        >
                            <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                            <SelectContent>
                                {itemTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category *</Label>
                            <Select
                                value={itemForm.category_id}
                                onValueChange={(v) => setItemForm({ ...itemForm, category_id: v, subcategory_id: '' })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                <SelectContent>
                                    {filteredCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Subcategory</Label>
                            <Select
                                value={itemForm.subcategory_id}
                                onValueChange={(v) => setItemForm({ ...itemForm, subcategory_id: v })}
                                disabled={!itemForm.category_id}
                            >
                                <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                                <SelectContent>
                                    {filteredSubcategories.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isTreatment ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Charges *</Label>
                                <Input
                                    type="number"
                                    value={itemForm.charges}
                                    onChange={(e) => setItemForm({ ...itemForm, charges: e.target.value })}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (mins)</Label>
                                <Input
                                    type="number"
                                    value={itemForm.duration_minutes}
                                    onChange={(e) => setItemForm({ ...itemForm, duration_minutes: e.target.value })}
                                    placeholder="30"
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-4">
                                <Switch
                                    checked={itemForm.gst_applicable}
                                    onCheckedChange={(v) => setItemForm({ ...itemForm, gst_applicable: v })}
                                />
                                <Label>GST Applicable</Label>
                            </div>
                            {itemForm.gst_applicable && (
                                <div className="space-y-2">
                                    <Label>GST Percentage</Label>
                                    <Select
                                        value={itemForm.gst_percentage}
                                        onValueChange={(v) => setItemForm({ ...itemForm, gst_percentage: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0%</SelectItem>
                                            <SelectItem value="5">5%</SelectItem>
                                            <SelectItem value="12">12%</SelectItem>
                                            <SelectItem value="18">18%</SelectItem>
                                            <SelectItem value="28">28%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Unit *</Label>
                                <Select
                                    value={itemForm.unit_id}
                                    onValueChange={(v) => setItemForm({ ...itemForm, unit_id: v })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                                    <SelectContent>
                                        {itemUnits.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>GST %</Label>
                                <Select
                                    value={itemForm.gst_percentage}
                                    onValueChange={(v) => setItemForm({ ...itemForm, gst_percentage: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">0%</SelectItem>
                                        <SelectItem value="5">5%</SelectItem>
                                        <SelectItem value="12">12%</SelectItem>
                                        <SelectItem value="18">18%</SelectItem>
                                        <SelectItem value="28">28%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>HSN Code</Label>
                            <Input
                                value={itemForm.hsn_code}
                                onChange={(e) => setItemForm({ ...itemForm, hsn_code: e.target.value })}
                                placeholder="e.g., 30049099"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Purpose *</Label>
                            <Select
                                value={itemForm.purpose}
                                onValueChange={(v) => setItemForm({ ...itemForm, purpose: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="for_sale">For Sale</SelectItem>
                                    <SelectItem value="internal_use">Internal Use</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status *</Label>
                            <Select
                                value={itemForm.item_status}
                                onValueChange={(v) => setItemForm({ ...itemForm, item_status: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive (Discontinued)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {itemForm.item_status === 'INACTIVE' && (
                            <div className="space-y-2">
                                <Label>Discontinued Reason</Label>
                                <Input
                                    value={itemForm.discontinued_reason}
                                    onChange={(e) => setItemForm({ ...itemForm, discontinued_reason: e.target.value })}
                                    placeholder="e.g., No longer supplied"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={!!itemForm.low_stock_warning_enabled}
                                    onCheckedChange={(v) => setItemForm({ ...itemForm, low_stock_warning_enabled: v, low_stock_threshold: v ? itemForm.low_stock_threshold : '' })}
                                />
                                <Label className="text-slate-800 font-medium">Low Stock Warning</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={!!itemForm.expiry_tracking_enabled}
                                    onCheckedChange={(v) => setItemForm({ ...itemForm, expiry_tracking_enabled: v })}
                                />
                                <Label className="text-slate-800 font-medium">Expiry Tracking</Label>
                            </div>
                        </div>

                        {itemForm.low_stock_warning_enabled && (
                            <div className="space-y-1 mt-2">
                                <Label>Low Stock Threshold *</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={itemForm.low_stock_threshold}
                                    onChange={(e) => setItemForm({ ...itemForm, low_stock_threshold: e.target.value })}
                                    placeholder="Enter minimum quantity"
                                />
                                <p className="text-xs text-slate-500">Alerts when stock falls at or below this quantity.</p>
                            </div>
                        )}

                        {itemForm.expiry_tracking_enabled && (
                            <div className="p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
                                <strong>Note:</strong> Expiry date will be mandatory for this item in Purchase Entry.
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{editingItem ? 'Update' : 'Add'}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ItemModal;
