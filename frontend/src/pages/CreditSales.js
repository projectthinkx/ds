import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
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
import { toast } from 'sonner';
import { 
  Plus, CreditCard, AlertCircle, CheckCircle, Clock,
  IndianRupee, User, Calendar, FileText, DollarSign,
  TrendingUp, TrendingDown, History, RefreshCw
} from 'lucide-react';

const CreditSales = ({ user }) => {
  const [creditSales, setCreditSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    branch_id: ''
  });

  // Dialogs
  const [addCreditDialog, setAddCreditDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [paymentHistoryDialog, setPaymentHistoryDialog] = useState(false);

  // Forms
  const [creditForm, setCreditForm] = useState({
    patient_id: '',
    patient_name: '',
    total_amount: '',
    paid_amount: '0',
    credit_period_days: '30',
    branch_id: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchCreditSales();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [patientsRes, branchesRes] = await Promise.all([
        axios.get(`${API}/patients`),
        axios.get(`${API}/branches`)
      ]);
      setPatients(patientsRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchCreditSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.branch_id) params.append('branch_id', filters.branch_id);

      const [salesRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/credit-sales?${params.toString()}`),
        axios.get(`${API}/credit-payments`)
      ]);
      setCreditSales(salesRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      toast.error('Failed to fetch credit sales');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patient_id: creditForm.patient_id,
        patient_name: creditForm.patient_name,
        total_amount: parseFloat(creditForm.total_amount),
        paid_amount: parseFloat(creditForm.paid_amount) || 0,
        credit_period_days: parseInt(creditForm.credit_period_days),
        branch_id: creditForm.branch_id || user?.branch_id || branches[0]?.id || ''
      };

      await axios.post(`${API}/credit-sales`, payload);
      toast.success('Credit sale added');
      setAddCreditDialog(false);
      resetCreditForm();
      fetchCreditSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add credit sale');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedCredit) return;

    try {
      const payload = {
        credit_sale_id: selectedCredit.id,
        amount: parseFloat(paymentForm.amount),
        payment_mode: paymentForm.payment_mode,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes || null
      };

      await axios.post(`${API}/credit-payments`, payload);
      toast.success('Payment recorded');
      setPaymentDialog(false);
      setSelectedCredit(null);
      resetPaymentForm();
      fetchCreditSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const resetCreditForm = () => {
    setCreditForm({
      patient_id: '',
      patient_name: '',
      total_amount: '',
      paid_amount: '0',
      credit_period_days: '30',
      branch_id: ''
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      payment_mode: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const openPaymentDialog = (credit) => {
    setSelectedCredit(credit);
    setPaymentForm({
      ...paymentForm,
      amount: credit.pending_amount.toString()
    });
    setPaymentDialog(true);
  };

  const openPaymentHistory = (credit) => {
    setSelectedCredit(credit);
    setPaymentHistoryDialog(true);
  };

  const handlePatientChange = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setCreditForm({
      ...creditForm,
      patient_id: patientId,
      patient_name: patient?.name || ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status, dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const isOverdue = due < today && status !== 'paid';

    if (status === 'paid') {
      return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
    } else if (isOverdue) {
      return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
    } else if (status === 'partial') {
      return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Summary calculations
  const totalCredit = creditSales.reduce((sum, c) => sum + c.total_amount, 0);
  const totalCollected = creditSales.reduce((sum, c) => sum + c.paid_amount, 0);
  const totalPending = creditSales.reduce((sum, c) => sum + c.pending_amount, 0);
  const overdueCount = creditSales.filter(c => {
    const days = getDaysRemaining(c.due_date);
    return days < 0 && c.status !== 'paid';
  }).length;

  // Filter by tab
  const filteredSales = creditSales.filter(credit => {
    if (activeTab === 'pending') return credit.status !== 'paid';
    if (activeTab === 'paid') return credit.status === 'paid';
    if (activeTab === 'overdue') {
      const days = getDaysRemaining(credit.due_date);
      return days < 0 && credit.status !== 'paid';
    }
    return true;
  });

  // Get payments for selected credit
  const creditPayments = selectedCredit 
    ? payments.filter(p => p.credit_sale_id === selectedCredit.id)
    : [];

  return (
    <div className="space-y-6" data-testid="credit-sales-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Credit Sales
          </h1>
          <p className="mt-2 text-slate-600">Track and manage credit/pending payments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addCreditDialog} onOpenChange={(open) => { setAddCreditDialog(open); if (!open) resetCreditForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-credit-btn">
                <Plus className="w-4 h-4 mr-2" />Add Credit Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Credit Sale</DialogTitle>
                <DialogDescription>Record a new credit sale entry</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCredit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Select value={creditForm.patient_id} onValueChange={handlePatientChange}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} ({patient.patient_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Amount (₹) *</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={creditForm.total_amount} 
                      onChange={(e) => setCreditForm({ ...creditForm, total_amount: e.target.value })} 
                      placeholder="0.00"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Advance Paid (₹)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={creditForm.paid_amount} 
                      onChange={(e) => setCreditForm({ ...creditForm, paid_amount: e.target.value })} 
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Credit Period (Days)</Label>
                    <Select value={creditForm.credit_period_days} onValueChange={(v) => setCreditForm({ ...creditForm, credit_period_days: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="15">15 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="45">45 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select value={creditForm.branch_id} onValueChange={(v) => setCreditForm({ ...creditForm, branch_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => { setAddCreditDialog(false); resetCreditForm(); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Add Credit Sale</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={fetchCreditSales} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Credit</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalCredit)}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <CreditCard className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Collected</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalCollected)}</p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full">
                <TrendingUp className="w-6 h-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Pending</p>
                <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalPending)}</p>
              </div>
              <div className="p-3 bg-amber-200 rounded-full">
                <Clock className="w-6 h-6 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Overdue</p>
                <p className="text-2xl font-bold text-red-700">{overdueCount} entries</p>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="pending">Pending ({creditSales.filter(c => c.status !== 'paid').length})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({overdueCount})</TabsTrigger>
                <TabsTrigger value="paid">Paid ({creditSales.filter(c => c.status === 'paid').length})</TabsTrigger>
                <TabsTrigger value="all">All ({creditSales.length})</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Select value={filters.branch_id} onValueChange={(v) => setFilters({ ...filters, branch_id: v === 'all' ? '' : v })}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Branches" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No credit sales found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Patient</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Total</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Paid</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Pending</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Due Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((credit) => {
                    const daysRemaining = getDaysRemaining(credit.due_date);
                    return (
                      <tr key={credit.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-slate-400" />
                            <div>
                              <p className="font-medium">{credit.patient_name}</p>
                              <p className="text-xs text-slate-500">{credit.patient_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold">{formatCurrency(credit.total_amount)}</td>
                        <td className="py-3 px-4 text-emerald-600 font-medium">{formatCurrency(credit.paid_amount)}</td>
                        <td className="py-3 px-4 text-red-600 font-bold">{formatCurrency(credit.pending_amount)}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p>{formatDate(credit.due_date)}</p>
                            <p className={`text-xs ${daysRemaining < 0 ? 'text-red-500 font-medium' : daysRemaining <= 7 ? 'text-amber-500' : 'text-slate-500'}`}>
                              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : 
                               daysRemaining === 0 ? 'Due today' : 
                               `${daysRemaining} days left`}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(credit.status, credit.due_date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openPaymentHistory(credit)}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            {credit.status !== 'paid' && (
                              <Button 
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => openPaymentDialog(credit)}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />Collect
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={(open) => { setPaymentDialog(open); if (!open) { setSelectedCredit(null); resetPaymentForm(); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedCredit && (
                <span>Patient: <strong>{selectedCredit.patient_name}</strong> | Pending: <strong className="text-red-600">{formatCurrency(selectedCredit.pending_amount)}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  max={selectedCredit?.pending_amount || 0}
                  value={paymentForm.amount} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} 
                  placeholder="0.00"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={paymentForm.payment_mode} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="netbanking">Net Banking</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <Input 
                type="date" 
                value={paymentForm.payment_date} 
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={paymentForm.notes} 
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} 
                placeholder="Optional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => { setPaymentDialog(false); setSelectedCredit(null); resetPaymentForm(); }}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Record Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={paymentHistoryDialog} onOpenChange={(open) => { setPaymentHistoryDialog(open); if (!open) setSelectedCredit(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              {selectedCredit && (
                <span>Patient: <strong>{selectedCredit.patient_name}</strong> | Total: {formatCurrency(selectedCredit.total_amount)}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCredit && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="font-bold">{formatCurrency(selectedCredit.total_amount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500">Paid</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(selectedCredit.paid_amount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500">Pending</p>
                  <p className="font-bold text-red-600">{formatCurrency(selectedCredit.pending_amount)}</p>
                </div>
              </div>
            )}
            
            {creditPayments.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No payments recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {creditPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="flex items-center">
                      <IndianRupee className="w-4 h-4 mr-2 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-700">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-slate-500">{payment.payment_mode} • {formatDate(payment.payment_date)}</p>
                      </div>
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-slate-500 max-w-32 truncate">{payment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditSales;
