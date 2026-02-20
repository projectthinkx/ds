import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Calendar, DollarSign, CreditCard, Wallet, Banknote,
  Stethoscope, Pill, Users, FileText, Printer, ChevronDown, ChevronUp, Building2, TrendingDown
} from 'lucide-react';
import ShiftManager from '../components/ShiftManager';

const DailyReport = ({ user }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedPatients, setExpandedPatients] = useState({});
  const [branches, setBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [shiftKey, setShiftKey] = useState(0);

  const isAdmin = user?.role === 'admin';
  const isBranchManager = user?.role === 'branch_manager';

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedDate, selectedBranches]);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
      // Non-admin users: auto-select their branch
      if (!isAdmin && user?.branch_id) {
        setSelectedBranches([user.branch_id]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { date: selectedDate };
      if (selectedBranches.length > 0) {
        params.branch_ids = selectedBranches.join(',');
      }
      const response = await axios.get(`${API}/daily-report`, { params });
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to fetch daily report');
    } finally {
      setLoading(false);
    }
  };

  const toggleBranch = (branchId) => {
    setSelectedBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const togglePatient = (patientId) => {
    setExpandedPatients(prev => ({
      ...prev,
      [patientId]: !prev[patientId]
    }));
  };

  const getPaymentModeIcon = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'upi': return <Wallet className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentModeBadgeColor = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'cash': return 'bg-green-100 text-green-700';
      case 'card': return 'bg-blue-100 text-blue-700';
      case 'upi': return 'bg-purple-100 text-purple-700';
      case 'netbanking': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShiftChange = () => {
    setShiftKey(prev => prev + 1);
    fetchReport();
  };

  if (loading && !reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const summary = reportData?.summary || {};
  const patients = reportData?.patients || [];

  // Dynamic Column Extraction for multiple UPI IDs and Card machines
  const dynamicUPIs = [...new Set(patients.flatMap(p =>
    (p.collections || []).filter(c => c.payment_mode === 'upi').map(c => c.upi_id || 'Other')
  ))].sort();

  const dynamicCards = [...new Set(patients.flatMap(p =>
    (p.collections || []).filter(c => c.payment_mode === 'card').map(c => c.bank_name || 'Other')
  ))].sort();

  return (
    <div className="space-y-6 print:space-y-4" data-testid="daily-report-page">
      {/* Shift Manager - Start Shift / Pending Handovers */}
      <div className="print:hidden">
        <ShiftManager
          key={shiftKey}
          user={user}
          branches={branches}
          onShiftChange={handleShiftChange}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Daily Report
          </h1>
          <p className="mt-2 text-slate-600">Daily handover summary - Patient-wise breakdown</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Branch Selection - Only for admin or multi-branch users */}
      {isAdmin && branches.length > 0 && (
        <Card className="print:hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-slate-700">Select Clinic(s):</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {branches.map((branch) => (
                  <label key={branch.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(branch.id)}
                      onChange={() => toggleBranch(branch.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">{branch.name}</span>
                  </label>
                ))}
              </div>
              {selectedBranches.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBranches([])}
                  className="text-slate-500"
                >
                  Clear All
                </Button>
              )}
            </div>
            {selectedBranches.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                Select at least one clinic to view the report
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Non-admin branch info */}
      {!isAdmin && user?.branch_id && (
        <div className="flex items-center gap-2 text-sm text-slate-600 print:hidden">
          <Building2 className="w-4 h-4" />
          <span>Clinic: {branches.find(b => b.id === user.branch_id)?.name || 'Your Branch'}</span>
        </div>
      )}

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">Daily Report</h1>
        <p className="text-sm text-gray-600">{formatDate(selectedDate)}</p>
        <p className="text-sm text-gray-600">User: {user?.name || user?.email}</p>
        {selectedBranches.length > 0 && (
          <p className="text-sm text-gray-600">
            Clinics: {selectedBranches.map(id => branches.find(b => b.id === id)?.name).filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:grid-cols-5">
        <Card className="print:border print:shadow-none">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Treatment</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.total_treatment_amount)}</p>
              </div>
              <Stethoscope className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="print:border print:shadow-none">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pharmacy</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(summary.total_pharmacy_amount)}</p>
              </div>
              <Pill className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="print:border print:shadow-none">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Amount</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.total_amount)}</p>
              </div>
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="print:border print:shadow-none">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Collected</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.total_collected)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="print:border print:shadow-none">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Expenses</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(summary.total_expenses)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="print:border print:shadow-none bg-slate-900 border-slate-900">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-300">Net Cash</p>
                <p className="text-xl font-bold text-white">{formatCurrency(summary.net_collection)}</p>
              </div>
              <Wallet className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Mode Breakdown */}
      <Card className="print:border print:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Collection by Payment Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
              <Banknote className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-green-600">Cash</p>
                <p className="font-bold text-green-700">{formatCurrency(summary.payment_modes?.cash)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600">Card</p>
                <p className="font-bold text-blue-700">{formatCurrency(summary.payment_modes?.card)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg">
              <Wallet className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-purple-600">UPI</p>
                <p className="font-bold text-purple-700">{formatCurrency(summary.payment_modes?.upi)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-indigo-600">Net Banking</p>
                <p className="font-bold text-indigo-700">{formatCurrency(summary.payment_modes?.netbanking)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient-wise Breakdown */}
      <Card className="print:border print:shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Patient-wise Breakdown ({patients.length} patients)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No transactions for this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patients.map((patient) => (
                <div key={patient.patient_id} className="border rounded-lg overflow-hidden">
                  {/* Patient Header - Clickable */}
                  <div
                    className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 print:cursor-default"
                    onClick={() => togglePatient(patient.patient_id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-emerald-700 font-semibold">
                          {patient.patient_name?.charAt(0)?.toUpperCase() || 'P'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">{patient.patient_name}</p>
                        <p className="text-xs text-slate-500">ID: {patient.patient_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Treatment</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(patient.treatment_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Pharmacy</p>
                        <p className="font-semibold text-purple-600">{formatCurrency(patient.pharmacy_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Collected</p>
                        <p className="font-semibold text-emerald-600">{formatCurrency(patient.paid_amount)}</p>
                      </div>
                      <div className="text-center px-2 py-1 bg-green-50 rounded border border-green-100 min-w-[70px]">
                        <p className="text-[10px] text-green-600 font-medium">Cash</p>
                        <p className="text-sm font-bold text-green-700">{formatCurrency(patient.cash)}</p>
                      </div>

                      {/* Dynamic UPI Columns */}
                      {dynamicUPIs.map(upi => {
                        const amount = (patient.collections || [])
                          .filter(c => c.payment_mode === 'upi' && (c.upi_id === upi || (!c.upi_id && upi === 'Other')))
                          .reduce((sum, c) => sum + (c.amount || 0), 0);
                        return (
                          <div key={upi} className="text-center px-2 py-1 bg-purple-50 rounded border border-purple-100 min-w-[70px]">
                            <p className="text-[10px] text-purple-600 font-medium truncate max-w-[80px]" title={upi}>{upi === 'Other' ? 'UPI' : `UPI: ${upi}`}</p>
                            <p className="text-sm font-bold text-purple-700">{formatCurrency(amount)}</p>
                          </div>
                        );
                      })}

                      {/* Dynamic Card Columns */}
                      {dynamicCards.map(bank => {
                        const amount = (patient.collections || [])
                          .filter(c => c.payment_mode === 'card' && (c.bank_name === bank || (!c.bank_name && bank === 'Other')))
                          .reduce((sum, c) => sum + (c.amount || 0), 0);
                        return (
                          <div key={bank} className="text-center px-2 py-1 bg-blue-50 rounded border border-blue-100 min-w-[70px]">
                            <p className="text-[10px] text-blue-600 font-medium truncate max-w-[80px]" title={bank}>{bank === 'Other' ? 'Card' : `Card: ${bank}`}</p>
                            <p className="text-sm font-bold text-blue-700">{formatCurrency(amount)}</p>
                          </div>
                        );
                      })}

                      {/* Generic columns if no dynamic data found (fallback) */}
                      {dynamicUPIs.length === 0 && (
                        <div className="text-center px-2 py-1 bg-purple-50 rounded border border-purple-100 min-w-[70px]">
                          <p className="text-[10px] text-purple-600 font-medium">UPI</p>
                          <p className="text-sm font-bold text-purple-700">{formatCurrency(patient.upi)}</p>
                        </div>
                      )}
                      {dynamicCards.length === 0 && (
                        <div className="text-center px-2 py-1 bg-blue-50 rounded border border-blue-100 min-w-[70px]">
                          <p className="text-[10px] text-blue-600 font-medium">Card</p>
                          <p className="text-sm font-bold text-blue-700">{formatCurrency(patient.card)}</p>
                        </div>
                      )}

                      <div className="text-center px-2 py-1 bg-indigo-50 rounded border border-indigo-100 min-w-[70px]">
                        <p className="text-[10px] text-indigo-600 font-medium">NetBanking</p>
                        <p className="text-sm font-bold text-indigo-700">{formatCurrency(patient.netbanking)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">BalanceToday</p>
                        <p className={`font-semibold ${patient.balance_amount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {formatCurrency(patient.balance_amount)}
                        </p>
                      </div>
                      <div className="print:hidden">
                        {expandedPatients[patient.patient_id] ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Patient Collections - Expandable */}
                  {(expandedPatients[patient.patient_id] || true) && patient.collections.length > 0 && (
                    <div className={`border-t bg-white ${expandedPatients[patient.patient_id] ? 'block' : 'hidden print:block'}`}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600">
                            <th className="text-left py-2 px-3">Type</th>
                            <th className="text-left py-2 px-3">Reference</th>
                            <th className="text-right py-2 px-3">Amount</th>
                            <th className="text-center py-2 px-3">Payment Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patient.collections.map((collection, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="py-2 px-3">
                                <Badge className={collection.type === 'Treatment' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                                  {collection.type}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 font-mono text-xs text-slate-500">
                                {collection.bill_id || collection.sale_id || '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold">
                                {formatCurrency(collection.amount)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <Badge className={getPaymentModeBadgeColor(collection.payment_mode)}>
                                  <div className="flex flex-col items-center">
                                    <span className="flex items-center gap-1">
                                      {getPaymentModeIcon(collection.payment_mode)}
                                      {collection.payment_mode}
                                    </span>
                                    {collection.upi_id && (
                                      <span className="text-[10px] font-mono opacity-80 border-t border-current mt-0.5 pt-0.5">
                                        ID: {collection.upi_id}
                                      </span>
                                    )}
                                    {collection.reference_number && (
                                      <span className="text-[10px] font-mono opacity-80 border-t border-current mt-0.5 pt-0.5">
                                        Ref: {collection.reference_number}
                                      </span>
                                    )}
                                  </div>
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Grand Total Row */}
          {patients.length > 0 && (
            <div className="border rounded-lg overflow-hidden mt-4 shadow-sm">
              <div className="flex items-center justify-between p-3 bg-slate-900 text-white print:bg-slate-200 print:text-black">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center print:bg-slate-300">
                    <TrendingDown className="w-5 h-5 text-emerald-400 print:text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Grand Total</p>
                    <p className="text-xs text-slate-400 print:text-slate-600">All Patients</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 print:text-slate-600">Treatment</p>
                    <p className="font-bold text-blue-400 print:text-blue-700">{formatCurrency(patients.reduce((sum, p) => sum + (p.treatment_amount || 0), 0))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 print:text-slate-600">Pharmacy</p>
                    <p className="font-bold text-purple-400 print:text-purple-700">{formatCurrency(patients.reduce((sum, p) => sum + (p.pharmacy_amount || 0), 0))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 print:text-slate-600">Collected</p>
                    <p className="font-bold text-emerald-400 print:text-emerald-700">{formatCurrency(patients.reduce((sum, p) => sum + (p.paid_amount || 0), 0))}</p>
                  </div>

                  <div className="text-center px-2 py-1 bg-green-900/50 rounded border border-green-800 min-w-[70px] print:bg-green-100 print:border-green-200">
                    <p className="text-[10px] text-green-400 font-medium print:text-green-800">Cash</p>
                    <p className="text-sm font-bold text-green-300 print:text-green-900">{formatCurrency(patients.reduce((sum, p) => sum + (p.cash || 0), 0))}</p>
                  </div>

                  {/* Dynamic UPI Totals */}
                  {dynamicUPIs.map(upi => {
                    const totalAmount = patients.reduce((sum, p) => {
                      const pInternalSum = (p.collections || [])
                        .filter(c => c.payment_mode === 'upi' && (c.upi_id === upi || (!c.upi_id && upi === 'Other')))
                        .reduce((s, c) => s + (c.amount || 0), 0);
                      return sum + pInternalSum;
                    }, 0);
                    return (
                      <div key={upi} className="text-center px-2 py-1 bg-purple-900/50 rounded border border-purple-800 min-w-[70px] print:bg-purple-100 print:border-purple-200">
                        <p className="text-[10px] text-purple-400 font-medium truncate max-w-[80px] print:text-purple-800">{upi === 'Other' ? 'UPI' : `UPI`}</p>
                        <p className="text-sm font-bold text-purple-300 print:text-purple-900">{formatCurrency(totalAmount)}</p>
                      </div>
                    );
                  })}

                  {/* Dynamic Card Totals */}
                  {dynamicCards.map(bank => {
                    const totalAmount = patients.reduce((sum, p) => {
                      const pInternalSum = (p.collections || [])
                        .filter(c => c.payment_mode === 'card' && (c.bank_name === bank || (!c.bank_name && bank === 'Other')))
                        .reduce((s, c) => s + (c.amount || 0), 0);
                      return sum + pInternalSum;
                    }, 0);
                    return (
                      <div key={bank} className="text-center px-2 py-1 bg-blue-900/50 rounded border border-blue-800 min-w-[70px] print:bg-blue-100 print:border-blue-200">
                        <p className="text-[10px] text-blue-400 font-medium truncate max-w-[80px] print:text-blue-800">{bank === 'Other' ? 'Card' : `Card`}</p>
                        <p className="text-sm font-bold text-blue-300 print:text-blue-900">{formatCurrency(totalAmount)}</p>
                      </div>
                    );
                  })}

                  {/* Generic UPI/Card Fallbacks if needed */}
                  {dynamicUPIs.length === 0 && (
                    <div className="text-center px-2 py-1 bg-purple-900/50 rounded border border-purple-800 min-w-[70px] print:bg-purple-100 print:border-purple-200">
                      <p className="text-[10px] text-purple-400 font-medium print:text-purple-800">UPI</p>
                      <p className="text-sm font-bold text-purple-300 print:text-purple-900">{formatCurrency(patients.reduce((sum, p) => sum + (p.upi || 0), 0))}</p>
                    </div>
                  )}
                  {dynamicCards.length === 0 && (
                    <div className="text-center px-2 py-1 bg-blue-900/50 rounded border border-blue-800 min-w-[70px] print:bg-blue-100 print:border-blue-200">
                      <p className="text-[10px] text-blue-400 font-medium print:text-blue-800">Card</p>
                      <p className="text-sm font-bold text-blue-300 print:text-blue-900">{formatCurrency(patients.reduce((sum, p) => sum + (p.card || 0), 0))}</p>
                    </div>
                  )}

                  <div className="text-center px-2 py-1 bg-indigo-900/50 rounded border border-indigo-800 min-w-[70px] print:bg-indigo-100 print:border-indigo-200">
                    <p className="text-[10px] text-indigo-400 font-medium print:text-indigo-800">NetBanking</p>
                    <p className="text-sm font-bold text-indigo-300 print:text-indigo-900">{formatCurrency(patients.reduce((sum, p) => sum + (p.netbanking || 0), 0))}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400 print:text-slate-600">Balance</p>
                    <div className="flex gap-2 justify-end">
                      <p className={`font-bold ${patients.reduce((sum, p) => sum + p.balance_amount, 0) > 0 ? 'text-red-400 print:text-red-700' : 'text-slate-400 print:text-slate-600'}`}>
                        {formatCurrency(patients.reduce((sum, p) => sum + p.balance_amount, 0))}
                      </p>
                      <div className="w-5" /> {/* Spacer for chevron alignment */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Footer */}
      <div className="hidden print:block text-center mt-8 pt-4 border-t">
        <p className="text-sm text-gray-500">
          Generated on {new Date().toLocaleString('en-IN')} | DentalSuthra
        </p>
      </div>
    </div>
  );
};

export default DailyReport;
