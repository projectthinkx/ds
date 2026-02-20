import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Search, AlertTriangle, Package,
  Calendar, Warehouse, Building2, Filter
} from 'lucide-react';

const Pharmacy = ({ user }) => {
  const [medicines, setMedicines] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states - arrays for multi-select checkboxes
  const [selectedGodowns, setSelectedGodowns] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Non-admin users can only see their branch
    if (!isAdmin && user?.branch_id) {
      setSelectedBranches([user.branch_id]);
      setAppliedBranches([user.branch_id]);
    } else if (isAdmin) {
      // Admin can receive filters from URL
      const urlBranches = searchParams.get('branch_ids')?.split(',').filter(Boolean);
      const urlGodowns = searchParams.get('godown_ids')?.split(',').filter(Boolean);

      if (urlBranches || urlGodowns) {
        if (urlBranches) {
          setSelectedBranches(urlBranches);
          setAppliedBranches(urlBranches);
        }
        if (urlGodowns) {
          setSelectedGodowns(urlGodowns);
          setAppliedGodowns(urlGodowns);
        }
      }
    }
  }, [isAdmin, user?.branch_id, searchParams]);

  const fetchData = async () => {
    try {
      const [stockRes, godownsRes, branchesRes] = await Promise.all([
        axios.get(`${API}/pharmacy-stock`),
        axios.get(`${API}/godowns`),
        axios.get(`${API}/branches`),
      ]);
      setMedicines(stockRes.data);
      setGodowns(godownsRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Applied filters state (only apply on Show button click)
  const [appliedGodowns, setAppliedGodowns] = useState([]);
  const [appliedBranches, setAppliedBranches] = useState([]);

  // Filter pre-aggregated medicines from backend
  const filteredMedicines = React.useMemo(() => {
    return medicines.filter(m => {
      // 1. Location filter
      if (!isAdmin) {
        // Non-admin restricted to their branch
        if (m.branch_id !== user?.branch_id) return false;
      } else {
        // Admin must have selected at least one location
        if (appliedGodowns.length === 0 && appliedBranches.length === 0) return false;
        const godownMatch = appliedGodowns.includes(m.godown_id);
        const branchMatch = appliedBranches.includes(m.branch_id);
        if (!(godownMatch || branchMatch)) return false;
      }

      // 2. Search and Stock availability filter
      const matchesSearch =
        (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.batch_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.subcategory || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Use stock_quantity (or its alias quantity) which is now pre-aggregated in the backend
      return matchesSearch && (m.quantity || 0) > 0;
    });
  }, [medicines, searchTerm, appliedGodowns, appliedBranches, isAdmin, user?.branch_id]);

  // Toggle checkbox selection
  const toggleGodown = (godownId) => {
    setSelectedGodowns(prev =>
      prev.includes(godownId)
        ? prev.filter(id => id !== godownId)
        : [...prev, godownId]
    );
  };

  const toggleBranch = (branchId) => {
    setSelectedBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  // Apply filters on Show button click
  const handleShowFilters = () => {
    setAppliedGodowns([...selectedGodowns]);
    setAppliedBranches([...selectedBranches]);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedGodowns([]);
    setSelectedBranches([]);
    setAppliedGodowns([]);
    setAppliedBranches([]);
  };

  const getGodownName = (id) => godowns.find(g => g.id === id)?.name || '-';
  const getBranchName = (id) => branches.find(b => b.id === id)?.name || '-';

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 90 && diffDays > 0;
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Summary stats
  const totalItems = filteredMedicines.length;
  const lowStockItems = filteredMedicines.filter(m => (m.quantity || 0) <= (m.min_stock_level || 10) && (m.min_stock_level || 10) > 0).length;
  const expiringSoonItems = filteredMedicines.filter(m => isExpiringSoon(m.expiry_date)).length;
  const expiredItems = filteredMedicines.filter(m => isExpired(m.expiry_date)).length;

  return (
    <div className="space-y-6" data-testid="pharmacy-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Pharmacy Stock
          </h1>
          <p className="mt-2 text-slate-600">
            {isAdmin ? 'View and transfer stock across godowns and branches' : 'View your branch stock'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Items</p>
                <p className="text-2xl font-bold text-blue-700">{totalItems}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">Low Stock</p>
                <p className="text-2xl font-bold text-amber-700">{lowStockItems}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-700">{expiringSoonItems}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Expired</p>
                <p className="text-2xl font-bold text-red-700">{expiredItems}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Filter className="w-5 h-5 mr-2" />Filters
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, category, or batch..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Checkbox Filters for Godowns and Branches */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap gap-6">
                {/* Godowns Checkboxes */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Warehouse className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-slate-700">Godowns</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {godowns.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGodowns.includes(g.id)}
                          onChange={() => toggleGodown(g.id)}
                          className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-600">{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Branches Checkboxes */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Branches</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {branches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(b.id)}
                          onChange={() => toggleBranch(b.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-600">{b.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Show and Clear Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleShowFilters}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={selectedGodowns.length === 0 && selectedBranches.length === 0}
                >
                  Show
                </Button>
                {(appliedGodowns.length > 0 || appliedBranches.length > 0) && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
                {(appliedGodowns.length > 0 || appliedBranches.length > 0) && (
                  <span className="text-sm text-slate-500 self-center">
                    Showing: {appliedGodowns.length > 0 ? `${appliedGodowns.length} godown(s)` : ''}
                    {appliedGodowns.length > 0 && appliedBranches.length > 0 ? ', ' : ''}
                    {appliedBranches.length > 0 ? `${appliedBranches.length} branch(es)` : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              {appliedGodowns.length === 0 && appliedBranches.length === 0 ? (
                <p>Select godown(s) or branch(es) and click "Show" to view stock</p>
              ) : (
                <p>No stock items found for selected filters</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Item Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Subcategory</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Sales Price</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Batch No.</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Expiry Date</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Units</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicines.map((medicine) => (
                    <tr key={medicine.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{medicine.name}</p>
                          {medicine.item_status === 'INACTIVE' && (
                            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 border-slate-200">
                              Discontinued
                            </Badge>
                          )}
                        </div>
                        {medicine.manufacturer && (
                          <p className="text-xs text-slate-500">{medicine.manufacturer}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">{medicine.category || '-'}</td>
                      <td className="py-3 px-4 text-sm">{medicine.subcategory || '-'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {formatCurrency(medicine.sales_price || medicine.mrp)}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{medicine.batch_number || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={
                            isExpired(medicine.expiry_date) ? 'text-red-600' :
                              isExpiringSoon(medicine.expiry_date) ? 'text-orange-600' : ''
                          }>
                            {formatDate(medicine.expiry_date)}
                          </span>
                          {isExpired(medicine.expiry_date) && (
                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                          )}
                          {isExpiringSoon(medicine.expiry_date) && !isExpired(medicine.expiry_date) && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">Expiring</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${(medicine.quantity || 0) <= (medicine.min_stock_level || 10) && (medicine.min_stock_level || 10) > 0
                          ? 'text-red-600' : 'text-slate-900'
                          }`}>
                          {medicine.quantity || 0}
                        </span>
                        {(medicine.quantity || 0) <= (medicine.min_stock_level || 10) && (medicine.min_stock_level || 10) > 0 && (
                          <Badge className="ml-2 bg-red-100 text-red-700 text-xs">Low</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {medicine.godown_id && (
                          <div className="flex items-center text-purple-600">
                            <Warehouse className="w-3 h-3 mr-1" />
                            {getGodownName(medicine.godown_id)}
                          </div>
                        )}
                        {medicine.branch_id && (
                          <div className="flex items-center text-blue-600">
                            <Building2 className="w-3 h-3 mr-1" />
                            {getBranchName(medicine.branch_id)}
                          </div>
                        )}
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

export default Pharmacy;
