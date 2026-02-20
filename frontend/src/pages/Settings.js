import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
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
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, Building2, Save,
  Upload, Image, Printer, FileText, X, Users,
  Warehouse, Stethoscope, Plus, Edit, Trash2, Power
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Settings = ({ user }) => {
  const [settings, setSettings] = useState({
    clinic_name: '', clinic_address: '', clinic_phone: '', clinic_email: '',
    gstin: '', logo_url: '', enable_gst: true, default_gst_percentage: 18,
    currency_symbol: '₹', default_paper_size: 'a4', thermal_printer_width: '80mm',
    print_header: true, print_footer: true, print_logo: true
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Users, Branches, Godowns, Doctors state
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Edit mode states for forms
  const [clinicEditMode, setClinicEditMode] = useState(false);
  const [printEditMode, setPrintEditMode] = useState(false);
  const [gstEditMode, setGstEditMode] = useState(false);

  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'default'
  });

  // Dialog states
  const [userDialog, setUserDialog] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [godownDialog, setGodownDialog] = useState(false);
  const [doctorDialog, setDoctorDialog] = useState(false);

  // Edit states
  const [editingUser, setEditingUser] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editingGodown, setEditingGodown] = useState(null);
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Form states
  const [userForm, setUserForm] = useState({
    full_name: '', email: '', password: '', confirmPassword: '', role: 'receptionist', branch_id: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [branchForm, setBranchForm] = useState({
    name: '', address: '', location: '', phone: '', email: ''
  });
  const [godownForm, setGodownForm] = useState({
    name: '', location: '', contact_person: '', phone: '', branch_id: ''
  });
  const [doctorForm, setDoctorForm] = useState({
    name: '', specialization: '', qualification: '', phone: '', email: '',
    experience_years: '', consultation_fee: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [settingsRes, usersRes, branchesRes, godownsRes, doctorsRes] = await Promise.all([
        axios.get(`${API}/settings`).catch(() => ({ data: {} })),
        axios.get(`${API}/users`),
        axios.get(`${API}/branches`),
        axios.get(`${API}/godowns`),
        axios.get(`${API}/doctors`),
      ]);
      setSettings(prev => ({ ...prev, ...settingsRes.data }));
      setUsers(usersRes.data);
      setBranches(branchesRes.data);
      setGodowns(godownsRes.data);
      setDoctors(doctorsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to show confirmation dialog
  const showConfirm = (title, description, onConfirm, variant = 'default') => {
    setConfirmDialog({ open: true, title, description, onConfirm, variant });
  };

  const handleSaveSettings = async (section) => {
    try {
      await axios.put(`${API}/settings`, settings);
      toast.success('Settings saved!');
      if (section === 'clinic') setClinicEditMode(false);
      if (section === 'print') setPrintEditMode(false);
      if (section === 'gst') setGstEditMode(false);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const confirmSaveSettings = (section) => {
    showConfirm(
      'Save Changes?',
      'Are you sure you want to save these settings?',
      () => handleSaveSettings(section)
    );
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Invalid file type');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large (max 2MB)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API}/upload-logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings({ ...settings, logo_url: response.data.logo_url });
      toast.success('Logo uploaded!');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const getLogoUrl = () => {
    if (!settings.logo_url) return null;
    return settings.logo_url.startsWith('http') ? settings.logo_url : `${BACKEND_URL}${settings.logo_url}`;
  };

  // User handlers
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = { ...userForm };
        if (!updateData.password) delete updateData.password;
        await axios.put(`${API}/users/${editingUser.id}`, updateData);
        toast.success('User updated');
      } else {
        await axios.post(`${API}/auth/register`, userForm);
        toast.success('User created');
      }
      setUserDialog(false);
      setUserForm({ full_name: '', email: '', password: '', role: 'receptionist', branch_id: '' });
      setEditingUser(null);
      fetchAllData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail.map(e => e.msg || e).join(', '));
      } else if (typeof detail === 'object') {
        toast.error(detail.msg || JSON.stringify(detail));
      } else {
        toast.error(detail || 'Failed to save user');
      }
    }
  };

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      await axios.post(`${API}/users/${userId}/toggle_active`);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (id) => {
    showConfirm(
      'Delete User?',
      'Are you sure you want to delete this user? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/users/${id}`);
          toast.success('User deleted');
          fetchAllData();
        } catch (error) {
          toast.error('Failed to delete user');
        }
      },
      'destructive'
    );
  };

  // Branch handlers
  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await axios.put(`${API}/branches/${editingBranch.id}`, branchForm);
        toast.success('Branch updated');
      } else {
        await axios.post(`${API}/branches`, branchForm);
        toast.success('Branch created');
      }
      setBranchDialog(false);
      setBranchForm({ name: '', address: '', location: '', phone: '', email: '' });
      setEditingBranch(null);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save branch');
    }
  };

  const handleDeleteBranch = async (id) => {
    showConfirm(
      'Delete Branch?',
      'Are you sure you want to delete this branch? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/branches/${id}`);
          toast.success('Branch deleted');
          fetchAllData();
        } catch (error) {
          toast.error('Failed to delete branch');
        }
      },
      'destructive'
    );
  };

  // Godown handlers
  const handleGodownSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGodown) {
        await axios.put(`${API}/godowns/${editingGodown.id}`, godownForm);
        toast.success('Godown updated');
      } else {
        await axios.post(`${API}/godowns`, godownForm);
        toast.success('Godown created');
      }
      setGodownDialog(false);
      setGodownForm({ name: '', location: '', contact_person: '', phone: '', branch_id: '' });
      setEditingGodown(null);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save godown');
    }
  };

  const handleDeleteGodown = async (id) => {
    showConfirm(
      'Delete Godown?',
      'Are you sure you want to delete this godown? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/godowns/${id}`);
          toast.success('Godown deleted');
          fetchAllData();
        } catch (error) {
          toast.error('Failed to delete godown');
        }
      },
      'destructive'
    );
  };

  // Doctor handlers
  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...doctorForm,
        experience_years: doctorForm.experience_years ? parseInt(doctorForm.experience_years) : null,
        consultation_fee: doctorForm.consultation_fee ? parseFloat(doctorForm.consultation_fee) : null
      };
      if (editingDoctor) {
        await axios.put(`${API}/doctors/${editingDoctor.id}`, payload);
        toast.success('Doctor updated');
      } else {
        await axios.post(`${API}/doctors`, payload);
        toast.success('Doctor created');
      }
      setDoctorDialog(false);
      setDoctorForm({ name: '', specialization: '', qualification: '', phone: '', email: '', experience_years: '', consultation_fee: '' });
      setEditingDoctor(null);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save doctor');
    }
  };

  const handleDeleteDoctor = async (id) => {
    showConfirm(
      'Delete Doctor?',
      'Are you sure you want to delete this doctor? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API}/doctors/${id}`);
          toast.success('Doctor deleted');
          fetchAllData();
        } catch (error) {
          toast.error('Failed to delete doctor');
        }
      },
      'destructive'
    );
  };

  const getBranchName = (id) => branches.find(b => b.id === id)?.name || '-';

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-slate-600 mt-2">Only administrators can access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-2 text-slate-600">Manage clinic settings and configurations</p>
      </div>

      <Tabs defaultValue="clinic" className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="clinic"><Building2 className="w-4 h-4 mr-1" />Clinic</TabsTrigger>
          <TabsTrigger value="gst"><SettingsIcon className="w-4 h-4 mr-1" />GST</TabsTrigger>
          <TabsTrigger value="print"><Printer className="w-4 h-4 mr-1" />Print</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="branches"><Building2 className="w-4 h-4 mr-1" />Branches</TabsTrigger>
          <TabsTrigger value="godowns"><Warehouse className="w-4 h-4 mr-1" />Godowns</TabsTrigger>
          <TabsTrigger value="doctors"><Stethoscope className="w-4 h-4 mr-1" />Doctors</TabsTrigger>
        </TabsList>

        {/* Clinic Info Tab */}
        <TabsContent value="clinic">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Clinic Information</CardTitle>
                <div className="flex gap-2">
                  {!clinicEditMode ? (
                    <Button onClick={() => setClinicEditMode(true)} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                      <Edit className="w-4 h-4 mr-2" />Edit
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setClinicEditMode(false)} variant="outline">Cancel</Button>
                      <Button onClick={() => confirmSaveSettings('clinic')} className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="w-4 h-4 mr-2" />Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Section */}
              <div className="p-6 bg-slate-50 rounded-lg border-2 border-dashed">
                <Label className="text-base font-semibold mb-4 block">Clinic Logo</Label>
                <div className="flex items-start gap-6">
                  <div className="w-32 h-32 bg-white rounded-lg border-2 flex items-center justify-center overflow-hidden">
                    {settings.logo_url ? (
                      <img src={getLogoUrl()} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-center text-slate-400"><Image className="w-12 h-12 mx-auto" /><span className="text-xs">No logo</span></div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-slate-600">Upload your clinic logo for bills and reports.</p>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 font-medium">Logo Requirements:</p>
                      <ul className="text-xs text-blue-600 mt-1 space-y-1">
                        <li>• Recommended size: 200x200 pixels</li>
                        <li>• Max file size: 2MB</li>
                        <li>• Formats: PNG, JPG, JPEG</li>
                        <li>• Square or rectangular shape works best</li>
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleLogoUpload} className="hidden" disabled={!clinicEditMode} />
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || !clinicEditMode}>
                        <Upload className="w-4 h-4 mr-2" />{uploading ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                      {settings.logo_url && (
                        <Button variant="destructive" size="sm" onClick={() => setSettings({ ...settings, logo_url: '' })} disabled={!clinicEditMode}>
                          <X className="w-4 h-4" />Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clinic Name</Label>
                  <Input value={settings.clinic_name || ''} onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })} disabled={!clinicEditMode} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={settings.clinic_phone || ''} onChange={(e) => setSettings({ ...settings, clinic_phone: e.target.value })} disabled={!clinicEditMode} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={settings.clinic_address || ''} onChange={(e) => setSettings({ ...settings, clinic_address: e.target.value })} disabled={!clinicEditMode} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={settings.clinic_email || ''} onChange={(e) => setSettings({ ...settings, clinic_email: e.target.value })} disabled={!clinicEditMode} />
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input value={settings.gstin || ''} onChange={(e) => setSettings({ ...settings, gstin: e.target.value })} disabled={!clinicEditMode} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Print Settings Tab */}
        <TabsContent value="print">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Print Settings</CardTitle>
                <div className="flex gap-2">
                  {!printEditMode ? (
                    <Button onClick={() => setPrintEditMode(true)} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                      <Edit className="w-4 h-4 mr-2" />Edit
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setPrintEditMode(false)} variant="outline">Cancel</Button>
                      <Button onClick={() => confirmSaveSettings('print')} className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="w-4 h-4 mr-2" />Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Paper Size */}
              <div className="space-y-2">
                <Label>Paper Size</Label>
                <Select value={settings.paper_size || 'a4'} onValueChange={(v) => setSettings({ ...settings, paper_size: v })} disabled={!printEditMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4 (210 x 297 mm)</SelectItem>
                    <SelectItem value="a5">A5 (148 x 210 mm)</SelectItem>
                    <SelectItem value="thermal80">Thermal 80mm</SelectItem>
                    <SelectItem value="thermal58">Thermal 58mm</SelectItem>
                    <SelectItem value="letter">Letter (8.5 x 11 in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Header Text */}
              <div className="space-y-2">
                <Label>Bill Header Text</Label>
                <Input
                  value={settings.print_header || ''}
                  onChange={(e) => setSettings({ ...settings, print_header: e.target.value })}
                  placeholder="e.g., Thank you for visiting our clinic!"
                  disabled={!printEditMode}
                />
                <p className="text-xs text-slate-500">This text will appear at the top of printed bills</p>
              </div>

              {/* Footer Text */}
              <div className="space-y-2">
                <Label>Bill Footer Text</Label>
                <Input
                  value={settings.print_footer || ''}
                  onChange={(e) => setSettings({ ...settings, print_footer: e.target.value })}
                  placeholder="e.g., Terms and conditions apply. Thank you!"
                  disabled={!printEditMode}
                />
                <p className="text-xs text-slate-500">This text will appear at the bottom of printed bills</p>
              </div>

              {/* Print Options */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Print Options</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.print_logo !== false}
                      onCheckedChange={(c) => setSettings({ ...settings, print_logo: c })}
                      disabled={!printEditMode}
                    />
                    <Label>Show Logo on Bills</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.print_address !== false}
                      onCheckedChange={(c) => setSettings({ ...settings, print_address: c })}
                      disabled={!printEditMode}
                    />
                    <Label>Show Clinic Address</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.print_gstin !== false}
                      onCheckedChange={(c) => setSettings({ ...settings, print_gstin: c })}
                      disabled={!printEditMode}
                    />
                    <Label>Show GSTIN</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.print_signature !== false}
                      onCheckedChange={(c) => setSettings({ ...settings, print_signature: c })}
                      disabled={!printEditMode}
                    />
                    <Label>Show Signature Space</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Tab */}
        <TabsContent value="gst">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>GST Configuration</CardTitle>
                <div className="flex gap-2">
                  {!gstEditMode ? (
                    <Button onClick={() => setGstEditMode(true)} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                      <Edit className="w-4 h-4 mr-2" />Edit
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setGstEditMode(false)} variant="outline">Cancel</Button>
                      <Button onClick={() => confirmSaveSettings('gst')} className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="w-4 h-4 mr-2" />Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Treatment GST */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-blue-800">Treatment Billing GST</h3>
                    <p className="text-sm text-blue-600">Enable GST for dental treatment bills</p>
                  </div>
                  <Switch
                    checked={settings.enable_treatment_gst !== false}
                    onCheckedChange={(c) => setSettings({ ...settings, enable_treatment_gst: c })}
                    disabled={!gstEditMode}
                  />
                </div>
                {settings.enable_treatment_gst !== false && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-200">
                    <div className="space-y-2">
                      <Label className="text-blue-700">Treatment GST %</Label>
                      <Input
                        type="number"
                        value={settings.treatment_gst_percentage || 18}
                        onChange={(e) => setSettings({ ...settings, treatment_gst_percentage: parseFloat(e.target.value) })}
                        disabled={!gstEditMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-blue-700">Treatment GSTIN</Label>
                      <Input
                        value={settings.treatment_gstin || ''}
                        onChange={(e) => setSettings({ ...settings, treatment_gstin: e.target.value })}
                        placeholder="Enter GSTIN for treatment billing"
                        disabled={!gstEditMode}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pharmacy GST */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-green-800">Pharmacy Billing GST</h3>
                    <p className="text-sm text-green-600">Enable GST for pharmacy sales</p>
                  </div>
                  <Switch
                    checked={settings.enable_pharmacy_gst !== false}
                    onCheckedChange={(c) => setSettings({ ...settings, enable_pharmacy_gst: c })}
                    disabled={!gstEditMode}
                  />
                </div>
                {settings.enable_pharmacy_gst !== false && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-green-200">
                    <div className="space-y-2">
                      <Label className="text-green-700">Pharmacy GST %</Label>
                      <Input
                        type="number"
                        value={settings.pharmacy_gst_percentage || 12}
                        onChange={(e) => setSettings({ ...settings, pharmacy_gst_percentage: parseFloat(e.target.value) })}
                        disabled={!gstEditMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-700">Pharmacy GSTIN</Label>
                      <Input
                        value={settings.pharmacy_gstin || ''}
                        onChange={(e) => setSettings({ ...settings, pharmacy_gstin: e.target.value })}
                        placeholder="Enter GSTIN for pharmacy billing"
                        disabled={!gstEditMode}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Currency Symbol</Label>
                <Input value={settings.currency_symbol || '₹'} onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })} maxLength={5} disabled={!gstEditMode} />
              </div>

              {/* Expiry Settings */}
              <div className="pt-4 border-t space-y-2">
                <Label className="text-base font-semibold">Expiry Alerts</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiry Alert Window (Days)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.expiry_alert_days || 90}
                      onChange={(e) => setSettings({ ...settings, expiry_alert_days: parseInt(e.target.value) || 1 })}
                      disabled={!gstEditMode}
                    />
                    <p className="text-xs text-slate-500">Number of days before expiry to show alerts on Dashboard.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users ({users.length})</CardTitle>
              <Dialog open={userDialog} onOpenChange={(o) => { setUserDialog(o); if (!o) { setUserForm({ full_name: '', email: '', password: '', confirmPassword: '', role: 'receptionist', branch_id: '' }); setEditingUser(null); setPasswordError(''); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add User</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingUser ? 'Edit' : 'Add'} User</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (userForm.password && userForm.password !== userForm.confirmPassword) {
                      setPasswordError('Passwords do not match!');
                      return;
                    }
                    setPasswordError('');
                    handleUserSubmit(e);
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{editingUser ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
                      <Input type="password" value={userForm.password} onChange={(e) => { setUserForm({ ...userForm, password: e.target.value }); setPasswordError(''); }} required={!editingUser} />
                    </div>
                    <div className="space-y-2">
                      <Label>{editingUser ? 'Confirm New Password' : 'Confirm Password *'}</Label>
                      <Input type="password" value={userForm.confirmPassword} onChange={(e) => { setUserForm({ ...userForm, confirmPassword: e.target.value }); setPasswordError(''); }} required={!editingUser || userForm.password} />
                      {passwordError && <p className="text-sm text-red-500 font-medium">{passwordError}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role *</Label>
                        <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="branch_manager">Branch Manager</SelectItem>
                            <SelectItem value="receptionist">Receptionist</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Select value={userForm.branch_id} onValueChange={(v) => setUserForm({ ...userForm, branch_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                          <SelectContent>
                            {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setUserDialog(false)}>Cancel</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingUser ? 'Update' : 'Create'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-2 px-3 text-sm font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Email</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Role</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Branch</th>
                    <th className="text-center py-2 px-3 text-sm font-medium">Status</th>
                    <th className="text-right py-2 px-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium">{u.full_name}</td>
                      <td className="py-2 px-3">{u.email}</td>
                      <td className="py-2 px-3 capitalize">{u.role?.replace('_', ' ')}</td>
                      <td className="py-2 px-3">{getBranchName(u.branch_id)}</td>
                      <td className="py-2 px-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleUserActive(u.id, u.is_active)}>
                          <Power className={`w-4 h-4 ${u.is_active ? 'text-emerald-500' : 'text-red-500'}`} />
                        </Button>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => { setEditingUser(u); setUserForm({ ...u, password: '' }); setUserDialog(true); }}><Edit className="w-3 h-3" /></Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Branches ({branches.length})</CardTitle>
              <Dialog open={branchDialog} onOpenChange={(o) => { setBranchDialog(o); if (!o) { setBranchForm({ name: '', address: '', phone: '', email: '' }); setEditingBranch(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-2" />Add Branch</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingBranch ? 'Edit' : 'Add'} Branch</DialogTitle></DialogHeader>
                  <form onSubmit={handleBranchSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Branch Name *</Label>
                      <Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Textarea value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={branchForm.email} onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setBranchDialog(false)}>Cancel</Button>
                      <Button type="submit" className="bg-purple-600 hover:bg-purple-700">{editingBranch ? 'Update' : 'Create'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {branches.map((b) => (
                  <div key={b.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{b.name}</h3>
                        <p className="text-sm text-slate-500">{b.address || 'No address'}</p>
                        {b.phone && <p className="text-sm text-slate-500">{b.phone}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => { setEditingBranch(b); setBranchForm(b); setBranchDialog(true); }}><Edit className="w-3 h-3" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteBranch(b.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Godowns Tab */}
        <TabsContent value="godowns">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Godowns ({godowns.length})</CardTitle>
              <Dialog open={godownDialog} onOpenChange={(o) => { setGodownDialog(o); if (!o) { setGodownForm({ name: '', location: '', contact_person: '', phone: '', branch_id: '' }); setEditingGodown(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 mr-2" />Add Godown</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingGodown ? 'Edit' : 'Add'} Godown</DialogTitle></DialogHeader>
                  <form onSubmit={handleGodownSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Godown Name *</Label>
                      <Input value={godownForm.name} onChange={(e) => setGodownForm({ ...godownForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={godownForm.location} onChange={(e) => setGodownForm({ ...godownForm, location: e.target.value })} placeholder="Address or location" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contact Person</Label>
                        <Input value={godownForm.contact_person} onChange={(e) => setGodownForm({ ...godownForm, contact_person: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={godownForm.phone} onChange={(e) => setGodownForm({ ...godownForm, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setGodownDialog(false)}>Cancel</Button>
                      <Button type="submit" className="bg-amber-600 hover:bg-amber-700">{editingGodown ? 'Update' : 'Create'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-2 px-3 text-sm font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Location</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Contact</th>
                    <th className="text-right py-2 px-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {godowns.map((g) => (
                    <tr key={g.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium">{g.name}</td>
                      <td className="py-2 px-3">{g.location || '-'}</td>
                      <td className="py-2 px-3">{g.contact_person || '-'}{g.phone ? ` (${g.phone})` : ''}</td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => { setEditingGodown(g); setGodownForm({ name: g.name, location: g.location || '', contact_person: g.contact_person || '', phone: g.phone || '', branch_id: g.branch_id || '' }); setGodownDialog(true); }}><Edit className="w-3 h-3" /></Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteGodown(g.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctors Tab */}
        <TabsContent value="doctors">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Doctors ({doctors.length})</CardTitle>
              <Dialog open={doctorDialog} onOpenChange={(o) => { setDoctorDialog(o); if (!o) { setDoctorForm({ name: '', specialization: '', qualification: '', phone: '', email: '', experience_years: '', consultation_fee: '' }); setEditingDoctor(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />Add Doctor</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingDoctor ? 'Edit' : 'Add'} Doctor</DialogTitle></DialogHeader>
                  <form onSubmit={handleDoctorSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={doctorForm.name} onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Specialization *</Label>
                        <Input value={doctorForm.specialization} onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Qualification</Label>
                        <Input value={doctorForm.qualification} onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={doctorForm.phone} onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={doctorForm.email} onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Experience (Years)</Label>
                        <Input type="number" value={doctorForm.experience_years} onChange={(e) => setDoctorForm({ ...doctorForm, experience_years: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Consultation Fee (₹)</Label>
                        <Input type="number" value={doctorForm.consultation_fee} onChange={(e) => setDoctorForm({ ...doctorForm, consultation_fee: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDoctorDialog(false)}>Cancel</Button>
                      <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{editingDoctor ? 'Update' : 'Create'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-2 px-3 text-sm font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Specialization</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Qualification</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Phone</th>
                    <th className="text-right py-2 px-3 text-sm font-medium">Fee</th>
                    <th className="text-right py-2 px-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium">{d.name}</td>
                      <td className="py-2 px-3">{d.specialization}</td>
                      <td className="py-2 px-3">{d.qualification || '-'}</td>
                      <td className="py-2 px-3">{d.phone || '-'}</td>
                      <td className="py-2 px-3 text-right">{d.consultation_fee ? `₹${d.consultation_fee}` : '-'}</td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => { setEditingDoctor(d); setDoctorForm({ ...d, experience_years: d.experience_years?.toString() || '', consultation_fee: d.consultation_fee?.toString() || '' }); setDoctorDialog(true); }}><Edit className="w-3 h-3" /></Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteDoctor(d.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          setConfirmDialog({ ...confirmDialog, open: false });
        }}
        variant={confirmDialog.variant}
      />
    </div>
  );
};

export default Settings;
