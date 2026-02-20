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
import { toast } from 'sonner';
import { Plus, Trash2, ShoppingCart, Calendar } from 'lucide-react';

const PharmacySales = ({ user }) => {
  const [sales, setSales] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    prescription_number: '',
    payment_mode: 'cash',
    branch_id: user?.branch_id || '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, medicinesRes, patientsRes, branchesRes] = await Promise.all([
        axios.get(`${API}/pharmacy-sales`),
        axios.get(`${API}/medicines`),
        axios.get(`${API}/patients`),
        axios.get(`${API}/branches`),
      ]);
      setSales(salesRes.data);
      setMedicines(medicinesRes.data);
      setPatients(patientsRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (medicine) => {
    const existing = cartItems.find((item) => item.medicine_id === medicine.id);
    if (existing) {
      setCartItems(
        cartItems.map((item) =>
          item.medicine_id === medicine.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          medicine_id: medicine.id,
          medicine_name: medicine.name,
          batch_number: medicine.batch_number,
          mrp: medicine.mrp,
          expiry_date: medicine.expiry_date,
          quantity: 1,
          unit_price: medicine.unit_price,
          gst_percentage: medicine.gst_percentage,
        },
      ]);
    }
    toast.success(`${medicine.name} added to cart`);
  };

  const updateQuantity = (medicineId, quantity) => {
    if (quantity <= 0) {
      setCartItems(cartItems.filter((item) => item.medicine_id !== medicineId));
    } else {
      setCartItems(
        cartItems.map((item) =>
          item.medicine_id === medicineId ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeFromCart = (medicineId) => {
    setCartItems(cartItems.filter((item) => item.medicine_id !== medicineId));
    toast.success('Item removed from cart');
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let gstAmount = 0;

    cartItems.forEach((item) => {
      const itemTotal = item.unit_price * item.quantity;
      subtotal += itemTotal;
      gstAmount += (itemTotal * item.gst_percentage) / 100;
    });

    return {
      subtotal: subtotal.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      total: (subtotal + gstAmount).toFixed(2),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      toast.error('Please add items to cart');
      return;
    }

    const totals = calculateTotals();

    try {
      await axios.post(`${API}/pharmacy-sales`, {
        ...formData,
        items: cartItems,
        subtotal: parseFloat(totals.subtotal),
        gst_amount: parseFloat(totals.gstAmount),
        total_amount: parseFloat(totals.total),
      });

      toast.success('Sale recorded successfully!');
      window.dispatchEvent(new Event('billingUpdated'));
      setOpen(false);
      setCartItems([]);
      setFormData({
        patient_id: '',
        patient_name: '',
        prescription_number: '',
        payment_mode: 'cash',
        branch_id: user?.branch_id || '',
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to record sale');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6" data-testid="pharmacy-sales-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Pharmacy Sales
          </h1>
          <p className="mt-2 text-slate-600">Record medicine sales and generate bills</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="new-sale-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Pharmacy Sale</DialogTitle>
              <DialogDescription>Add medicines to cart and complete the sale</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Patient</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) => {
                      const patient = patients.find(p => p.id === value);
                      setFormData({
                        ...formData,
                        patient_id: value,
                        patient_name: patient?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} - {patient.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patient_name">Patient Name *</Label>
                  <Input
                    id="patient_name"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    placeholder="Enter patient name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prescription_number">Prescription Number</Label>
                  <Input
                    id="prescription_number"
                    value={formData.prescription_number}
                    onChange={(e) => setFormData({ ...formData, prescription_number: e.target.value })}
                    placeholder="RX-2024-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_mode">Payment Mode *</Label>
                  <Select
                    value={formData.payment_mode}
                    onValueChange={(value) => setFormData({ ...formData, payment_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="netbanking">Net Banking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Branch *</Label>
                  <Select
                    value={formData.branch_id}
                    onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Select Medicines</h3>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                  {medicines.map((medicine) => (
                    <Button
                      key={medicine.id}
                      type="button"
                      variant="outline"
                      onClick={() => addToCart(medicine)}
                      className="justify-start text-left h-auto py-2"
                      disabled={medicine.stock_quantity <= 0}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{medicine.name}</div>
                        <div className="text-xs text-slate-500">
                          {formatCurrency(medicine.unit_price)} | Stock: {medicine.stock_quantity}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {cartItems.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Cart Items
                  </h3>
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div
                        key={item.medicine_id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.medicine_name}</div>
                          <div className="text-sm text-slate-600">
                            {formatCurrency(item.unit_price)} × {item.quantity} = {formatCurrency(item.unit_price * item.quantity)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.medicine_id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.medicine_id, item.quantity + 1)}
                          >
                            +
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeFromCart(item.medicine_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-emerald-50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>GST Amount:</span>
                      <span className="font-medium">{formatCurrency(totals.gstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-emerald-600">{formatCurrency(totals.total)}</span>
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
                  disabled={cartItems.length === 0}
                >
                  Complete Sale
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Sales</CardTitle>
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">{sales.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">
              {formatCurrency(sales.reduce((sum, s) => sum + s.total_amount, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Sale Value</CardTitle>
            <ShoppingCart className="w-5 h-5 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">
              {formatCurrency(
                sales.length > 0 ? sales.reduce((sum, s) => sum + s.total_amount, 0) / sales.length : 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-600">Loading sales...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-slate-600">No sales recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Patient</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Items</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Payment</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Rx Number</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-slate-100 table-row">
                      <td className="py-3 px-4 text-sm text-slate-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(sale.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">
                        {sale.patient_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{sale.items.length} item(s)</td>
                      <td className="py-3 px-4 text-sm font-semibold text-emerald-600">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium capitalize">
                          {sale.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {sale.prescription_number || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PharmacySales;
