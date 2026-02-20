import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  BarChart3, TrendingUp, TrendingDown, IndianRupee,
  Calendar, Filter, Download, RefreshCw, FileText,
  ShoppingCart, CreditCard, PieChart, Wallet, Pill,
  Stethoscope, ArrowRightLeft, Package, FileSpreadsheet,
  User, Search, Printer
} from 'lucide-react';

const Reports = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [godowns, setGodowns] = useState([]);

  // List data states
  const [purchaseList, setPurchaseList] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [treatmentList, setTreatmentList] = useState([]);
  const [transferList, setTransferList] = useState([]);

  // Patient search states
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientBills, setPatientBills] = useState([]);
  const [patientPharmacySales, setPatientPharmacySales] = useState([]);
  const patientReportRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    branch_id: 'all',
    godown_id: 'all',
    payment_mode: 'all',
    doctor_id: 'all',
    user_id: 'all',
    bank_account_id: 'all',
    category: 'all',
    subcategory: 'all',
    item_name: '',
    item_type: 'all',
    stock_status: 'all',
    expense_category: 'all',
    patient_id: 'all',
  });

  const [doctors, setDoctors] = useState([]);
  const [users, setUsers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [itemMaster, setItemMaster] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);

  const [activeTab, setActiveTab] = useState('overview');

  // P&L states
  const [bankTransactions, setBankTransactions] = useState([]);
  const [plData, setPlData] = useState({ income: 0, expenses: 0, profit: 0 });

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchReports();
    fetchListData();
    fetchPLData();
  }, [filters]);

  const fetchMasterData = async () => {
    try {
      const [
        branchRes, godownRes, patientRes, doctorRes, bankRes, userRes,
        catsRes, subsRes, itemMasterRes, itemTypesRes
      ] = await Promise.all([
        axios.get(`${API}/branches`),
        axios.get(`${API}/godowns`),
        axios.get(`${API}/patients`),
        axios.get(`${API}/doctors`),
        axios.get(`${API}/bank-accounts`),
        axios.get(`${API}/users`).catch(() => ({ data: [] })),
        axios.get(`${API}/categories`),
        axios.get(`${API}/subcategories`),
        axios.get(`${API}/item-master`),
        axios.get(`${API}/item-types`),
      ]);

      setBranches(branchRes.data || []);
      setGodowns(godownRes.data || []);
      setPatients(patientRes.data || []);
      setDoctors(doctorRes.data || []);
      setBankAccounts(bankRes.data || []);
      setUsers(userRes.data || []);

      const cats = catsRes.data || [];
      const subs = subsRes.data || [];
      const types = itemTypesRes.data || [];
      const treatmentType = types.find(t => t.name === 'Treatment');

      // Map categories with type info
      const allCategories = cats.map(c => ({
        ...c,
        type: treatmentType && c.item_type_id === treatmentType.id ? 'treatment' : 'general'
      }));

      const allSubcategories = subs.map(s => {
        const cat = cats.find(c => c.id === s.category_id);
        return {
          ...s,
          type: cat && treatmentType && cat.item_type_id === treatmentType.id ? 'treatment' : 'general'
        };
      });

      setCategories(allCategories);
      setSubcategories(allSubcategories);
      setItemMaster(itemMasterRes.data || []);

      // Extract unique expense categories from existing expenses if no master data
      const expensesRes = await axios.get(`${API}/expenses`);
      const uniqueExpCats = [...new Set(expensesRes.data.map(e => e.category))];
      setExpenseCategories(uniqueExpCats);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchPLData = async () => {
    try {
      const response = await axios.get(`${API}/bank-transactions`);
      const transactions = response.data;
      setBankTransactions(transactions);

      // Filter only professional transactions for P&L
      const professionalTxns = transactions.filter(t => t.purpose_type === 'professional' || !t.purpose_type);

      // Filter by date range
      const filteredTxns = professionalTxns.filter(t => {
        const txnDate = new Date(t.date || t.created_at);
        const startDate = new Date(filters.start_date);
        const endDate = new Date(filters.end_date);
        endDate.setHours(23, 59, 59);
        return txnDate >= startDate && txnDate <= endDate;
      });

      // Calculate P&L
      let income = 0;
      let expenses = 0;

      filteredTxns.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        if (t.transaction_type === 'inflow' || t.type === 'credit') {
          income += amount;
        } else if (t.transaction_type === 'outflow' || t.type === 'debit') {
          expenses += amount;
        }
      });

      setPlData({
        income,
        expenses,
        profit: income - expenses
      });
    } catch (error) {
      console.error('Error fetching P&L data:', error);
    }
  };

  const handleGenerateReport = () => {
    fetchReports();
    fetchListData();
    fetchPLData();
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          params.append(key, value);
        }
      });

      const response = await axios.get(`${API}/reports/comprehensive?${params.toString()}`);
      setReportData(response.data);

      // Update lists from the filtered report data if they exist
      if (response.data.bills) setTreatmentList(response.data.bills);
      if (response.data.sales) setSalesList(response.data.sales);
      if (response.data.expenses) {
        // Flatten expenses to match the structure if needed, or just set it
        // setExpenseList(response.data.expenses); 
      }
    } catch (error) {
      toast.error('Failed to fetch reports');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListData = async () => {
    try {
      const [purchaseRes, salesRes, billsRes, transferRes] = await Promise.all([
        axios.get(`${API}/purchase-entries`),
        axios.get(`${API}/pharmacy-sales`),
        axios.get(`${API}/bills`),
        axios.get(`${API}/stock-transfers`),
      ]);

      // Filter data based on date and branch
      const filterByDateAndBranch = (data) => {
        return data.filter(item => {
          const itemDate = new Date(item.created_at || item.invoice_date || item.sale_date);
          const startDate = new Date(filters.start_date);
          const endDate = new Date(filters.end_date);
          endDate.setHours(23, 59, 59);

          const dateMatch = itemDate >= startDate && itemDate <= endDate;
          const branchMatch = filters.branch_id === 'all' || !filters.branch_id || item.branch_id === filters.branch_id;

          return dateMatch && branchMatch;
        });
      };

      setPurchaseList(filterByDateAndBranch(purchaseRes.data));
      setSalesList(filterByDateAndBranch(salesRes.data));
      setTreatmentList(filterByDateAndBranch(billsRes.data));
      setTransferList(filterByDateAndBranch(transferRes.data));
    } catch (error) {
      console.error('Error fetching list data:', error);
    }
  };

  // Fetch patient billing history
  const fetchPatientHistory = (patient) => {
    setSelectedPatient(patient);
    // Filter bills for this patient
    const bills = treatmentList.filter(b =>
      b.patient_id === patient.id ||
      b.patient_id === patient.patient_id ||
      b.patient_name?.toLowerCase() === patient.name?.toLowerCase()
    );
    setPatientBills(bills);

    // Filter pharmacy sales for this patient
    const sales = salesList.filter(s =>
      s.patient_id === patient.id ||
      s.patient_id === patient.patient_id ||
      s.patient_name?.toLowerCase() === patient.name?.toLowerCase()
    );
    setPatientPharmacySales(sales);
  };

  // Print patient report
  const printPatientReport = () => {
    if (!selectedPatient) return;

    const totalTreatment = patientBills.reduce((sum, b) => sum + (b.total_amount || b.grand_total || 0), 0);
    const totalPharmacy = patientPharmacySales.reduce((sum, s) => sum + (s.total_amount || s.grand_total || 0), 0);
    const totalPaid = patientBills.reduce((sum, b) => sum + (b.paid_amount || 0), 0) +
      patientPharmacySales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
    const totalPending = (totalTreatment + totalPharmacy) - totalPaid;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patient History - ${selectedPatient.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e293b; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
          .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .patient-info p { margin: 5px 0; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-card { padding: 15px; border-radius: 8px; flex: 1; }
          .summary-card.treatment { background: #ede9fe; }
          .summary-card.pharmacy { background: #fef3c7; }
          .summary-card.paid { background: #d1fae5; }
          .summary-card.pending { background: #fee2e2; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          h2 { color: #475569; margin-top: 30px; }
          .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Patient Billing History</h1>
        <div class="patient-info">
          <p><strong>Patient ID:</strong> ${selectedPatient.patient_id || selectedPatient.id}</p>
          <p><strong>Name:</strong> ${selectedPatient.name}</p>
          <p><strong>Phone:</strong> ${selectedPatient.phone || '-'}</p>
          <p><strong>Gender:</strong> ${selectedPatient.gender || '-'}</p>
          <p><strong>Address:</strong> ${selectedPatient.address || '-'}</p>
        </div>
        
        <div class="summary">
          <div class="summary-card treatment">
            <strong>Treatment Total</strong><br/>₹${totalTreatment.toLocaleString('en-IN')}
          </div>
          <div class="summary-card pharmacy">
            <strong>Pharmacy Total</strong><br/>₹${totalPharmacy.toLocaleString('en-IN')}
          </div>
          <div class="summary-card paid">
            <strong>Total Paid</strong><br/>₹${totalPaid.toLocaleString('en-IN')}
          </div>
          <div class="summary-card pending">
            <strong>Pending</strong><br/>₹${totalPending.toLocaleString('en-IN')}
          </div>
        </div>

        <h2>Treatment Bills (${patientBills.length})</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Bill No</th><th>Doctor</th><th>Amount</th><th>Paid</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${patientBills.length > 0 ? patientBills.map(b => `
              <tr>
                <td>${new Date(b.created_at || b.bill_date).toLocaleDateString('en-IN')}</td>
                <td>${b.bill_number || b.id?.slice(0, 8) || '-'}</td>
                <td>${b.doctor_name || '-'}</td>
                <td>₹${(b.total_amount || b.grand_total || 0).toLocaleString('en-IN')}</td>
                <td>₹${(b.paid_amount || 0).toLocaleString('en-IN')}</td>
                <td>${b.payment_status || (b.paid_amount >= (b.total_amount || b.grand_total) ? 'Paid' : 'Pending')}</td>
              </tr>
            `).join('') : '<tr><td colspan="6" style="text-align:center">No treatment bills found</td></tr>'}
          </tbody>
        </table>

        <h2>Pharmacy Purchases (${patientPharmacySales.length})</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Invoice No</th><th>Items</th><th>Amount</th><th>Paid</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${patientPharmacySales.length > 0 ? patientPharmacySales.map(s => `
              <tr>
                <td>${new Date(s.created_at || s.sale_date).toLocaleDateString('en-IN')}</td>
                <td>${s.invoice_number || s.id?.slice(0, 8) || '-'}</td>
                <td>${s.items?.length || 0} items</td>
                <td>₹${(s.total_amount || s.grand_total || 0).toLocaleString('en-IN')}</td>
                <td>₹${(s.paid_amount || 0).toLocaleString('en-IN')}</td>
                <td>${s.payment_status || (s.paid_amount >= (s.total_amount || s.grand_total) ? 'Paid' : 'Pending')}</td>
              </tr>
            `).join('') : '<tr><td colspan="6" style="text-align:center">No pharmacy purchases found</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredPatients = patients.filter(p =>
    !patientSearch ||
    p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone?.includes(patientSearch)
  );

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

  const handleQuickFilter = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFilters({
      ...filters,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    });
  };

  const handleMonthFilter = (monthsAgo) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = monthsAgo === 0 ? now : new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
    setFilters({
      ...filters,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    });
  };

  // Export functions
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        let val = row[h];
        if (typeof val === 'object') val = JSON.stringify(val);
        return JSON.stringify(val || '');
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  // Export to Excel (XLSX format)
  const exportToExcel = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    // Create tab-separated values which Excel can open
    const tsvContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(h => {
        let val = row[h];
        if (typeof val === 'object') val = JSON.stringify(val);
        return (val || '').toString().replace(/\t/g, ' ');
      }).join('\t'))
    ].join('\n');

    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Excel file exported successfully');
  };

  // Export to PDF (basic HTML to PDF)
  const exportToPDF = (data, filename, title) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const branchName = filters.branch_id !== 'all' ? getBranchName(filters.branch_id) : 'All Branches';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          .meta { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #4a5568; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">
          <p>Period: ${filters.start_date} to ${filters.end_date}</p>
          <p>Branch: ${branchName}</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>${headers.map(h => {
      let val = row[h];
      if (typeof val === 'object') val = JSON.stringify(val);
      return `<td>${val || '-'}</td>`;
    }).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Total Records: ${data.length}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const exportAllData = () => {
    // Export all lists in one go
    const allData = {
      purchases: purchaseList,
      sales: salesList,
      treatments: treatmentList,
      transfers: transferList,
      summary: reportData
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_reports_${filters.start_date}_to_${filters.end_date}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('All data exported successfully');
  };

  const getBranchName = (id) => branches.find(b => b.id === id)?.name || '-';

  const paymentModes = ['cash', 'card', 'upi', 'netbanking', 'credit'];

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Reports & Analytics
          </h1>
          <p className="mt-2 text-slate-600">Comprehensive financial reports and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAllData}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export All Data
          </Button>
          <Button variant="outline" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="opacity-0">Quick</Label>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-10"
                onClick={() => handleQuickFilter(0)}
              >
                Today
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={filters.branch_id} onValueChange={(v) => setFilters({ ...filters, branch_id: v })}>
                <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Godown</Label>
              <Select value={filters.godown_id} onValueChange={(v) => setFilters({ ...filters, godown_id: v })}>
                <SelectTrigger><SelectValue placeholder="All Godowns" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Godowns</SelectItem>
                  {godowns.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={filters.doctor_id} onValueChange={(v) => setFilters({ ...filters, doctor_id: v })}>
                <SelectTrigger><SelectValue placeholder="All Doctors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Second Row */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub-category</Label>
              <Select value={filters.subcategory} onValueChange={(v) => setFilters({ ...filters, subcategory: v })}>
                <SelectTrigger><SelectValue placeholder="All Sub-categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-categories</SelectItem>
                  {subcategories
                    .filter(s => filters.category === 'all' || s.category_id === filters.category)
                    .map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select value={filters.item_type} onValueChange={(v) => setFilters({ ...filters, item_type: v })}>
                <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="medicine">Medicine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Select value={filters.item_name} onValueChange={(v) => setFilters({ ...filters, item_name: v })}>
                <SelectTrigger><SelectValue placeholder="All Items" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {itemMaster
                    .filter(i =>
                      (filters.category === 'all' || i.category_id === filters.category || i.category === filters.category) &&
                      (filters.subcategory === 'all' || i.subcategory_id === filters.subcategory || i.subcategory === filters.subcategory)
                    )
                    .map((i) => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={filters.payment_mode} onValueChange={(v) => setFilters({ ...filters, payment_mode: v })}>
                <SelectTrigger><SelectValue placeholder="All Modes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  {paymentModes.map((m) => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Third Row */}
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={filters.bank_account_id} onValueChange={(v) => setFilters({ ...filters, bank_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="All Accounts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bank_name} ({b.account_number?.slice(-4)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Staff (User)</Label>
              <Select value={filters.user_id} onValueChange={(v) => setFilters({ ...filters, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="All Staff" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expense Category</Label>
              <Select value={filters.expense_category} onValueChange={(v) => setFilters({ ...filters, expense_category: v })}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stock Status</Label>
              <Select value={filters.stock_status} onValueChange={(v) => setFilters({ ...filters, stock_status: v })}>
                <SelectTrigger><SelectValue placeholder="All status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="low">Low Stock Only</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={filters.patient_id} onValueChange={(v) => setFilters({ ...filters, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="All Patients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  {patients.slice(0, 50).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-2 flex-wrap">
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateReport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                <Search className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500"
                onClick={() => setFilters({
                  start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                  end_date: new Date().toISOString().split('T')[0],
                  branch_id: 'all',
                  godown_id: 'all',
                  payment_mode: 'all',
                  doctor_id: 'all',
                  user_id: 'all',
                  bank_account_id: 'all',
                  category: 'all',
                  subcategory: 'all',
                  item_name: '',
                  item_type: 'all',
                  stock_status: 'all',
                  expense_category: 'all',
                  patient_id: 'all',
                })}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="pnl"><PieChart className="w-4 h-4 mr-1" />Profit & Loss</TabsTrigger>
          <TabsTrigger value="patient-history"><User className="w-4 h-4 mr-1" />Patient History</TabsTrigger>
          <TabsTrigger value="purchases"><ShoppingCart className="w-4 h-4 mr-1" />Purchases</TabsTrigger>
          <TabsTrigger value="sales"><Pill className="w-4 h-4 mr-1" />Pharmacy Sales</TabsTrigger>
          <TabsTrigger value="treatments"><Stethoscope className="w-4 h-4 mr-1" />Treatment Invoices</TabsTrigger>
          <TabsTrigger value="stock"><Package className="w-4 h-4 mr-1" />Stock Status</TabsTrigger>
          <TabsTrigger value="transfers"><ArrowRightLeft className="w-4 h-4 mr-1" />Item Transfers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(reportData?.total_revenue || 0)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Total Purchases</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(reportData?.total_purchases || 0)}</p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Treatment Revenue</p>
                    <p className="text-2xl font-bold text-purple-700">{formatCurrency(reportData?.bills_revenue || 0)}</p>
                  </div>
                  <Stethoscope className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600">Pharmacy Revenue</p>
                    <p className="text-2xl font-bold text-amber-700">{formatCurrency(reportData?.pharmacy_revenue || 0)}</p>
                  </div>
                  <Pill className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Total Bills</p>
                  <p className="text-xl font-semibold">{reportData?.summary?.bills_count || treatmentList.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Pharmacy Sales</p>
                  <p className="text-xl font-semibold">{reportData?.summary?.sales_count || salesList.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Purchase Orders</p>
                  <p className="text-xl font-semibold">{reportData?.summary?.purchases_count || purchaseList.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Medicine Stock</p>
                  <p className="text-xl font-semibold">{reportData?.summary?.stock_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss Tab */}
        <TabsContent value="pnl">
          <div className="space-y-6">
            {/* P&L Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-600">Total Income</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {formatCurrency(plData.income)}
                      </p>
                      <p className="text-xs text-emerald-500 mt-1">Professional inflows only</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-700">
                        {formatCurrency(plData.expenses)}
                      </p>
                      <p className="text-xs text-red-500 mt-1">Professional outflows only</p>
                    </div>
                    <TrendingDown className="w-10 h-10 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className={plData.profit >= 0 ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${plData.profit >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {plData.profit >= 0 ? 'Net Profit' : 'Net Loss'}
                      </p>
                      <p className={`text-2xl font-bold ${plData.profit >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                        {formatCurrency(Math.abs(plData.profit))}
                      </p>
                      <p className={`text-xs mt-1 ${plData.profit >= 0 ? 'text-blue-500' : 'text-amber-500'}`}>
                        {plData.profit >= 0 ? 'Income - Expenses' : 'Expenses exceed Income'}
                      </p>
                    </div>
                    <PieChart className={`w-10 h-10 ${plData.profit >= 0 ? 'text-blue-400' : 'text-amber-400'}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* P&L Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Profit & Loss Statement
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Period: {new Date(filters.start_date).toLocaleDateString('en-IN')} - {new Date(filters.end_date).toLocaleDateString('en-IN')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Income Section */}
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <h4 className="font-semibold text-emerald-700 mb-3">Income (Professional Inflows)</h4>
                    <div className="space-y-2">
                      {bankTransactions
                        .filter(t => (t.purpose_type === 'professional' || !t.purpose_type) && (t.transaction_type === 'inflow' || t.type === 'credit'))
                        .filter(t => {
                          const txnDate = new Date(t.date || t.created_at);
                          const startDate = new Date(filters.start_date);
                          const endDate = new Date(filters.end_date);
                          endDate.setHours(23, 59, 59);
                          return txnDate >= startDate && txnDate <= endDate;
                        })
                        .slice(0, 10)
                        .map((t, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1 border-b border-emerald-200 last:border-0">
                            <span>{t.description || t.party_name || 'Income'}</span>
                            <span className="font-medium text-emerald-700">+{formatCurrency(t.amount)}</span>
                          </div>
                        ))}
                      {bankTransactions.filter(t => (t.purpose_type === 'professional' || !t.purpose_type) && (t.transaction_type === 'inflow' || t.type === 'credit')).length === 0 && (
                        <p className="text-sm text-emerald-600">No income transactions in this period</p>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-emerald-800 mt-3 pt-2 border-t border-emerald-300">
                      <span>Total Income</span>
                      <span>{formatCurrency(plData.income)}</span>
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-700 mb-3">Expenses (Professional Outflows)</h4>
                    <div className="space-y-2">
                      {bankTransactions
                        .filter(t => (t.purpose_type === 'professional' || !t.purpose_type) && (t.transaction_type === 'outflow' || t.type === 'debit'))
                        .filter(t => {
                          const txnDate = new Date(t.date || t.created_at);
                          const startDate = new Date(filters.start_date);
                          const endDate = new Date(filters.end_date);
                          endDate.setHours(23, 59, 59);
                          return txnDate >= startDate && txnDate <= endDate;
                        })
                        .slice(0, 10)
                        .map((t, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1 border-b border-red-200 last:border-0">
                            <span>{t.description || t.party_name || 'Expense'}</span>
                            <span className="font-medium text-red-700">-{formatCurrency(t.amount)}</span>
                          </div>
                        ))}
                      {bankTransactions.filter(t => (t.purpose_type === 'professional' || !t.purpose_type) && (t.transaction_type === 'outflow' || t.type === 'debit')).length === 0 && (
                        <p className="text-sm text-red-600">No expense transactions in this period</p>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-red-800 mt-3 pt-2 border-t border-red-300">
                      <span>Total Expenses</span>
                      <span>{formatCurrency(plData.expenses)}</span>
                    </div>
                  </div>

                  {/* Net Profit/Loss */}
                  <div className={`p-4 rounded-lg ${plData.profit >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-lg font-bold ${plData.profit >= 0 ? 'text-blue-800' : 'text-amber-800'}`}>
                        {plData.profit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                      </span>
                      <span className={`text-2xl font-bold ${plData.profit >= 0 ? 'text-blue-800' : 'text-amber-800'}`}>
                        {formatCurrency(Math.abs(plData.profit))}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4 italic">
                  * Personal transactions are excluded from P&L calculations. Only transactions marked as "Professional" purpose are included.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Patient History Tab */}
        <TabsContent value="patient-history">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Search Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search Patient
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Search by name, ID, or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredPatients.slice(0, 20).map(p => (
                      <div
                        key={p.id}
                        onClick={() => fetchPatientHistory(p)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedPatient?.id === p.id
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'hover:bg-slate-50 border-slate-200'
                          }`}
                      >
                        <p className="font-medium">{p.name}</p>
                        <p className="text-sm text-slate-500">ID: {p.patient_id || p.id?.slice(0, 8)}</p>
                        <p className="text-sm text-slate-500">{p.phone}</p>
                      </div>
                    ))}
                    {filteredPatients.length === 0 && (
                      <p className="text-center text-slate-500 py-4">No patients found</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patient Details Panel */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {selectedPatient ? `${selectedPatient.name}'s Billing History` : 'Select a Patient'}
                </CardTitle>
                {selectedPatient && (
                  <Button onClick={printPatientReport} className="bg-emerald-600 hover:bg-emerald-700">
                    <Printer className="w-4 h-4 mr-2" />Print Report
                  </Button>
                )}
              </CardHeader>
              <CardContent ref={patientReportRef}>
                {selectedPatient ? (
                  <div className="space-y-6">
                    {/* Patient Info */}
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-slate-500">Patient ID:</span> <strong>{selectedPatient.patient_id || selectedPatient.id?.slice(0, 8)}</strong></div>
                        <div><span className="text-slate-500">Phone:</span> <strong>{selectedPatient.phone || '-'}</strong></div>
                        <div><span className="text-slate-500">Gender:</span> <strong>{selectedPatient.gender || '-'}</strong></div>
                        <div><span className="text-slate-500">Address:</span> <strong>{selectedPatient.address || '-'}</strong></div>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600">Treatment Total</p>
                        <p className="text-xl font-bold text-purple-700">
                          {formatCurrency(patientBills.reduce((sum, b) => sum + (b.total_amount || b.grand_total || 0), 0))}
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-600">Pharmacy Total</p>
                        <p className="text-xl font-bold text-amber-700">
                          {formatCurrency(patientPharmacySales.reduce((sum, s) => sum + (s.total_amount || s.grand_total || 0), 0))}
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg">
                        <p className="text-sm text-emerald-600">Total Paid</p>
                        <p className="text-xl font-bold text-emerald-700">
                          {formatCurrency(
                            patientBills.reduce((sum, b) => sum + (b.paid_amount || 0), 0) +
                            patientPharmacySales.reduce((sum, s) => sum + (s.paid_amount || 0), 0)
                          )}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600">Pending</p>
                        <p className="text-xl font-bold text-red-700">
                          {formatCurrency(
                            (patientBills.reduce((sum, b) => sum + (b.total_amount || b.grand_total || 0), 0) +
                              patientPharmacySales.reduce((sum, s) => sum + (s.total_amount || s.grand_total || 0), 0)) -
                            (patientBills.reduce((sum, b) => sum + (b.paid_amount || 0), 0) +
                              patientPharmacySales.reduce((sum, s) => sum + (s.paid_amount || 0), 0))
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Treatment Bills */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4" />Treatment Bills ({patientBills.length})
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50">
                              <th className="text-left py-2 px-3">Date</th>
                              <th className="text-left py-2 px-3">Bill No</th>
                              <th className="text-left py-2 px-3">Doctor</th>
                              <th className="text-right py-2 px-3">Amount</th>
                              <th className="text-right py-2 px-3">Paid</th>
                              <th className="text-center py-2 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientBills.map((b, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="py-2 px-3">{formatDate(b.created_at || b.bill_date)}</td>
                                <td className="py-2 px-3">{b.bill_number || b.id?.slice(0, 8)}</td>
                                <td className="py-2 px-3">{b.doctor_name || '-'}</td>
                                <td className="py-2 px-3 text-right">{formatCurrency(b.total_amount || b.grand_total)}</td>
                                <td className="py-2 px-3 text-right">{formatCurrency(b.paid_amount)}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-xs ${(b.paid_amount || 0) >= (b.total_amount || b.grand_total || 0)
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {(b.paid_amount || 0) >= (b.total_amount || b.grand_total || 0) ? 'Paid' : 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {patientBills.length === 0 && (
                          <p className="text-center py-4 text-slate-500">No treatment bills found</p>
                        )}
                      </div>
                    </div>

                    {/* Pharmacy Sales */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Pill className="w-4 h-4" />Pharmacy Purchases ({patientPharmacySales.length})
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50">
                              <th className="text-left py-2 px-3">Date</th>
                              <th className="text-left py-2 px-3">Invoice No</th>
                              <th className="text-center py-2 px-3">Items</th>
                              <th className="text-right py-2 px-3">Amount</th>
                              <th className="text-right py-2 px-3">Paid</th>
                              <th className="text-center py-2 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientPharmacySales.map((s, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="py-2 px-3">{formatDate(s.created_at || s.sale_date)}</td>
                                <td className="py-2 px-3">{s.invoice_number || s.id?.slice(0, 8)}</td>
                                <td className="py-2 px-3 text-center">{s.items?.length || 0}</td>
                                <td className="py-2 px-3 text-right">{formatCurrency(s.total_amount || s.grand_total)}</td>
                                <td className="py-2 px-3 text-right">{formatCurrency(s.paid_amount)}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-xs ${(s.paid_amount || 0) >= (s.total_amount || s.grand_total || 0)
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {(s.paid_amount || 0) >= (s.total_amount || s.grand_total || 0) ? 'Paid' : 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {patientPharmacySales.length === 0 && (
                          <p className="text-center py-4 text-slate-500">No pharmacy purchases found</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a patient from the left panel to view their billing history</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Purchases Tab */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Purchase List ({purchaseList.length})</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV(purchaseList, 'purchase_list')}>
                  <Download className="w-4 h-4 mr-1" />CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToExcel(purchaseList, 'purchase_list')}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF(purchaseList, 'purchase_list', 'Purchase List Report')}>
                  <FileText className="w-4 h-4 mr-1" />PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium">Date</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Invoice #</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Supplier</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Branch</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Amount</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Paid</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseList.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 px-3 text-sm">{formatDate(p.invoice_date)}</td>
                        <td className="py-2 px-3 font-mono text-sm">{p.invoice_number}</td>
                        <td className="py-2 px-3">{p.supplier_name}</td>
                        <td className="py-2 px-3">{getBranchName(p.branch_id)}</td>
                        <td className="py-2 px-3 text-right font-semibold">{formatCurrency(p.total_amount)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(p.paid_amount)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${(p.paid_amount || 0) >= (p.total_amount || 0) ? 'bg-emerald-100 text-emerald-700' :
                            (p.paid_amount || 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {(p.paid_amount || 0) >= (p.total_amount || 0) ? 'Paid' : (p.paid_amount || 0) > 0 ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {purchaseList.length === 0 && (
                  <p className="text-center py-8 text-slate-500">No purchase records found for selected filters</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pharmacy Sales List ({salesList.length})</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV(salesList, 'pharmacy_sales')}>
                  <Download className="w-4 h-4 mr-1" />CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToExcel(salesList, 'pharmacy_sales')}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF(salesList, 'pharmacy_sales', 'Pharmacy Sales Report')}>
                  <FileText className="w-4 h-4 mr-1" />PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium">Date</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Patient</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Branch</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Items</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Subtotal</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Discount</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Total</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesList.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 px-3 text-sm">{formatDate(s.created_at || s.sale_date)}</td>
                        <td className="py-2 px-3">{s.patient_name || 'Walk-in'}</td>
                        <td className="py-2 px-3">{getBranchName(s.branch_id)}</td>
                        <td className="py-2 px-3 text-center">{s.items?.length || 0}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(s.subtotal)}</td>
                        <td className="py-2 px-3 text-right text-red-600">{formatCurrency(s.discount)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-600">{formatCurrency(s.total_amount)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs uppercase">{s.payment_mode || 'N/A'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {salesList.length === 0 && (
                  <p className="text-center py-8 text-slate-500">No pharmacy sales found for selected filters</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatments Tab */}
        <TabsContent value="treatments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Treatment Invoice List ({treatmentList.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(treatmentList, 'treatment_invoices')}>
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium">Date</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Bill #</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Patient</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Branch</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Amount</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Paid</th>
                      <th className="text-right py-2 px-3 text-sm font-medium">Balance</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatmentList.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 px-3 text-sm">{formatDate(t.created_at)}</td>
                        <td className="py-2 px-3 font-mono text-sm">{t.bill_number || t.id?.slice(0, 8)}</td>
                        <td className="py-2 px-3">
                          <p className="font-medium">{t.patient_name}</p>
                          <p className="text-xs text-slate-500">{t.patient_id}</p>
                        </td>
                        <td className="py-2 px-3">{getBranchName(t.branch_id)}</td>
                        <td className="py-2 px-3 text-right font-semibold">{formatCurrency(t.total_amount)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600">{formatCurrency(t.paid_amount)}</td>
                        <td className="py-2 px-3 text-right text-red-600">{formatCurrency(t.balance_amount)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${t.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            t.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {t.is_temporary ? 'Temporary' : t.payment_status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {treatmentList.length === 0 && (
                  <p className="text-center py-8 text-slate-500">No treatment invoices found for selected filters</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Status Tab */}
        <TabsContent value="stock">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Medicine Stock Status ({reportData?.medicines?.length || 0})</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV(reportData?.medicines || [], 'stock_status')}>
                  <Download className="w-4 h-4 mr-1" />CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToExcel(reportData?.medicines || [], 'stock_status')}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium">Item Name</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Category</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Batch</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Quantity</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Min Level</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Expiry</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData?.medicines || []).map((m) => {
                      const isOutOfStock = m.stock_quantity <= 0;
                      const isLowStock = m.stock_quantity <= m.min_stock_level && !isOutOfStock;

                      return (
                        <tr key={m.id} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <p className="font-medium">{m.name}</p>
                            <p className="text-xs text-slate-500">{m.manufacturer}</p>
                          </td>
                          <td className="py-2 px-3 text-sm">{m.category}</td>
                          <td className="py-2 px-3 text-sm font-mono">{m.batch_number || 'N/A'}</td>
                          <td className="py-2 px-3 text-center font-bold">
                            {m.stock_quantity}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500">
                            {m.min_stock_level}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {m.expiry_date || 'N/A'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${isOutOfStock ? 'bg-red-100 text-red-700' :
                              isLowStock ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {(reportData?.medicines || []).length === 0 && (
                  <p className="text-center py-8 text-slate-500">No stock data matching current filters</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Item Transfer List ({transferList.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(transferList, 'item_transfers')}>
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium">Date</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Item</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Quantity</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">From</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">To</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Transferred By</th>
                      <th className="text-center py-2 px-3 text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferList.map((tr) => (
                      <tr key={tr.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 px-3 text-sm">{formatDate(tr.created_at)}</td>
                        <td className="py-2 px-3 font-medium">{tr.medicine_name}</td>
                        <td className="py-2 px-3 text-center font-semibold">{tr.quantity}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {tr.from_type === 'godown' ? 'Godown' : 'Branch'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                            {tr.to_type === 'godown' ? 'Godown' : 'Branch'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm">{tr.transferred_by || 'Admin'}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${tr.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            tr.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'
                            }`}>
                            {tr.status || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transferList.length === 0 && (
                  <p className="text-center py-8 text-slate-500">No item transfers found for selected filters</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
