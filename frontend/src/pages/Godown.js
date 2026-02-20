import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
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
import { Plus, Search, Warehouse, MapPin, Phone, User, Package } from 'lucide-react';

const Godown = ({ user }) => {
  const [godowns, setGodowns] = useState([]);
  const [branches, setBranches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact_person: '',
    phone: '',
    branch_id: user?.branch_id || '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [godownsRes, branchesRes, medicinesRes] = await Promise.all([
        axios.get(`${API}/godowns`),
        axios.get(`${API}/branches`),
        axios.get(`${API}/medicines`),
      ]);
      setGodowns(godownsRes.data);
      setBranches(branchesRes.data);
      setMedicines(medicinesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        branch_id: formData.branch_id === 'all' ? '' : formData.branch_id,
      };
      await axios.post(`${API}/godowns`, payload);
      toast.success('Godown added successfully');
      setOpen(false);
      setFormData({
        name: '',
        location: '',
        contact_person: '',
        phone: '',
        branch_id: user?.branch_id || '',
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to add godown');
    }
  };

  const filteredGodowns = godowns.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBranchName = (branchId) => {
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || 'All Branches';
  };

  const getGodownStock = (godownId) => {
    const godownMedicines = medicines.filter((m) => m.godown_id === godownId);
    const totalItems = godownMedicines.length;
    const totalQuantity = godownMedicines.reduce(
      (sum, m) => sum + (m.stock_quantity || 0),
      0
    );
    return { totalItems, totalQuantity };
  };

  const totalGodownItems = medicines.filter((m) => m.godown_id).length;
  const totalGodownStock = medicines
    .filter((m) => m.godown_id)
    .reduce((sum, m) => sum + (m.stock_quantity || 0), 0);

  return (
    <div className="space-y-6" data-testid="godown-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Godown Management
          </h1>
          <p className="mt-2 text-slate-600">Manage warehouse and stock locations</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="add-godown-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Godown
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Godown</DialogTitle>
              <DialogDescription>Enter godown/warehouse details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Godown Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Main Warehouse"
                    required
                    data-testid="godown-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Industrial Area, Sector 5"
                    required
                    data-testid="location-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person *</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_person: e.target.value })
                    }
                    placeholder="John Doe"
                    required
                    data-testid="contact-person-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    required
                    data-testid="phone-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Associated Branch</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branch_id: value })
                  }
                >
                  <SelectTrigger data-testid="branch-select">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="submit-godown-button"
                >
                  Add Godown
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-sm font-medium text-slate-600">Total Godowns</div>
            <Warehouse className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">{godowns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-sm font-medium text-slate-600">Items in Godowns</div>
            <Package className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">{totalGodownItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-sm font-medium text-slate-600">Total Stock Units</div>
            <Package className="w-5 h-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-950">{totalGodownStock}</div>
          </CardContent>
        </Card>
      </div>

      {/* Godowns Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search godowns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              data-testid="search-input"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-600">Loading godowns...</div>
          ) : filteredGodowns.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              No godowns found. Add your first godown to start managing warehouse stock.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGodowns.map((godown) => {
                const stock = getGodownStock(godown.id);
                return (
                  <Card
                    key={godown.id}
                    className="hover:shadow-md transition-shadow border-2 border-slate-100"
                    data-testid={`godown-card-${godown.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Warehouse className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-slate-900 truncate">
                            {godown.name}
                          </h3>
                          <p className="text-sm text-slate-500 flex items-center mt-1">
                            <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                            {godown.location}
                          </p>

                          <div className="mt-3 space-y-1">
                            <p className="text-sm text-slate-600 flex items-center">
                              <User className="w-4 h-4 mr-2 text-slate-400" />
                              {godown.contact_person}
                            </p>
                            <p className="text-sm text-slate-600 flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-slate-400" />
                              {godown.phone}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="text-center">
                                <div className="text-xl font-bold text-emerald-600">
                                  {stock.totalItems}
                                </div>
                                <div className="text-xs text-slate-500">Items</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-blue-600">
                                  {stock.totalQuantity}
                                </div>
                                <div className="text-xs text-slate-500">Units</div>
                              </div>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                {getBranchName(godown.branch_id)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Godown Stock Details Table */}
      {godowns.length > 0 && medicines.filter((m) => m.godown_id).length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-heading font-bold">Stock in Godowns</h3>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Medicine Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Godown
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Batch No.
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Stock Qty
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      Expiry Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {medicines
                    .filter((m) => m.godown_id)
                    .map((medicine) => {
                      const godown = godowns.find((g) => g.id === medicine.godown_id);
                      return (
                        <tr
                          key={medicine.id}
                          className="border-b border-slate-100 table-row"
                        >
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">
                            {medicine.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {godown?.name || 'Unknown'}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {medicine.batch_number}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                            {medicine.stock_quantity}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {medicine.expiry_date
                              ? new Date(medicine.expiry_date).toLocaleDateString(
                                  'en-IN'
                                )
                              : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Godown;
