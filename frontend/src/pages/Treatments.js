import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Stethoscope, Edit, Trash2, FolderTree, Layers } from 'lucide-react';

const Treatments = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [gstSlabs, setGstSlabs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [openCategory, setOpenCategory] = useState(false);
  const [openSubcategory, setOpenSubcategory] = useState(false);
  const [openTreatment, setOpenTreatment] = useState(false);
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingTreatment, setEditingTreatment] = useState(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [subcategoryForm, setSubcategoryForm] = useState({ category_id: '', name: '', description: '' });
  const [treatmentForm, setTreatmentForm] = useState({
    category_id: '',
    subcategory_id: '',
    name: '',
    description: '',
    charges: '',
    gst_applicable: false,
    gst_percentage: '0',
    duration_minutes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, subcategoriesRes, treatmentsRes, gstRes] = await Promise.all([
        axios.get(`${API}/treatment-categories`),
        axios.get(`${API}/treatment-subcategories`),
        axios.get(`${API}/treatments`),
        axios.get(`${API}/gst-slabs`).catch(() => ({ data: [] })),
      ]);
      setCategories(categoriesRes.data);
      setSubcategories(subcategoriesRes.data);
      setTreatments(treatmentsRes.data);
      setGstSlabs(gstRes.data.filter(g => g.is_active));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/treatment-categories/${editingCategory.id}`, categoryForm);
        toast.success('Category updated');
      } else {
        await axios.post(`${API}/treatment-categories`, categoryForm);
        toast.success('Category added');
      }
      setOpenCategory(false);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description || '' });
    setOpenCategory(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await axios.delete(`${API}/treatment-categories/${categoryId}`);
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', description: '' });
    setEditingCategory(null);
  };

  // Subcategory handlers
  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubcategory) {
        await axios.put(`${API}/treatment-subcategories/${editingSubcategory.id}`, subcategoryForm);
        toast.success('Subcategory updated');
      } else {
        await axios.post(`${API}/treatment-subcategories`, subcategoryForm);
        toast.success('Subcategory added');
      }
      setOpenSubcategory(false);
      resetSubcategoryForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save subcategory');
    }
  };

  const handleEditSubcategory = (subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({ 
      category_id: subcategory.category_id, 
      name: subcategory.name, 
      description: subcategory.description || '' 
    });
    setOpenSubcategory(true);
  };

  const handleDeleteSubcategory = async (subcategoryId) => {
    if (!window.confirm('Are you sure you want to delete this subcategory?')) return;
    try {
      await axios.delete(`${API}/treatment-subcategories/${subcategoryId}`);
      toast.success('Subcategory deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete subcategory');
    }
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({ category_id: '', name: '', description: '' });
    setEditingSubcategory(null);
  };

  // Treatment handlers
  const handleTreatmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...treatmentForm,
        charges: parseFloat(treatmentForm.charges),
        gst_applicable: treatmentForm.gst_applicable,
        gst_percentage: treatmentForm.gst_applicable ? parseFloat(treatmentForm.gst_percentage) : 0,
        duration_minutes: treatmentForm.duration_minutes ? parseInt(treatmentForm.duration_minutes) : null
      };

      if (editingTreatment) {
        await axios.put(`${API}/treatments/${editingTreatment.id}`, payload);
        toast.success('Treatment updated');
      } else {
        await axios.post(`${API}/treatments`, payload);
        toast.success('Treatment added');
      }
      setOpenTreatment(false);
      resetTreatmentForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save treatment');
    }
  };

  const handleEditTreatment = (treatment) => {
    setEditingTreatment(treatment);
    setTreatmentForm({
      category_id: treatment.category_id,
      subcategory_id: treatment.subcategory_id,
      name: treatment.name,
      description: treatment.description || '',
      charges: treatment.charges.toString(),
      gst_applicable: treatment.gst_applicable || false,
      gst_percentage: (treatment.gst_percentage || 0).toString(),
      duration_minutes: treatment.duration_minutes?.toString() || ''
    });
    setOpenTreatment(true);
  };

  const handleDeleteTreatment = async (treatmentId) => {
    if (!window.confirm('Are you sure you want to delete this treatment?')) return;
    try {
      await axios.delete(`${API}/treatments/${treatmentId}`);
      toast.success('Treatment deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete treatment');
    }
  };

  const resetTreatmentForm = () => {
    setTreatmentForm({
      category_id: '',
      subcategory_id: '',
      name: '',
      description: '',
      charges: '',
      gst_applicable: false,
      gst_percentage: '0',
      duration_minutes: ''
    });
    setEditingTreatment(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'N/A';
  const getSubcategoryName = (id) => subcategories.find(s => s.id === id)?.name || 'N/A';

  return (
    <div className="space-y-6" data-testid="treatments-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">
            Treatment Management
          </h1>
          <p className="mt-2 text-slate-600">Manage treatment categories, subcategories, and pricing</p>
        </div>
      </div>

      <Tabs defaultValue="treatments" className="w-full">
        <TabsList>
          <TabsTrigger value="treatments">Treatments ({treatments.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="subcategories">Subcategories ({subcategories.length})</TabsTrigger>
        </TabsList>

        {/* Treatments Tab */}
        <TabsContent value="treatments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={openTreatment} onOpenChange={(open) => { setOpenTreatment(open); if (!open) resetTreatmentForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="add-treatment-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Treatment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingTreatment ? 'Edit' : 'Add'} Treatment</DialogTitle>
                  <DialogDescription>Enter treatment details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleTreatmentSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="treatment-category">Category *</Label>
                      <select
                        id="treatment-category"
                        value={treatmentForm.category_id}
                        onChange={(e) => setTreatmentForm({ ...treatmentForm, category_id: e.target.value, subcategory_id: '' })}
                        className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        aria-label="Select category"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="treatment-subcategory">Subcategory *</Label>
                      <select
                        id="treatment-subcategory"
                        value={treatmentForm.subcategory_id}
                        onChange={(e) => setTreatmentForm({ ...treatmentForm, subcategory_id: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        aria-label="Select subcategory"
                        required
                      >
                        <option value="">Select subcategory</option>
                        {subcategories.filter(s => s.category_id === treatmentForm.category_id).map((sub) => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Treatment Name *</Label>
                    <Input value={treatmentForm.name} onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={treatmentForm.description} onChange={(e) => setTreatmentForm({ ...treatmentForm, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Charges (₹) *</Label>
                      <Input type="number" step="0.01" value={treatmentForm.charges} onChange={(e) => setTreatmentForm({ ...treatmentForm, charges: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Applicable?</Label>
                      <div className="flex items-center gap-4 h-10">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={treatmentForm.gst_applicable}
                            onChange={(e) => setTreatmentForm({ ...treatmentForm, gst_applicable: e.target.checked, gst_percentage: e.target.checked ? '18' : '0' })}
                            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className={treatmentForm.gst_applicable ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                            {treatmentForm.gst_applicable ? 'Yes' : 'No'}
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>GST Slab</Label>
                      <select
                        value={treatmentForm.gst_percentage}
                        onChange={(e) => setTreatmentForm({ ...treatmentForm, gst_percentage: e.target.value })}
                        disabled={!treatmentForm.gst_applicable}
                        className={`w-full h-10 px-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          treatmentForm.gst_applicable ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-100 text-slate-400'
                        }`}
                        aria-label="Select GST slab"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={treatmentForm.duration_minutes} onChange={(e) => setTreatmentForm({ ...treatmentForm, duration_minutes: e.target.value })} placeholder="e.g., 30" />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => { setOpenTreatment(false); resetTreatmentForm(); }}>Cancel</Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                      {editingTreatment ? 'Update' : 'Add'} Treatment
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {treatments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Stethoscope className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No treatments added yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Treatment</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Category</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Subcategory</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Charges</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">GST</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Duration</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treatments.map((treatment) => (
                        <tr key={treatment.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-medium">{treatment.name}</p>
                            {treatment.description && <p className="text-xs text-slate-500">{treatment.description}</p>}
                          </td>
                          <td className="py-3 px-4 text-sm">{getCategoryName(treatment.category_id)}</td>
                          <td className="py-3 px-4 text-sm">{getSubcategoryName(treatment.subcategory_id)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatCurrency(treatment.charges)}</td>
                          <td className="py-3 px-4 text-center">
                            {treatment.gst_applicable ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">{treatment.gst_percentage}%</span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">{treatment.duration_minutes ? `${treatment.duration_minutes} min` : '-'}</td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditTreatment(treatment)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteTreatment(treatment.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={openCategory} onOpenChange={(open) => { setOpenCategory(open); if (!open) resetCategoryForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-category-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
                  <DialogDescription>Enter category details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category Name *</Label>
                    <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => { setOpenCategory(false); resetCategoryForm(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingCategory ? 'Update' : 'Add'} Category
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-slate-500">
                  <FolderTree className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No categories added yet</p>
                </CardContent>
              </Card>
            ) : (
              categories.map((category) => (
                <Card key={category.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                          <FolderTree className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{category.name}</h3>
                          <p className="text-sm text-slate-500">
                            {subcategories.filter(s => s.category_id === category.id).length} subcategories
                          </p>
                        </div>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-slate-600 mb-3">{category.description}</p>
                    )}
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditCategory(category)}>
                        <Edit className="w-4 h-4 mr-1" />Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Subcategories Tab */}
        <TabsContent value="subcategories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={openSubcategory} onOpenChange={(open) => { setOpenSubcategory(open); if (!open) resetSubcategoryForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700" data-testid="add-subcategory-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Subcategory
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSubcategory ? 'Edit' : 'Add'} Subcategory</DialogTitle>
                  <DialogDescription>Enter subcategory details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubcategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subcategory-parent">Parent Category *</Label>
                    <select
                      id="subcategory-parent"
                      value={subcategoryForm.category_id}
                      onChange={(e) => setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      aria-label="Select parent category"
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subcategory Name *</Label>
                    <Input value={subcategoryForm.name} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={subcategoryForm.description} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })} />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => { setOpenSubcategory(false); resetSubcategoryForm(); }}>Cancel</Button>
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                      {editingSubcategory ? 'Update' : 'Add'} Subcategory
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {subcategories.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Layers className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No subcategories added yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Subcategory</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Category</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Description</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Treatments</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subcategories.map((subcategory) => (
                        <tr key={subcategory.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium">{subcategory.name}</td>
                          <td className="py-3 px-4 text-sm">{getCategoryName(subcategory.category_id)}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{subcategory.description || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 bg-slate-100 rounded text-sm">
                              {treatments.filter(t => t.subcategory_id === subcategory.id).length}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditSubcategory(subcategory)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteSubcategory(subcategory.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Treatments;
