import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package, Search, RotateCcw, Calendar, Truck } from 'lucide-react';

const LabOrders = ({ user }) => {
  const [labOrders, setLabOrders] = useState([]);
  const [dentalLabs, setDentalLabs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderDialog, setOrderDialog] = useState(false);
  const [returnDialog, setReturnDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [orderForm, setOrderForm] = useState({
    lab_id: '', patient_id: '', patient_name: '', doctor_id: '', doctor_name: '',
    work_type: '', work_description: '', teeth_numbers: '', shade: '', material: '',
    order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '',
    notes: ''
  });

  const [returnForm, setReturnForm] = useState({
    return_date: new Date().toISOString().split('T')[0],
    return_reason: '',
    return_notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, labsRes, patientsRes, doctorsRes, workTypesRes, materialsRes] = await Promise.all([
        axios.get(`${API}/lab-orders`),
        axios.get(`${API}/dental-labs`),
        axios.get(`${API}/patients`),
        axios.get(`${API}/doctors`).catch(() => ({ data: [] })),
        axios.get(`${API}/lab-work-types`).catch(() => ({ data: [] })),
        axios.get(`${API}/lab-materials`).catch(() => ({ data: [] })),
      ]);
      setLabOrders(ordersRes.data);
      setDentalLabs(labsRes.data);
      setPatients(patientsRes.data);
      setDoctors(doctorsRes.data);
      setWorkTypes(workTypesRes.data);
      setMaterials(materialsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderForm.lab_id) {
      toast.error('Please select a lab');
      return;
    }

    try {
      const lab = dentalLabs.find(l => l.id === orderForm.lab_id);
      const payload = {
        ...orderForm,
        lab_name: lab?.name || '',
        invoice_amount: 0,
        paid_amount: 0,
      };

      if (editingOrder) {
        await axios.put(`${API}/lab-orders/${editingOrder.id}`, payload);
        toast.success('Order updated');
      } else {
        await axios.post(`${API}/lab-orders`, payload);
        toast.success('Order created');
      }

      setOrderDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 
                  Array.isArray(detail) ? detail.map(d => d.msg || d).join(', ') : 
                  'Failed to save order';
      toast.error(msg);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await axios.patch(`${API}/lab-orders/${orderId}/status?status=${status}`);
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleReturnOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await axios.put(`${API}/lab-orders/${selectedOrder.id}`, {
        ...selectedOrder,
        status: 'returned',
        return_date: returnForm.return_date,
        return_reason: returnForm.return_reason,
        notes: `${selectedOrder.notes || ''}\n[RETURN] ${returnForm.return_reason} - ${returnForm.return_notes}`.trim(),
      });
      toast.success('Order marked as returned');
      setReturnDialog(false);
      setSelectedOrder(null);
      setReturnForm({ return_date: new Date().toISOString().split('T')[0], return_reason: '', return_notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to process return');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    try {
      await axios.delete(`${API}/lab-orders/${id}`);
      toast.success('Order deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setOrderForm({
      lab_id: '', patient_id: '', patient_name: '', doctor_id: '', doctor_name: '',
      work_type: '', work_description: '', teeth_numbers: '', shade: '', material: '',
      order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '',
      notes: ''
    });
    setEditingOrder(null);
  };

  const filteredOrders = labOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = !searchTerm || 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.lab_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.work_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'ordered': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-amber-100 text-amber-700';
      case 'ready': return 'bg-emerald-100 text-emerald-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'returned': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lab Orders</h1>
          <p className="text-slate-500">Track dental lab work orders</p>
        </div>
        <Dialog open={orderDialog} onOpenChange={(o) => { setOrderDialog(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Edit' : 'New'} Lab Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lab_id">Dental Lab *</Label>
                  <select
                    id="lab_id"
                    value={orderForm.lab_id}
                    onChange={(e) => setOrderForm({ ...orderForm, lab_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                    aria-label="Select dental lab"
                  >
                    <option value="">Select lab</option>
                    {dentalLabs.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_type">Work Type *</Label>
                  <select
                    id="work_type"
                    value={orderForm.work_type}
                    onChange={(e) => setOrderForm({ ...orderForm, work_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                    aria-label="Select work type"
                  >
                    <option value="">Select work type</option>
                    {workTypes.map(wt => <option key={wt.id} value={wt.name}>{wt.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient</Label>
                  <select
                    id="patient_id"
                    value={orderForm.patient_id}
                    onChange={(e) => {
                      const patient = patients.find(p => p.id === e.target.value);
                      setOrderForm({ ...orderForm, patient_id: e.target.value, patient_name: patient?.name || '' });
                    }}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    aria-label="Select patient"
                  >
                    <option value="">Select patient</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.patient_id})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient_name">Or Enter Name</Label>
                  <Input id="patient_name" value={orderForm.patient_name} onChange={(e) => setOrderForm({ ...orderForm, patient_name: e.target.value })} placeholder="Patient name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doctor_id">Doctor</Label>
                  <select
                    id="doctor_id"
                    value={orderForm.doctor_id}
                    onChange={(e) => {
                      const doctor = doctors.find(d => d.id === e.target.value);
                      setOrderForm({ ...orderForm, doctor_id: e.target.value, doctor_name: doctor?.name || '' });
                    }}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    aria-label="Select doctor"
                  >
                    <option value="">Select doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_name">Or Enter Name</Label>
                  <Input id="doctor_name" value={orderForm.doctor_name} onChange={(e) => setOrderForm({ ...orderForm, doctor_name: e.target.value })} placeholder="Doctor name" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teeth_numbers">Teeth Numbers</Label>
                  <Input id="teeth_numbers" value={orderForm.teeth_numbers} onChange={(e) => setOrderForm({ ...orderForm, teeth_numbers: e.target.value })} placeholder="e.g., 11, 21" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shade">Shade</Label>
                  <Input id="shade" value={orderForm.shade} onChange={(e) => setOrderForm({ ...orderForm, shade: e.target.value })} placeholder="e.g., A2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <select
                    id="material"
                    value={orderForm.material}
                    onChange={(e) => setOrderForm({ ...orderForm, material: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    aria-label="Select material"
                  >
                    <option value="">Select material</option>
                    {materials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_description">Work Description</Label>
                <Input id="work_description" value={orderForm.work_description} onChange={(e) => setOrderForm({ ...orderForm, work_description: e.target.value })} placeholder="Detailed description" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order_date">Order Date *</Label>
                  <Input id="order_date" type="date" value={orderForm.order_date} onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_delivery_date">Expected Delivery</Label>
                  <Input id="expected_delivery_date" type="date" value={orderForm.expected_delivery_date} onChange={(e) => setOrderForm({ ...orderForm, expected_delivery_date: e.target.value })} />
                </div>
              </div>


              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} placeholder="Additional notes" />
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                {editingOrder ? 'Update' : 'Create'} Order
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">Ordered</p>
            <p className="text-2xl font-bold text-blue-700">{labOrders.filter(o => o.status === 'ordered').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm text-amber-600">In Progress</p>
            <p className="text-2xl font-bold text-amber-700">{labOrders.filter(o => o.status === 'in_progress').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-600">Ready</p>
            <p className="text-2xl font-bold text-emerald-700">{labOrders.filter(o => o.status === 'ready').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Delivered</p>
            <p className="text-2xl font-bold text-green-700">{labOrders.filter(o => o.status === 'delivered').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">Returned</p>
            <p className="text-2xl font-bold text-red-700">{labOrders.filter(o => o.status === 'returned').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by order #, patient, lab, or work type..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search orders"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-[180px] h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              aria-label="Filter by status"
            >
              <option value="all">All Orders</option>
              <option value="ordered">Ordered</option>
              <option value="in_progress">In Progress</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        </CardContent>
      </Card>


      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left py-3 px-4">Order #</th>
                  <th className="text-left py-3 px-4">Lab</th>
                  <th className="text-left py-3 px-4">Patient</th>
                  <th className="text-left py-3 px-4">Work Type</th>
                  <th className="text-left py-3 px-4">Order Date</th>
                  <th className="text-left py-3 px-4">Expected</th>
                  <th className="text-left py-3 px-4">Delivered</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs font-medium">{order.order_number}</td>
                    <td className="py-3 px-4 font-medium">{order.lab_name}</td>
                    <td className="py-3 px-4">
                      <p>{order.patient_name || '-'}</p>
                      {order.doctor_name && <p className="text-xs text-slate-500">Dr. {order.doctor_name}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs capitalize">{order.work_type?.replace('_', ' ')}</span>
                      {order.teeth_numbers && <p className="text-xs text-slate-500 mt-1">Teeth: {order.teeth_numbers}</p>}
                      {order.shade && <p className="text-xs text-slate-500">Shade: {order.shade}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(order.order_date).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {order.expected_delivery_date ? (
                        <div className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-slate-400" />
                          {new Date(order.expected_delivery_date).toLocaleDateString('en-IN')}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {order.actual_delivery_date ? (
                        <span className="text-emerald-600">{new Date(order.actual_delivery_date).toLocaleDateString('en-IN')}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`h-8 px-2 text-xs rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${getStatusColor(order.status)}`}
                        aria-label={`Change status for order ${order.order_number}`}
                      >
                        <option value="ordered">Ordered</option>
                        <option value="in_progress">In Progress</option>
                        <option value="ready">Ready</option>
                        <option value="delivered">Delivered</option>
                        <option value="returned">Returned</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setSelectedOrder(order); setReturnDialog(true); }}
                          title="Return Order"
                          aria-label="Return order"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { 
                            setEditingOrder(order); 
                            setOrderForm({ ...order }); 
                            setOrderDialog(true); 
                          }}
                          aria-label="Edit order"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(order.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No orders found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Return Dialog */}
      <Dialog open={returnDialog} onOpenChange={(o) => { setReturnDialog(o); if (!o) setSelectedOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReturnOrder} className="space-y-4">
            {selectedOrder && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p><strong>Order:</strong> {selectedOrder.order_number}</p>
                <p><strong>Lab:</strong> {selectedOrder.lab_name}</p>
                <p><strong>Work:</strong> {selectedOrder.work_type}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="return_date">Return Date</Label>
              <Input id="return_date" type="date" value={returnForm.return_date} onChange={(e) => setReturnForm({ ...returnForm, return_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return_reason">Return Reason *</Label>
              <select
                id="return_reason"
                value={returnForm.return_reason}
                onChange={(e) => setReturnForm({ ...returnForm, return_reason: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
                aria-label="Select return reason"
              >
                <option value="">Select reason</option>
                <option value="poor_fit">Poor Fit</option>
                <option value="wrong_shade">Wrong Shade</option>
                <option value="defective">Defective/Broken</option>
                <option value="wrong_design">Wrong Design</option>
                <option value="patient_rejection">Patient Rejection</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return_notes">Notes</Label>
              <Input id="return_notes" value={returnForm.return_notes} onChange={(e) => setReturnForm({ ...returnForm, return_notes: e.target.value })} placeholder="Additional details" />
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
              <RotateCcw className="w-4 h-4 mr-2" />Mark as Returned
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabOrders;
