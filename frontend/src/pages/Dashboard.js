import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import {
  TrendingUp,
  Users,
  AlertCircle,
  Pill,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  ShoppingCart
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';



const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);

  const [expiringMeds, setExpiringMeds] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // New State for Filters
  const [availableBranches, setAvailableBranches] = useState([]);
  const [availableGodowns, setAvailableGodowns] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]); // Empty = All (default)
  const [selectedGodowns, setSelectedGodowns] = useState([]);   // Empty = All (default)


  // Check if user has admin/financial role
  const isAdmin = user?.role === 'admin';
  const isFinancialRole = user?.role === 'admin' || user?.role === 'accountant';
  const isLimitedRole = user?.role === 'receptionist' || user?.role === 'accountant';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const requests = [];

      // All users get basic stats
      requests.push(axios.get(`${API}/reports/dashboard`));

      // Only allow roles that can see stock to fetch it
      const canViewStock = isAdmin || user?.role === 'branch_manager' || ['Pharmacy', 'Purchases', 'Inventory'].some(m => user?.permissions?.some(p => p.module === m && p.can_view));

      if (canViewStock) {
        requests.push(axios.get(`${API}/reports/low-stock`));
        requests.push(axios.get(`${API}/reports/expiring-soon`));


        // Fetch branches/godowns for filters
        requests.push(axios.get(`${API}/branches`));
        // Only fetch godowns if admin (others usually don't see godown stock unless permitted, but we'll fetch to be safe if they have access)
        requests.push(axios.get(`${API}/godowns`));
      } else {
        requests.push(Promise.resolve({ data: [] })); // low-stock
        requests.push(Promise.resolve({ data: [] })); // expiring

        requests.push(Promise.resolve({ data: [] })); // branches
        requests.push(Promise.resolve({ data: [] })); // godowns
      }

      // Get recent bills for limited roles
      if (isLimitedRole) {
        requests.push(axios.get(`${API}/bills`));
      } else {
        requests.push(Promise.resolve({ data: [] }));
      }

      const responses = await Promise.all(requests);

      const statsData = responses[0].data;
      const lowStockData = responses[1].data || [];
      const expiringData = responses[2].data || [];
      const branchesData = responses[3]?.data || [];
      const godownsData = responses[4]?.data || [];
      const billsData = responses[5]?.data || [];

      setStats(statsData);
      setLowStock(lowStockData); // This now contains branch_name/godown_name from backend
      setExpiringMeds(expiringData);
      setRecentBills(billsData || []);

      // Filter available options based on permissions
      if (isAdmin) {
        setAvailableBranches(branchesData);
        setAvailableGodowns(godownsData);
        // By default, select all for Admin
        setSelectedBranches(branchesData.map(b => b.id));
        setSelectedGodowns(godownsData.map(g => g.id));
      } else {
        const permittedBranches = user?.branch_id
          ? branchesData.filter(b => b.id === user.branch_id)
          : branchesData;

        setAvailableBranches(permittedBranches);
        setAvailableGodowns([]); // Non-admins usually don't see godowns

        // Auto-select permitted branches
        setSelectedBranches(permittedBranches.map(b => b.id));
        setSelectedGodowns([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering & sorting for Low Stock
  const filteredLowStock = React.useMemo(() => {
    return lowStock
      .filter(item => {
        if (selectedBranches.length === 0 && selectedGodowns.length === 0) return false;
        const branchMatch = selectedBranches.some(id => id === item.branch_id || (item.branch_name && id === item.branch_name));
        const godownMatch = selectedGodowns.some(id => id === item.godown_id || (item.godown_name && id === item.godown_name));
        return branchMatch || godownMatch;
      })
      .sort((a, b) => {
        const diffA = (a.stock_quantity || 0) - (a.min_stock_level || 0);
        const diffB = (b.stock_quantity || 0) - (b.min_stock_level || 0);
        return diffA - diffB; // Worst shortage (most negative) first
      });
  }, [lowStock, selectedBranches, selectedGodowns]);

  // Client-side filtering & sorting for Expiring Meds
  const filteredExpiringMeds = React.useMemo(() => {
    return expiringMeds
      .filter(item => {
        if (selectedBranches.length === 0 && selectedGodowns.length === 0) return false;
        const branchMatch = selectedBranches.some(id => id === item.branch_id || (item.branch_name && id === item.branch_name));
        const godownMatch = selectedGodowns.some(id => id === item.godown_id || (item.godown_name && id === item.godown_name));
        return branchMatch || godownMatch;
      })
      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  }, [expiringMeds, selectedBranches, selectedGodowns]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  // Revenue data removed

  // Limited Dashboard for Receptionist/Accountant
  if (isLimitedRole) {
    return (
      <div className="space-y-8" data-testid="dashboard">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Dashboard
          </h1>
          <p className="mt-2 text-slate-600">Welcome back, {user?.full_name}</p>
        </div>

        {/* Basic Stats for Limited Roles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-card" data-testid="appointments-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Appointments Today
              </CardTitle>
              <Calendar className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-950">
                {stats?.appointments_today || 0}
              </div>
              <p className="text-xs text-slate-600 mt-1">Scheduled for today</p>
            </CardContent>
          </Card>

          <Card className="stat-card" data-testid="patients-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Patients
              </CardTitle>
              <Users className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-950">
                {stats?.total_patients || 0}
              </div>
              <p className="text-xs text-slate-600 mt-1">Registered</p>
            </CardContent>
          </Card>

          <Card className="stat-card" data-testid="bills-today-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Bills Today
              </CardTitle>
              <FileText className="w-5 h-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-950">
                {stats?.bills_today || 0}
              </div>
              <p className="text-xs text-slate-600 mt-1">Generated today</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions for Limited Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading font-bold flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <a
                href="/billing"
                className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <FileText className="w-8 h-8 text-emerald-600 mb-2" />
                <h4 className="font-semibold text-emerald-900">New Bill</h4>
                <p className="text-sm text-emerald-700">Create a new patient bill</p>
              </a>
              <a
                href="/pharmacy"
                className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Pill className="w-8 h-8 text-blue-600 mb-2" />
                <h4 className="font-semibold text-blue-900">Pharmacy</h4>
                <p className="text-sm text-blue-700">View stock & sell medicines</p>
              </a>
              <a
                href="/billing"
                className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <ShoppingCart className="w-8 h-8 text-purple-600 mb-2" />
                <h4 className="font-semibold text-purple-900">Pharmacy Sale</h4>
                <p className="text-sm text-purple-700">Quick medicine sale</p>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Recent Bills for Limited Roles */}
        {recentBills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-heading font-bold">
                Recent Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Bill #
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Patient
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBills.map((bill) => (
                      <tr key={bill.id} className="border-b border-slate-100 table-row">
                        <td className="py-3 px-4 text-sm font-mono text-slate-900">
                          {bill.bill_number || bill.id?.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-900">
                          {bill.patient_name}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-emerald-600">
                          {formatCurrency(bill.total_amount)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${bill.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : bill.payment_status === 'partial'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                            {bill.payment_status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Full Admin Dashboard
  return (
    <div className="space-y-8" data-testid="dashboard">
      <div>
        <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
          Dashboard
        </h1>
        <p className="mt-2 text-slate-600">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue and Profit cards hidden
        <Card className="stat-card" data-testid="total-revenue-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Revenue
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">
              {formatCurrency(stats?.total_revenue || 0)}
            </div>
            <p className="text-xs text-emerald-600 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="net-profit-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Net Profit
            </CardTitle>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">
              {formatCurrency(stats?.net_profit || 0)}
            </div>
            <p className="text-xs text-slate-600 mt-1">Revenue - Expenses</p>
          </CardContent>
        </Card>
        */}

        <Card className="stat-card" data-testid="appointments-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Appointments Today
            </CardTitle>
            <Calendar className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">
              {stats?.appointments_today || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="patients-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Patients
            </CardTitle>
            <Users className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">
              {stats?.total_patients || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">Registered</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch/Godown Filter Panel (Moved up for context) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading font-bold flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-blue-500" />
              Stock Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {/* Branches Column */}
              {(isAdmin || availableBranches.length > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Branches</h4>
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedBranches([])} className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium">Clear</button>
                      {(isAdmin || availableBranches.length > 1) && (
                        <button onClick={() => setSelectedBranches(availableBranches.map(b => b.id))} className="text-[11px] text-blue-600 hover:text-blue-700 font-bold underline">Select All</button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4">
                    {availableBranches.map(b => (
                      <label key={b.id} className="flex items-center gap-2.5 group cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                          checked={selectedBranches.includes(b.id)}
                          onChange={(e) => e.target.checked ? setSelectedBranches([...selectedBranches, b.id]) : setSelectedBranches(selectedBranches.filter(id => id !== b.id))}
                        />
                        <span className="text-xs text-slate-600 group-hover:text-slate-950 truncate font-medium">{b.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Godowns Column */}
              {(isAdmin || availableGodowns.length > 0) && (
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Godowns</h4>
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedGodowns([])} className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium">Clear</button>
                      {(isAdmin || availableGodowns.length > 1) && (
                        <button onClick={() => setSelectedGodowns(availableGodowns.map(g => g.id))} className="text-[11px] text-blue-600 hover:text-blue-700 font-bold underline">Select All</button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4">
                    {availableGodowns.map(g => (
                      <label key={g.id} className="flex items-center gap-2.5 group cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                          checked={selectedGodowns.includes(g.id)}
                          onChange={(e) => e.target.checked ? setSelectedGodowns([...selectedGodowns, g.id]) : setSelectedGodowns(selectedGodowns.filter(id => id !== g.id))}
                        />
                        <span className="text-xs text-slate-600 group-hover:text-slate-950 truncate font-medium">{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts card with inline tables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading font-bold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Low Stock Section */}
            <div className="space-y-3">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <Pill className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-semibold text-red-900">Low Stock Items</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {filteredLowStock.length === 0 ? "No low stock items for selected locations" :
                        filteredLowStock.length === 1 ? "1 medicine is running low on stock" :
                          `${filteredLowStock.length} medicines are running low on stock`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-100 rounded-lg overflow-hidden bg-white shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">Medicine</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">Location</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-600">Stock</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-600">Min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLowStock.slice(0, 5).map((med, idx) => (
                      <tr key={med.id || idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-900">{med.name}</td>
                        <td className="py-2 px-3 text-slate-500 truncate max-w-[100px]">
                          {med.branch_name || med.godown_name || 'Unassigned'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-sm font-bold">
                            {med.stock_quantity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400">{med.min_stock_level}</td>
                      </tr>
                    ))}
                    {filteredLowStock.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-4 text-center text-slate-400 italic">No low stock items for selected filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {filteredLowStock.length > 5 && (
                  <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
                    <a
                      href={`/pharmacy?branch_ids=${selectedBranches.join(',')}&godown_ids=${selectedGodowns.join(',')}`}
                      className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center justify-center"
                    >
                      View all {filteredLowStock.length} items
                      <TrendingUp className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Expiring Soon Section */}
            <div className="space-y-3">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-semibold text-orange-900">Expiring Soon</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      {filteredExpiringMeds.length === 0 ? `No batches expiring within ${stats?.expiry_alert_days || 90} days for selected locations` :
                        filteredExpiringMeds.length === 1 ? `1 batch expiring within ${stats?.expiry_alert_days || 90} days` :
                          `${filteredExpiringMeds.length} batches expiring within ${stats?.expiry_alert_days || 90} days`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-100 rounded-lg overflow-hidden bg-white shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">Item</th>
                      <th className="text-center py-2 px-3 font-semibold text-slate-600">Batch</th>
                      <th className="text-center py-2 px-3 font-semibold text-slate-600">Expiry</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-600">Qty</th>
                      <th className="text-center py-2 px-3 font-semibold text-slate-600">Loc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpiringMeds.slice(0, 5).map((med, idx) => (
                      <tr key={med.id || idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-900">{med.name}</td>
                        <td className="py-2 px-3 text-center text-slate-500 font-mono">{med.batch_number}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`${new Date(med.expiry_date) <= new Date() ? 'text-red-600 font-bold' : 'text-orange-600'} font-medium`}>
                            {med.expiry_date}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-700">{med.stock_quantity}</td>
                        <td className="py-2 px-3 text-center text-slate-400">
                          {med.branch_name ? med.branch_name.slice(0, 3) : (med.godown_name ? 'GD' : '-')}
                        </td>
                      </tr>
                    ))}
                    {filteredExpiringMeds.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-slate-400 italic">No expiring batches for selected filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {filteredExpiringMeds.length > 5 && (
                  <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
                    <a
                      href={`/pharmacy?branch_ids=${selectedBranches.join(',')}&godown_ids=${selectedGodowns.join(',')}`}
                      className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center justify-center"
                    >
                      View all {filteredExpiringMeds.length} batches
                      <Calendar className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center text-slate-400 text-xs italic pb-4">
        All alerts respect current branch/godown selection.
      </div>
    </div>
  );
};

export default Dashboard;