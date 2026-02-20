import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
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
import { toast } from 'sonner';
import {
  Plus, Search, Edit, Trash2, User, Phone, Mail, Calendar, MapPin,
  Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, UserPlus
} from 'lucide-react';

const Patients = ({ user }) => {
  const [patients, setPatients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [walkinMap, setWalkinMap] = useState({}); // { patient_id: walkin_id }

  const [open, setOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const [formData, setFormData] = useState({
    patient_id: '', prefix: '', name: '', phone: '', alternate_phone: '',
    email: '', dob: '', age: '', gender: 'male', address: '', branch_id: '',
    is_dob_estimated: false
  });

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [bulkResults, setBulkResults] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, branchesRes] = await Promise.all([
        axios.get(`${API}/patients`),
        axios.get(`${API}/branches`),
      ]);
      setPatients(patientsRes.data);
      setBranches(branchesRes.data);

      // Also fetch today's walk-ins to pre-populate walkinMap
      const walkinsRes = await axios.get(`${API}/walkins?branch_ids=${user?.branch_id || branchesRes.data[0]?.id || ''}`);
      const today = new Date().toISOString().split('T')[0];
      const todayWalkins = walkinsRes.data.filter(w => w.check_in_time.startsWith(today));

      const map = {};
      todayWalkins.forEach(w => {
        map[w.patient_id] = w.id;
      });
      setWalkinMap(map);

      if (user?.branch_id) setFormData(prev => ({ ...prev, branch_id: user.branch_id }));
    } catch (error) {
      toast.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (patient) => {
    try {
      const response = await axios.post(`${API}/walkins/checkin`, {
        patient_id: patient.id,
        branch_id: user?.branch_id || (branches.length > 0 ? branches[0].id : null)
      });
      setWalkinMap(prev => ({ ...prev, [patient.id]: response.data.id }));
      toast.success(`${patient.name} checked in successfully`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Check-in failed');
    }
  };

  const handleUndoCheckIn = async (patientId) => {
    const walkinId = walkinMap[patientId];
    if (!walkinId) return;

    if (!window.confirm("Are you sure you want to undo this check-in?")) return;

    try {
      await axios.delete(`${API}/walkins/${walkinId}`);
      const newMap = { ...walkinMap };
      delete newMap[patientId];
      setWalkinMap(newMap);
      toast.success("Check-in undone successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to undo check-in");
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleDobChange = (dob) => {
    const calculatedAge = calculateAge(dob);
    setFormData({
      ...formData,
      dob,
      age: calculatedAge !== null ? calculatedAge.toString() : '',
      is_dob_estimated: false
    });
  };

  const handleAgeChange = (ageStr) => {
    const age = parseInt(ageStr);
    if (!isNaN(age) && age >= 0) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - age;
      const estimatedDob = `${birthYear}-01-01`;
      setFormData({
        ...formData,
        age: ageStr,
        dob: estimatedDob,
        is_dob_estimated: true
      });
    } else {
      setFormData({ ...formData, age: ageStr });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patient_id) { toast.error('Patient ID is required'); return; }

    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : (formData.dob ? calculateAge(formData.dob) : null),
        dob: formData.dob || null,
        branch_id: formData.branch_id || user?.branch_id || (branches.length > 0 ? branches[0].id : ''),
        is_dob_estimated: formData.is_dob_estimated
      };

      if (editingPatient) {
        await axios.put(`${API}/patients/${editingPatient.id}`, payload);
        toast.success('Patient updated');
      } else {
        await axios.post(`${API}/patients`, payload);
        toast.success('Patient added');
      }

      setOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save patient');
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      patient_id: patient.patient_id || '',
      prefix: patient.prefix || '',
      name: patient.name || '',
      phone: patient.phone || '',
      alternate_phone: patient.alternate_phone || '',
      email: patient.email || '',
      dob: patient.dob || '',
      age: patient.age?.toString() || '',
      gender: patient.gender || 'male',
      address: patient.address || '',
      branch_id: patient.branch_id || '',
      is_dob_estimated: patient.is_dob_estimated || false
    });
    setOpen(true);
  };


  const resetForm = () => {
    setFormData({
      patient_id: '', prefix: '', name: '', phone: '', alternate_phone: '',
      email: '', dob: '', age: '', gender: 'male', address: '',
      branch_id: user?.branch_id || (branches.length > 0 ? branches[0].id : ''),
      is_dob_estimated: false
    });
    setEditingPatient(null);
  };

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = (event) => {
      if (isExcel) {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_csv(worksheet);
          setBulkData(csvData);
        } catch (err) {
          toast.error('Failed to parse Excel file');
        }
      } else {
        setBulkData(event.target.result);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkData.trim()) {
      toast.error('Please enter or upload patient data');
      return;
    }

    try {
      const lines = bulkData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

      const fieldMap = {
        'prefix': 'prefix', 'title': 'prefix', 'salutation': 'prefix',
        'patient_id': 'patient_id', 'id': 'patient_id', 'patient id': 'patient_id',
        'name': 'name', 'patient name': 'name',
        'phone': 'phone', 'mobile': 'phone', 'mobile_number': 'phone', 'mobile number': 'phone', 'contact': 'phone',
        'email': 'email', 'dob': 'dob', 'date of birth': 'dob',
        'age': 'age', 'gender': 'gender', 'sex': 'gender',
        'address': 'address', 'branch_id': 'branch_id',
        'alternate_phone': 'alternate_phone', 'alternate phone': 'alternate_phone'
      };

      const patientsToUpload = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const patient = {
          branch_id: user?.branch_id || branches[0]?.id || null,
          address: '',
          prefix: '',
          is_dob_estimated: false
        };

        headers.forEach((header, idx) => {
          const fieldName = fieldMap[header];
          if (fieldName && values[idx]) {
            patient[fieldName] = fieldName === 'age' ? parseInt(values[idx]) || null : values[idx];
          }
        });

        if (patient.patient_id && patient.name && patient.phone && patient.gender) {
          patientsToUpload.push(patient);
        }
      }

      if (patientsToUpload.length === 0) {
        toast.error('No valid patients found. Required: patient_id, name, mobile_number, gender');
        return;
      }

      const response = await axios.post(`${API}/patients/bulk-upload`, patientsToUpload);
      setBulkResults(response.data);

      if (response.data.created > 0) {
        toast.success(`${response.data.created} patients uploaded`);
        fetchData();
      }
      if (response.data.errors?.length > 0) {
        toast.warning(`${response.data.errors.length} failed`);
      }
    } catch (error) {
      toast.error('Failed to upload patients');
    }
  };

  const downloadTemplate = () => {
    const template = `prefix,patient_id,name,mobile_number,alternate_phone,email,dob,age,gender,address
Mr,PAT001,John Doe,9876543210,,john@example.com,1990-05-15,,male,123 Main Street
Mrs,PAT002,Jane Smith,9876543211,9876543212,jane@example.com,,35,female,456 Oak Avenue`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patients_template.csv';
    a.click();
  };

  const getBranchName = (branchId) => branches.find(b => b.id === branchId)?.name || '-';
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-IN') : '-';
  const getDisplayAge = (patient) => patient.dob ? calculateAge(patient.dob) : patient.age || '-';

  return (
    <div className="space-y-6" data-testid="patients-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-950">Patients</h1>
          <p className="mt-2 text-slate-600">Manage patient records ({patients.length} total)</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkUploadOpen} onOpenChange={(o) => { setBulkUploadOpen(o); if (!o) { setBulkData(''); setBulkResults(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                <Upload className="w-4 h-4 mr-2" />Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Upload Patients</DialogTitle>
                <DialogDescription>Upload from CSV/Excel or paste data</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />Choose File
                  </Button>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />Download Template
                  </Button>
                </div>
                <Textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="prefix,patient_id,name,mobile_number,gender..."
                  rows={6}
                  className="font-mono text-sm"
                />
                <div className="p-3 bg-blue-50 rounded text-sm text-blue-700">
                  <strong>Required:</strong> patient_id, name, mobile_number, gender | <strong>Optional:</strong> prefix, alternate_phone, email, dob, age, address
                </div>
                {bulkResults && (
                  <div className="p-3 border rounded">
                    <div className="flex gap-4">
                      <span className="text-emerald-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1" />{bulkResults.created} created</span>
                      {bulkResults.errors?.length > 0 && <span className="text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{bulkResults.errors.length} failed</span>}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBulkUploadOpen(false)}>Cancel</Button>
                  <Button onClick={handleBulkUpload} className="bg-emerald-600 hover:bg-emerald-700">Upload</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="add-patient-btn">
                <Plus className="w-4 h-4 mr-2" />Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingPatient ? 'Edit' : 'Add'} Patient</DialogTitle>
                <DialogDescription>Enter patient information</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Patient ID *</Label>
                    <Input value={formData.patient_id} onChange={(e) => setFormData({ ...formData, patient_id: e.target.value.toUpperCase() })} placeholder="PAT001" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Select
                      value={formData.prefix}
                      onValueChange={(v) => {
                        let autoGender = formData.gender;
                        if (['Mr', 'Master', 'Dr'].includes(v)) autoGender = 'male';
                        else if (['Mrs', 'Ms', 'Miss'].includes(v)) autoGender = 'female';
                        else if (v === 'Baby') autoGender = 'other';

                        setFormData({ ...formData, prefix: v, gender: autoGender });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Title" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mr">Mr</SelectItem>
                        <SelectItem value="Mrs">Mrs</SelectItem>
                        <SelectItem value="Ms">Ms</SelectItem>
                        <SelectItem value="Miss">Miss</SelectItem>
                        <SelectItem value="Dr">Dr</SelectItem>
                        <SelectItem value="Master">Master</SelectItem>
                        <SelectItem value="Baby">Baby</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={formData.dob} onChange={(e) => handleDobChange(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Age {formData.dob && '(auto)'}</Label>
                    <Input type="number" value={formData.age} onChange={(e) => handleAgeChange(e.target.value)} />
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="is_dob_estimated"
                        checked={formData.is_dob_estimated}
                        onChange={(e) => setFormData({ ...formData, is_dob_estimated: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <Label htmlFor="is_dob_estimated" className="text-xs text-slate-500 cursor-pointer">Estimated DOB</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>WhatsApp Number (Primary) *</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Alternate Mobile Number</Label>
                    <Input value={formData.alternate_phone} onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} />
                </div>


                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{editingPatient ? 'Update' : 'Add'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search by name, ID or phone..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>{searchTerm ? 'No patients found' : 'No patients added yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-medium">Patient ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">DOB / Age</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Gender</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Mobile</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Address</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Branch</th>
                    <th className="text-right py-3 px-4 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-sm text-blue-600 font-semibold">{patient.patient_id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium">{patient.prefix ? `${patient.prefix} ` : ''}{patient.name}</p>
                            {patient.email && <p className="text-xs text-slate-500"><Mail className="w-3 h-3 inline mr-1" />{patient.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {patient.dob && <p className="text-sm"><Calendar className="w-3 h-3 inline mr-1 text-slate-400" />{formatDate(patient.dob)}</p>}
                        <p className="text-sm font-medium">
                          {getDisplayAge(patient)} years
                          {patient.is_dob_estimated && <span className="ml-1 text-[10px] text-orange-600 bg-orange-50 px-1 rounded border border-orange-100">Estimated</span>}
                        </p>
                      </td>
                      <td className="py-3 px-4 capitalize">{patient.gender}</td>
                      <td className="py-3 px-4"><Phone className="w-3 h-3 inline mr-1 text-slate-400" />{patient.phone}</td>
                      <td className="py-3 px-4 max-w-48 truncate" title={patient.address}><MapPin className="w-3 h-3 inline mr-1 text-slate-400" />{patient.address}</td>
                      <td className="py-3 px-4 text-sm">{getBranchName(patient.branch_id)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2 text-xs">
                          {walkinMap[patient.id] ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 bg-blue-600 hover:bg-blue-700 text-white border-none disabled:opacity-100"
                                disabled={true}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> Checked-In
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleUndoCheckIn(patient.id)}
                              >
                                Undo
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8"
                              onClick={() => handleCheckIn(patient)}
                            >
                              <UserPlus className="w-4 h-4 mr-1" /> Check-In
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-8" onClick={() => handleEdit(patient)}><Edit className="w-4 h-4" /></Button>
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
    </div >
  );
};

export default Patients;
