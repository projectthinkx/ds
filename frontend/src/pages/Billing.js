import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
// import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import {
  Search, Plus, Trash2, Printer, User, Stethoscope, Pill,
  CreditCard, CheckCircle, Edit, Eye, Receipt, Wallet, Building2,
  MessageCircle, Mail, Share2, RotateCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const Billing = ({ user, mode = 'all' }) => {
  // Data states
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [branches, setBranches] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bills, setBills] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchWalkins, setBranchWalkins] = useState([]);
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [settings, setSettings] = useState({
    clinic_name: '',
    logo_url: '',
    print_logo: true
  });

  // Tab state: 'treatment' | 'pharmacy'
  const [activeTab, setActiveTab] = useState(mode === 'pharmacy' ? 'pharmacy' : 'treatment');

  // Handle mode changes if necessary
  useEffect(() => {
    if (mode === 'treatment') setActiveTab('treatment');
    if (mode === 'pharmacy') setActiveTab('pharmacy');
  }, [mode]);

  // Branch and Doctor selection (at top)
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');

  // Patient selection
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    patient_id: '', name: '', phone: '', gender: 'male', address: ''
  });
  const [focusedPatientIndex, setFocusedPatientIndex] = useState(-1);

  // Treatment billing state
  const [treatmentItems, setTreatmentItems] = useState([]);
  const [treatmentDiscount, setTreatmentDiscount] = useState(0);
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [pendingTreatmentBills, setPendingTreatmentBills] = useState([]);
  const [selectedPendingBill, setSelectedPendingBill] = useState(null);
  const [showToothChart, setShowToothChart] = useState(null); // Index of treatment item showing tooth chart

  // FDI Tooth numbering - Permanent (Adult) teeth
  const permanentTeeth = {
    upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
    upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
    lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
    lowerRight: [48, 47, 46, 45, 44, 43, 42, 41]
  };

  // FDI Tooth numbering - Deciduous (Milk/Primary) teeth
  const milkTeeth = {
    upperRight: [55, 54, 53, 52, 51],
    upperLeft: [61, 62, 63, 64, 65],
    lowerLeft: [71, 72, 73, 74, 75],
    lowerRight: [85, 84, 83, 82, 81]
  };

  // State for tooth chart type (permanent or milk)
  const [toothChartType, setToothChartType] = useState('permanent');

  // Pharmacy billing state
  const [pharmacyItems, setPharmacyItems] = useState([]);
  const [pharmacyDiscount, setPharmacyDiscount] = useState(0);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [focusedMedicineIndex, setFocusedMedicineIndex] = useState(-1);

  // Collection dialog


  // Print refs
  const treatmentPrintRef = useRef();
  const pharmacyPrintRef = useRef();

  // Patient pending balance state
  const [patientPendingBalance, setPatientPendingBalance] = useState(0);
  const [patientCreditSales, setPatientCreditSales] = useState([]);


  // Separate pending amounts for treatment and pharmacy
  const [pendingTreatmentTotal, setPendingTreatmentTotal] = useState(0);
  const [pendingPharmacyTotal, setPendingPharmacyTotal] = useState(0);
  const [pendingPharmacySales, setPendingPharmacySales] = useState([]);

  // Role-based permissions
  const isAdmin = user?.role === 'admin';
  const isBranchManager = user?.role === 'branch_manager';
  const isReceptionist = user?.role === 'receptionist';
  const isAccountant = user?.role === 'accountant';

  // Treatment: Admin/Manager can add/edit/delete/view, Receptionist/Accountant can only view
  const canEditTreatment = isAdmin || isBranchManager;
  // Pharmacy: All roles can add/edit/delete/view
  const canEditPharmacy = true;
  // Discount: Only Admin/Manager
  const canGiveDiscount = isAdmin || isBranchManager;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        patientsRes,
        pharmacyStockRes,
        branchesRes,
        billsRes,
        banksRes,
        doctorsRes,
        itemTypesRes,
        itemMasterRes,
        settingsRes
      ] = await Promise.all([
        axios.get(`${API}/patients`),
        axios.get(`${API}/pharmacy-stock`),
        axios.get(`${API}/branches`),
        axios.get(`${API}/bills`),
        axios.get(`${API}/bank-accounts`),
        axios.get(`${API}/doctors`),
        axios.get(`${API}/item-types`),
        axios.get(`${API}/item-master`),
        axios.get(`${API}/settings`).catch(() => ({ data: {} })),
      ]);

      setPatients(patientsRes.data);
      // Filter out inactive medicines from pharmacy stock for billing
      const activeMedicines = pharmacyStockRes.data.filter(m => m.item_status !== 'INACTIVE');
      setMedicines(activeMedicines);

      setBranches(branchesRes.data);
      setBills(billsRes.data);
      setBankAccounts(banksRes.data);
      setDoctors(doctorsRes.data);
      if (settingsRes && settingsRes.data) {
        setSettings(prev => ({ ...prev, ...settingsRes.data }));
      }

      // Filter treatments from item-master
      // Also filter out INACTIVE treatments
      const treatmentType = itemTypesRes.data.find(t => t.name === 'Treatment');
      if (treatmentType) {
        const treatmentItems = itemMasterRes.data.filter(item =>
          item.item_type_id === treatmentType.id && item.item_status !== 'INACTIVE'
        );
        setTreatments(treatmentItems);
      } else {
        setTreatments([]);
      }

      // Set default branch
      if (user?.branch_id) {
        setSelectedBranch(user.branch_id);
      } else if (branchesRes.data.length > 0) {
        setSelectedBranch(branchesRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLogoUrl = () => {
    if (!settings.logo_url) return null;
    return settings.logo_url.startsWith('http') ? settings.logo_url : `${BACKEND_URL}${settings.logo_url}`;
  };

  const fetchBranchWalkins = async () => {
    if (!selectedBranch) return;
    setWalkinLoading(true);
    try {
      const res = await axios.get(`${API}/walkins?branch_id=${selectedBranch}&status=waiting`);
      setBranchWalkins(res.data);
    } catch (error) {
      console.error('Failed to fetch walk-ins:', error);
      toast.error('Failed to fetch walk-ins');
    } finally {
      setWalkinLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranch) {
      fetchBranchWalkins();
    }
  }, [selectedBranch]);

  // Calculations
  const treatmentSubtotal = treatmentItems.reduce((sum, item) =>
    sum + (parseFloat(item.amount) || 0), 0);
  const treatmentItemDiscounts = treatmentItems.reduce((sum, item) =>
    sum + (parseFloat(item.discount) || 0), 0);
  const treatmentGstAmount = treatmentItems.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0;
    const gstPercent = item.gst_percentage || 0;
    return sum + (amount * gstPercent / 100);
  }, 0);
  const treatmentTotal = Math.max(0, treatmentSubtotal - treatmentItemDiscounts - treatmentDiscount + treatmentGstAmount);

  const pharmacySubtotal = pharmacyItems.reduce((sum, item) =>
    sum + (item.unit_price * item.quantity), 0);
  const pharmacyTotal = Math.max(0, pharmacySubtotal - pharmacyDiscount);

  const grandTotal = treatmentTotal + pharmacyTotal;
  const overallTotal = grandTotal + patientPendingBalance;

  // Get all UPI IDs from bank accounts
  const allUpiIds = bankAccounts.flatMap(bank =>
    (bank.upi_ids || []).map(upi => ({
      upi,
      bank_id: bank.id,
      bank_name: bank.bank_name
    }))
  );
  // Format currency
  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

  // Doctor filtering based on selected branch
  const filteredDoctors = doctors.filter(doctor =>
    !selectedBranch || !doctor.branch_id || doctor.branch_id === selectedBranch
  );

  // Patient selection
  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone?.includes(patientSearch)
  );

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setPatientSearch('');
    setFocusedPatientIndex(-1); // Safety reset

    const patientId = patient.patient_id || patient.id;

    // Fetch pending balance for this patient (credit sales)
    try {
      const response = await axios.get(`${API}/credit-sales`);
      const pendingCredits = response.data.filter(cs =>
        (cs.patient_id === patientId || cs.patient_id === patient.id) &&
        cs.status !== 'paid' &&
        (cs.total_amount - (cs.paid_amount || 0)) > 0
      );

      // Separate treatment and pharmacy credits
      const treatmentCredits = pendingCredits.filter(cs => cs.sale_type === 'treatment' || !cs.sale_type);
      const pharmacyCredits = pendingCredits.filter(cs => cs.sale_type === 'pharmacy');

      const totalTreatmentPending = treatmentCredits.reduce((sum, cs) =>
        sum + (cs.total_amount - (cs.paid_amount || 0)), 0);
      const totalPharmacyPending = pharmacyCredits.reduce((sum, cs) =>
        sum + (cs.total_amount - (cs.paid_amount || 0)), 0);
      const totalPending = totalTreatmentPending + totalPharmacyPending;

      setPatientCreditSales(pendingCredits);
      setPatientPendingBalance(totalPending);
      setPendingTreatmentTotal(totalTreatmentPending);
      setPendingPharmacyTotal(totalPharmacyPending);

      if (totalPending > 0) {
        toast.info(`Patient has pending balance: ₹${totalPending.toLocaleString('en-IN')}`);
      }
    } catch (error) {
      console.error('Error fetching patient credit sales:', error);
      setPatientPendingBalance(0);
      setPatientCreditSales([]);
      setPendingTreatmentTotal(0);
      setPendingPharmacyTotal(0);
    }

    // Fetch pending treatment bills for this patient (temporary or unpaid)
    try {
      const billsResponse = await axios.get(`${API}/bills`);
      const pendingBills = billsResponse.data.filter(bill =>
        (bill.patient_id === patientId || bill.patient_id === patient.id ||
          bill.patient_name?.toLowerCase() === patient.name?.toLowerCase()) &&
        (bill.is_temporary === true || bill.payment_status === 'pending' || bill.payment_status === 'partial')
      );

      // Calculate total pending from treatment bills
      const treatmentBillsTotal = pendingBills.reduce((sum, bill) =>
        sum + (bill.balance_amount || (bill.total_amount - (bill.paid_amount || 0))), 0);

      setPendingTreatmentBills(pendingBills);
      setPendingTreatmentTotal(prev => prev + treatmentBillsTotal);

      if (pendingBills.length > 0) {
        toast.info(`Patient has ${pendingBills.length} pending treatment bill(s)`);
      }
    } catch (error) {
      console.error('Error fetching pending bills:', error);
      setPendingTreatmentBills([]);
    }

    // Fetch pending pharmacy sales for this patient
    try {
      const pharmacyResponse = await axios.get(`${API}/pharmacy-sales`);
      const pendingPharmacy = pharmacyResponse.data.filter(sale =>
        (sale.patient_id === patientId || sale.patient_id === patient.id ||
          sale.patient_name?.toLowerCase() === patient.name?.toLowerCase()) &&
        (sale.payment_status === 'pending' || sale.payment_status === 'partial')
      );

      // Calculate total pending from pharmacy sales
      const pharmacySalesTotal = pendingPharmacy.reduce((sum, sale) =>
        sum + (sale.balance_amount || (sale.total_amount - (sale.paid_amount || 0))), 0);

      setPendingPharmacySales(pendingPharmacy);
      setPendingPharmacyTotal(prev => prev + pharmacySalesTotal);

      if (pendingPharmacy.length > 0) {
        toast.info(`Patient has ${pendingPharmacy.length} pending pharmacy sale(s)`);
      }
    } catch (error) {
      console.error('Error fetching pending pharmacy sales:', error);
      setPendingPharmacySales([]);
    }
  };

  const handleAddNewPatient = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/patients`, {
        ...newPatientForm,
        branch_id: selectedBranch || user?.branch_id || branches[0]?.id || ''
      });
      setSelectedPatient(response.data);
      setShowAddPatient(false);
      setNewPatientForm({ patient_id: '', name: '', phone: '', gender: 'male', address: '' });
      fetchData();
      toast.success('Patient added');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add patient');
    }
  };

  // Treatment billing functions
  const addTreatmentItem = () => {
    if (!canEditTreatment) {
      toast.error('You do not have permission to add treatments');
      return;
    }
    setTreatmentItems([...treatmentItems, {
      treatment_id: '', treatment_name: '', base_amount: '', amount: '', discount: 0, gst_percentage: 0, teeth: [], units: 1
    }]);
  };

  const updateTreatmentItem = (index, field, value) => {
    if (!canEditTreatment) {
      toast.error('You do not have permission to edit treatments');
      return;
    }
    const updated = treatmentItems.map((item, i) => {
      if (i !== index) return item;
      if (field === 'treatment_id') {
        const treatment = treatments.find(t => t.id === value);
        const baseAmount = treatment?.charges || 0;
        const teethCount = (item.teeth || []).length;
        const multiplier = teethCount > 0 ? teethCount : (item.units || 1);
        return {
          ...item,
          treatment_id: value,
          treatment_name: treatment?.name || '',
          base_amount: baseAmount.toString(),
          amount: (baseAmount * multiplier).toString(),
          gst_percentage: treatment?.gst_percentage || 0
        };
      }
      if (field === 'teeth') {
        const teethCount = value.length;
        const baseAmount = parseFloat(item.base_amount) || 0;
        // If teeth are selected, multiply by teeth count; otherwise keep units-based amount
        const multiplier = teethCount > 0 ? teethCount : (item.units || 1);
        return { ...item, teeth: value, amount: (baseAmount * multiplier).toString() };
      }
      if (field === 'units') {
        const units = parseInt(value) || 1;
        const baseAmount = parseFloat(item.base_amount) || 0;
        const teethCount = (item.teeth || []).length;
        // Only apply units if no teeth selected
        const multiplier = teethCount > 0 ? teethCount : units;
        return { ...item, units: units, amount: (baseAmount * multiplier).toString() };
      }
      if (field === 'base_amount') {
        const baseAmount = parseFloat(value) || 0;
        const teethCount = (item.teeth || []).length;
        const multiplier = teethCount > 0 ? teethCount : (item.units || 1);
        return { ...item, base_amount: value, amount: (baseAmount * multiplier).toString() };
      }
      return { ...item, [field]: value };
    });
    setTreatmentItems(updated);
  };

  const toggleTooth = (itemIndex, toothNumber) => {
    if (!canEditTreatment) return;
    const item = treatmentItems[itemIndex];
    const teeth = item.teeth || [];
    const newTeeth = teeth.includes(toothNumber)
      ? teeth.filter(t => t !== toothNumber)
      : [...teeth, toothNumber];
    updateTreatmentItem(itemIndex, 'teeth', newTeeth);
  };

  const removeTreatmentItem = (index) => {
    if (!canEditTreatment) {
      toast.error('You do not have permission to remove treatments');
      return;
    }
    setTreatmentItems(treatmentItems.filter((_, i) => i !== index));
  };

  // Add Temporary Bill function (for Admin/Branch Manager)
  const handleAddTemporaryBill = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }
    if (treatmentItems.length === 0) {
      toast.error('Please add at least one treatment');
      return;
    }
    if (!canEditTreatment) {
      toast.error('You do not have permission to create bills');
      return;
    }

    try {
      const branchId = selectedBranch || user?.branch_id || branches[0]?.id || '';
      const branchName = branches.find(b => b.id === branchId)?.name || '';
      const doctorName = doctors.find(d => d.id === selectedDoctor)?.name || '';
      const patientId = selectedPatient.patient_id || selectedPatient.id || 'WALK-IN';

      const billData = {
        patient_id: patientId,
        patient_name: selectedPatient.name,
        services: treatmentItems.map(item => ({
          service_name: item.treatment_name,
          description: '',
          base_amount: parseFloat(item.base_amount) || parseFloat(item.amount) || 0,
          units: item.units || 1,
          amount: parseFloat(item.amount) || 0,
          gst_percentage: item.gst_percentage || 0,
          discount: parseFloat(item.discount) || 0,
          teeth: item.teeth || [],
          teeth_count: (item.teeth || []).length
        })),
        subtotal: treatmentSubtotal,
        gst_amount: treatmentGstAmount,
        discount: treatmentDiscount + treatmentItemDiscounts,
        total_amount: treatmentTotal,
        paid_amount: 0,
        balance_amount: treatmentTotal,
        payment_mode: 'pending',
        payment_status: 'pending',
        notes: treatmentNotes,
        is_temporary: true,
        branch_id: branchId,
        branch_name: branchName,
        doctor_id: selectedDoctor || null,
        doctor_name: doctorName
      };

      await axios.post(`${API}/bills`, billData);
      toast.success('Temporary bill created successfully!');
      window.dispatchEvent(new Event('billingUpdated'));

      // Clear treatment items but keep patient selected
      setTreatmentItems([]);
      setTreatmentDiscount(0);
      setTreatmentNotes('');

      // Refresh pending bills for this patient
      const billsResponse = await axios.get(`${API}/bills`);
      const pendingBills = billsResponse.data.filter(bill =>
        (bill.patient_id === patientId || bill.patient_id === selectedPatient.id ||
          bill.patient_name?.toLowerCase() === selectedPatient.name?.toLowerCase()) &&
        (bill.is_temporary === true || bill.payment_status === 'pending' || bill.payment_status === 'partial')
      );
      setPendingTreatmentBills(pendingBills);

    } catch (error) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', '));
      } else if (typeof detail === 'object' && detail !== null) {
        toast.error(detail.msg || detail.message || 'Failed to create bill');
      } else {
        toast.error(detail || 'Failed to create bill');
      }
    }
  };

  // Pharmacy billing functions
  const filteredMedicines = medicines.filter(m =>
    m.name?.toLowerCase().includes(medicineSearch.toLowerCase()) &&
    (m.quantity || 0) > 0 &&
    (!selectedBranch || m.branch_id === selectedBranch)
  );

  const addPharmacyItem = (medicine) => {
    if (!canEditPharmacy) {
      toast.error('You do not have permission to add pharmacy items');
      return;
    }
    // Use unique key combining id (which includes batch/mrp)
    const existing = pharmacyItems.find(item => item.medicine_id === medicine.id);
    if (existing) {
      setPharmacyItems(pharmacyItems.map(item =>
        item.medicine_id === medicine.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setPharmacyItems([...pharmacyItems, {
        medicine_id: medicine.id,
        medicine_name: medicine.name,
        batch_number: medicine.batch_number || '',
        unit_price: medicine.sales_price || medicine.mrp || 0,
        quantity: 1,
        available_stock: medicine.quantity || 0,
        gst_percentage: medicine.gst_percentage || 0
      }]);
    }
    setMedicineSearch('');
    setFocusedMedicineIndex(-1);
  };

  const updatePharmacyQuantity = (index, quantity) => {
    const item = pharmacyItems[index];
    if (quantity > item.available_stock) {
      toast.error(`Only ${item.available_stock} units available`);
      return;
    }
    setPharmacyItems(pharmacyItems.map((item, i) =>
      i === index ? { ...item, quantity: parseInt(quantity) || 0 } : item
    ));
  };

  const removePharmacyItem = (index) => {
    if (!canEditPharmacy) {
      toast.error('You do not have permission to remove pharmacy items');
      return;
    }
    setPharmacyItems(pharmacyItems.filter((_, i) => i !== index));
  };

  // Print functions
  const handlePrintTreatment = useReactToPrint({
    contentRef: treatmentPrintRef,
    pageStyle: `@page { size: 80mm auto; margin: 5mm; }`
  });

  const handlePrintPharmacy = useReactToPrint({
    contentRef: pharmacyPrintRef,
    pageStyle: `@page { size: 80mm auto; margin: 5mm; }`
  });

  // Share functions (no vendor lock-in - uses native links)
  const generateBillText = (type) => {
    const branchId = selectedBranch || user?.branch_id || branches[0]?.id || '';
    const branchName = branches.find(b => b.id.toString() === branchId.toString())?.name || 'Clinic';
    const doctorName = doctors.find(d => d.id.toString() === selectedDoctor.toString())?.name || '';
    const date = new Date().toLocaleDateString();

    if (type === 'treatment') {
      const items = treatmentItems.map(item => `• ${item.treatment_name}: ₹${item.amount}`).join('\n');
      return `*${branchName} - Treatment Bill*\n\nPatient: ${selectedPatient?.name}\nDate: ${date}\n${doctorName ? `Doctor: Dr. ${doctorName}\n` : ''}\n*Treatments:*\n${items}\n\n*Total: ₹${treatmentTotal}*\n\nThank you!`;
    } else {
      const items = pharmacyItems.map(item => `• ${item.medicine_name} x${item.quantity}: ₹${item.unit_price * item.quantity}`).join('\n');
      return `*${branchName} - Pharmacy Bill*\n\nPatient: ${selectedPatient?.name}\nDate: ${date}\n\n*Medicines:*\n${items}\n\n*Total: ₹${pharmacyTotal}*\n\nThank you!`;
    }
  };

  const handleShareWhatsApp = (type) => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }
    const text = generateBillText(type);
    const phone = selectedPatient.phone?.replace(/\D/g, '') || '';
    const url = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const handleShareEmail = (type) => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }
    const branchName = branches.find(b => b.id === selectedBranch)?.name || 'Clinic';
    const subject = `${branchName} - ${type === 'treatment' ? 'Treatment' : 'Pharmacy'} Bill`;
    const body = generateBillText(type).replace(/\*/g, '');
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    toast.success('Opening email client...');
  };

  // Complete transaction
  const handleSavePending = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    try {
      const branchId = selectedBranch || user?.branch_id || branches[0]?.id || '';
      const branchName = branches.find(b => b.id.toString() === branchId.toString())?.name || '';
      const doctorName = doctors.find(d => d.id.toString() === selectedDoctor.toString())?.name || '';
      const patientId = selectedPatient.patient_id || selectedPatient.id || 'WALK-IN';

      // Create treatment bill if there are treatment items
      if (treatmentItems.length > 0) {
        const totalDiscount = treatmentDiscount + treatmentItemDiscounts;
        const treatmentBillData = {
          patient_id: patientId,
          patient_name: selectedPatient.name,
          services: treatmentItems.map(item => ({
            service_name: item.treatment_name,
            description: '',
            base_amount: parseFloat(item.base_amount) || parseFloat(item.amount) || 0,
            units: item.units || 1,
            amount: parseFloat(item.amount) || 0,
            gst_percentage: item.gst_percentage || 0,
            discount: parseFloat(item.discount) || 0,
            teeth: item.teeth || [],
            teeth_count: (item.teeth || []).length
          })),
          subtotal: treatmentSubtotal,
          gst_amount: treatmentGstAmount,
          discount: totalDiscount,
          collection_discount: 0,
          total_amount: treatmentTotal,
          paid_amount: 0,
          balance_amount: treatmentTotal,
          payment_mode: 'cash',
          payment_status: 'pending',
          notes: treatmentNotes,
          is_temporary: false,
          branch_id: branchId,
          branch_name: branchName,
          doctor_id: selectedDoctor || null,
          doctor_name: doctorName
        };
        await axios.post(`${API}/bills`, treatmentBillData);
      }

      // Create pharmacy sale if there are pharmacy items
      if (pharmacyItems.length > 0) {
        const pharmacySaleData = {
          patient_id: patientId,
          patient_name: selectedPatient.name,
          items: pharmacyItems.map(item => ({
            medicine_id: item.medicine_id,
            medicine_name: item.medicine_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity
          })),
          subtotal: pharmacySubtotal,
          discount: pharmacyDiscount,
          collection_discount: 0,
          total_amount: pharmacyTotal,
          paid_amount: 0,
          balance_amount: pharmacyTotal,
          payment_mode: 'cash',
          payment_status: 'pending',
          branch_id: branchId,
          branch_name: branchName
        };
        await axios.post(`${API}/pharmacy-sales`, pharmacySaleData);
      }

      toast.success('Bill saved successfully!');
      window.dispatchEvent(new Event('billingUpdated'));
      resetBilling();
      fetchData();
    } catch (error) {
      toast.error('Failed to save bill');
    }
  };



  const resetBilling = () => {
    setSelectedPatient(null);
    setTreatmentItems([]);
    setTreatmentDiscount(0);
    setTreatmentNotes('');
    setPendingTreatmentBills([]);
    setSelectedPendingBill(null);
    setPharmacyItems([]);
    setPharmacyDiscount(0);
    setPatientPendingBalance(0);
    setPatientCreditSales([]);
    setPendingTreatmentTotal(0);
    setPendingPharmacyTotal(0);
    setPendingPharmacySales([]);
    setActiveTab(mode === 'pharmacy' ? 'pharmacy' : 'treatment');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-gray-500 text-sm">Create treatment and pharmacy bills</p>
        </div>
        <Badge variant={canEditTreatment ? "default" : "secondary"} className="text-xs">
          {isAdmin ? 'Admin' : isBranchManager ? 'Branch Manager' : isReceptionist ? 'Receptionist' : 'Accountant'}
        </Badge>
      </div>

      {/* Branch and Doctor Selection - TOP */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Branch *
              </Label>
              <Select value={selectedBranch.toString()} onValueChange={(val) => {
                setSelectedBranch(val);
                setSelectedDoctor(''); // Reset doctor when branch changes
                setPharmacyItems([]); // Clear pharmacy items when branch changes
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Stethoscope className="w-4 h-4" /> Doctor
              </Label>
              <Select value={selectedDoctor ? selectedDoctor.toString() : "none"} onValueChange={(val) => setSelectedDoctor(val === "none" ? "" : val)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Doctor</SelectItem>
                  {filteredDoctors.map(doctor => (
                    <SelectItem key={doctor.id} value={doctor.id.toString()}>{doctor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" /> Patient *
              </Label>
              {selectedPatient ? (
                <div className="flex items-center gap-2 mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{selectedPatient.name}</span>
                  <span className="text-gray-500 text-sm">({selectedPatient.patient_id || selectedPatient.phone})</span>
                  <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => {
                    setSelectedPatient(null);
                    setPatientPendingBalance(0);
                    setPatientCreditSales([]);
                    setPendingTreatmentBills([]);
                    setSelectedPendingBill(null);
                    setTreatmentItems([]);
                    setTreatmentDiscount(0);
                    setTreatmentNotes('');
                  }}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search patient..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setFocusedPatientIndex(-1); // Reset focus on search change
                    }}
                    onKeyDown={(e) => {
                      if (!patientSearch || filteredPatients.length === 0) return;

                      const maxIndex = Math.min(filteredPatients.length, 5) - 1;

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setFocusedPatientIndex(prev => prev < maxIndex ? prev + 1 : prev);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setFocusedPatientIndex(prev => prev > 0 ? prev - 1 : prev);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (focusedPatientIndex >= 0 && focusedPatientIndex <= maxIndex) {
                          handleSelectPatient(filteredPatients[focusedPatientIndex]);
                        } else if (filteredPatients.length > 0) {
                          // Select first one if none focused but enter pressed
                          handleSelectPatient(filteredPatients[0]);
                        }
                      }
                    }}
                    className="pl-9"
                  />
                  {patientSearch && filteredPatients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                      {filteredPatients.slice(0, 5).map((patient, index) => (
                        <div
                          key={patient.id}
                          className={`p-2 cursor-pointer flex items-center justify-between ${index === focusedPatientIndex ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                            }`}
                          onClick={() => handleSelectPatient(patient)}
                        >
                          <div>
                            <span className="font-medium">{patient.name}</span>
                            <span className="text-gray-500 text-sm ml-2">{patient.phone}</span>
                          </div>
                          <Button size="sm" variant="outline" className="h-6 text-xs">Select</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                    onClick={() => setShowAddPatient(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> New
                  </Button>
                </div>
              )}

              {/* Walk-in Queue Section */}
              {!selectedPatient && selectedBranch && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Walk-In Patients</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={fetchBranchWalkins}
                      disabled={walkinLoading}
                    >
                      <RotateCw className={`w-3 h-3 ${walkinLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {walkinLoading && branchWalkins.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">Loading walk-ins...</div>
                    ) : branchWalkins.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {branchWalkins.map((walkin) => {
                          // Find corresponding full patient object to ensure state consistency
                          const fullPatient = patients.find(p => p.id === walkin.patient_id);
                          return (
                            <div
                              key={walkin.id}
                              className="p-3 hover:bg-slate-50 cursor-pointer group flex items-center justify-between"
                              onClick={() => fullPatient && handleSelectPatient(fullPatient)}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold text-slate-900 truncate text-sm">{walkin.patient_name}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                  <span>{walkin.patient_phone}</span>
                                  {fullPatient?.patient_id && (
                                    <>
                                      <span className="text-slate-300">|</span>
                                      <span className="truncate">{fullPatient.patient_id}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                Select
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 italic">No active walk-ins found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area with Sidebar Tabs */}
      <div className="flex gap-4">
        {/* Left Sidebar - Tabs */}
        <div className="w-48 space-y-2">
          {(mode === 'all' || mode === 'treatment') && (
            <Button
              variant={activeTab === 'treatment' ? 'default' : 'outline'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('treatment')}
            >
              <Stethoscope className="w-4 h-4" />
              Treatment
            </Button>
          )}
          {(mode === 'all' || mode === 'pharmacy') && (
            <Button
              variant={activeTab === 'pharmacy' ? 'default' : 'outline'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('pharmacy')}
            >
              <Pill className="w-4 h-4" />
              Pharmacy
            </Button>
          )}

          {/* Totals Summary */}
          <Card className="mt-4">
            <CardContent className="p-3 space-y-2">
              <div className="text-xs text-gray-500">Summary</div>

              {/* Current Bill */}
              <div className="flex justify-between text-sm">
                <span>{(mode === 'pharmacy') ? 'Current Bill:' : 'Treatment (Current):'}</span>
                <span className="font-medium">{formatCurrency(treatmentTotal)}</span>
              </div>
              {mode !== 'treatment' && mode !== 'pharmacy' && (
                <div className="flex justify-between text-sm">
                  <span>Pharmacy (Current):</span>
                  <span className="font-medium">{formatCurrency(pharmacyTotal)}</span>
                </div>
              )}
              {mode === 'pharmacy' && (
                <div className="flex justify-between text-sm">
                  <span>Pharmacy (Current):</span>
                  <span className="font-medium">{formatCurrency(pharmacyTotal)}</span>
                </div>
              )}

              {/* Pending Amounts - Separated */}
              {(pendingTreatmentTotal > 0 || pendingPharmacyTotal > 0) && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <div className="text-xs text-orange-600 mb-1">Pending Balance</div>
                  </div>
                  {pendingTreatmentTotal > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Treatment Pending:</span>
                      <span className="font-medium">{formatCurrency(pendingTreatmentTotal)}</span>
                    </div>
                  )}
                  {pendingPharmacyTotal > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Pharmacy Pending:</span>
                      <span className="font-medium">{formatCurrency(pendingPharmacyTotal)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Grand Total:</span>
                <span className="text-emerald-600">{formatCurrency(
                  (mode === 'pharmacy' ? 0 : treatmentTotal) +
                  (mode === 'treatment' ? 0 : pharmacyTotal) +
                  (mode === 'pharmacy' ? 0 : pendingTreatmentTotal) +
                  (mode === 'treatment' ? 0 : pendingPharmacyTotal)
                )}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Balance Alert */}
          {(pendingTreatmentTotal > 0 || pendingPharmacyTotal > 0) && (
            <Card className="mt-2 border-orange-200 bg-orange-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-orange-700">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">Previous Balance Details</span>
                </div>
                {pendingTreatmentTotal > 0 && (
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-orange-600">Treatment ({pendingTreatmentBills.length} bill{pendingTreatmentBills.length !== 1 ? 's' : ''}):</span>
                    <span className="font-bold text-orange-600">{formatCurrency(pendingTreatmentTotal)}</span>
                  </div>
                )}
                {pendingPharmacyTotal > 0 && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-orange-600">Pharmacy ({pendingPharmacySales.length} sale{pendingPharmacySales.length !== 1 ? 's' : ''}):</span>
                    <span className="font-bold text-orange-600">{formatCurrency(pendingPharmacyTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between mt-2 pt-2 border-t border-orange-200">
                  <span className="text-sm font-medium text-orange-700">Total Pending:</span>
                  <span className="font-bold text-orange-700">{formatCurrency(pendingTreatmentTotal + pendingPharmacyTotal)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save / Pending Button */}
          <Button
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
            onClick={handleSavePending}
            disabled={(treatmentItems.length === 0 && pharmacyItems.length === 0) || !selectedPatient}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Save as Pending
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Treatment Tab */}
          {activeTab === 'treatment' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Treatment Billing
                    {!canEditTreatment && (
                      <Badge variant="secondary" className="ml-2">
                        <Eye className="w-3 h-3 mr-1" /> View Only
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-2">
                    {canEditTreatment && (
                      <Button size="sm" variant="outline" onClick={addTreatmentItem}>
                        <Plus className="w-4 h-4 mr-1" /> Add Treatment
                      </Button>
                    )}
                    {treatmentItems.length > 0 && (
                      <>
                        <Button size="sm" variant="outline" onClick={handlePrintTreatment}>
                          <Printer className="w-4 h-4 mr-1" /> Print
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleShareWhatsApp('treatment')} className="text-green-600 hover:text-green-700">
                          <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleShareEmail('treatment')}>
                          <Mail className="w-4 h-4 mr-1" /> Email
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Show Pending Treatment Bills from Admin */}
                {pendingTreatmentBills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Pending Bills ({pendingTreatmentBills.length})</span>
                    </div>
                    <div className="space-y-2">
                      {pendingTreatmentBills.map((bill) => (
                        <div
                          key={bill.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedPendingBill?.id === bill.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                            }`}
                          onClick={() => {
                            setSelectedPendingBill(bill);
                            // Load bill items into treatment items for collection
                            const items = (bill.services || []).map(s => ({
                              treatment_id: '',
                              treatment_name: s.service_name,
                              amount: s.amount?.toString() || '0',
                              discount: s.discount?.toString() || '0',
                              gst_percentage: s.gst_percentage || 0
                            }));
                            setTreatmentItems(items);
                            setTreatmentDiscount(bill.discount || 0);
                            toast.success('Bill loaded for collection');
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{bill.services?.map(s => s.service_name).join(', ') || 'Treatment'}</span>
                                {bill.is_temporary && (
                                  <Badge variant="outline" className="text-xs">Temporary</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Created: {new Date(bill.created_at).toLocaleDateString()}
                                {bill.doctor_name && ` • Dr. ${bill.doctor_name}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-emerald-600">
                                {formatCurrency(bill.total_amount)}
                              </div>
                              {(bill.paid_amount || 0) > 0 && (
                                <p className="text-xs text-gray-500">
                                  Paid: {formatCurrency(bill.paid_amount)} | Due: {formatCurrency(bill.total_amount - (bill.paid_amount || 0))}
                                </p>
                              )}
                              <div className="flex justify-end gap-2 mt-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Load bill for editing (same as clicking the card basically, but explicit)
                                    setSelectedPendingBill(bill);
                                    const items = (bill.services || []).map(s => ({
                                      treatment_id: '',
                                      treatment_name: s.service_name,
                                      base_amount: s.base_amount?.toString() || s.amount?.toString() || '0',
                                      amount: s.amount?.toString() || '0',
                                      discount: s.discount?.toString() || '0',
                                      gst_percentage: s.gst_percentage || 0,
                                      units: s.units || 1,
                                      teeth: s.teeth || []
                                    }));
                                    setTreatmentItems(items);
                                    setTreatmentDiscount(bill.discount || 0);
                                    setTreatmentNotes(bill.notes || '');
                                    toast.success('Bill loaded for editing');
                                  }}
                                >
                                  <Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Are you sure you want to delete this bill?')) {
                                      try {
                                        await axios.delete(`${API}/bills/${bill.id}`);
                                        toast.success('Bill deleted');
                                        fetchData(); // Refresh list
                                        // Also refresh pending bills logic if patient selected
                                        if (selectedPatient) {
                                          handleSelectPatient(selectedPatient);
                                        }
                                      } catch (err) {
                                        toast.error('Failed to delete bill');
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Click on a bill to load it for collection</p>
                  </div>
                )}

                {treatmentItems.length === 0 && pendingTreatmentBills.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Stethoscope className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No treatments added yet</p>
                    {canEditTreatment && (
                      <Button variant="outline" size="sm" className="mt-2" onClick={addTreatmentItem}>
                        <Plus className="w-4 h-4 mr-1" /> Add Treatment
                      </Button>
                    )}
                  </div>
                ) : treatmentItems.length > 0 ? (
                  <div className="space-y-3">
                    {treatmentItems.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-3">
                        <div className="flex gap-3 items-start">
                          <div className="flex-1">
                            <Label className="text-xs">Treatment</Label>
                            <Select
                              value={item.treatment_id}
                              onValueChange={(val) => updateTreatmentItem(index, 'treatment_id', val)}
                              disabled={!canEditTreatment}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select treatment" />
                              </SelectTrigger>
                              <SelectContent>
                                {treatments.map(t => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name} - {formatCurrency(t.charges)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Tooth Chart Button */}
                          <div className="w-24">
                            <Label className="text-xs">Teeth</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-1 w-full text-xs"
                              onClick={() => setShowToothChart(showToothChart === index ? null : index)}
                            >
                              🦷 {(item.teeth || []).length || 0} teeth
                            </Button>
                          </div>
                          {/* Units - Only show when no teeth selected */}
                          {(item.teeth || []).length === 0 && (
                            <div className="w-20">
                              <Label className="text-xs">Units</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.units || 1}
                                onChange={(e) => updateTreatmentItem(index, 'units', e.target.value)}
                                className="mt-1"
                                disabled={!canEditTreatment}
                              />
                            </div>
                          )}
                          <div className="w-24">
                            <Label className="text-xs">Rate (₹)</Label>
                            <Input
                              type="number"
                              value={item.base_amount || item.amount}
                              onChange={(e) => updateTreatmentItem(index, 'base_amount', e.target.value)}
                              className="mt-1"
                              disabled={!canEditTreatment}
                            />
                          </div>
                          <div className="w-28">
                            <Label className="text-xs">Amount (₹)</Label>
                            <Input
                              type="number"
                              value={item.amount}
                              className="mt-1 bg-gray-100"
                              disabled
                            />
                          </div>
                          <div className="w-24">
                            <Label className="text-xs">Discount (₹)</Label>
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateTreatmentItem(index, 'discount', e.target.value)}
                              className="mt-1"
                              disabled={!canGiveDiscount}
                            />
                          </div>
                          {canEditTreatment && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="mt-5 text-red-500 hover:text-red-700"
                              onClick={() => removeTreatmentItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* FDI Tooth Chart - Expandable */}
                        {showToothChart === index && (
                          <div className="border rounded-lg p-4 bg-white shadow-sm">
                            {/* Toggle between Permanent and Milk teeth */}
                            <div className="flex justify-center gap-2 mb-3">
                              <button
                                onClick={() => setToothChartType('permanent')}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${toothChartType === 'permanent'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                Permanent (Adult)
                              </button>
                              <button
                                onClick={() => setToothChartType('milk')}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${toothChartType === 'milk'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                Deciduous (Milk)
                              </button>
                            </div>

                            <div className="text-xs text-gray-500 mb-2 text-center">
                              FDI Dental Notation - Click to select teeth
                            </div>

                            {/* Permanent Teeth Chart */}
                            {toothChartType === 'permanent' && (
                              <>
                                {/* Upper Permanent Teeth */}
                                <div className="flex justify-center mb-1">
                                  <div className="flex gap-0.5">
                                    {permanentTeeth.upperRight.map(tooth => (
                                      <button
                                        key={tooth}
                                        onClick={() => toggleTooth(index, tooth)}
                                        className={`w-7 h-8 text-xs border rounded-t-lg transition-all ${(item.teeth || []).includes(tooth)
                                          ? 'bg-blue-500 text-white border-blue-600'
                                          : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                                          }`}
                                        disabled={!canEditTreatment}
                                      >
                                        {tooth}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="w-4"></div>
                                  <div className="flex gap-0.5">
                                    {permanentTeeth.upperLeft.map(tooth => (
                                      <button
                                        key={tooth}
                                        onClick={() => toggleTooth(index, tooth)}
                                        className={`w-7 h-8 text-xs border rounded-t-lg transition-all ${(item.teeth || []).includes(tooth)
                                          ? 'bg-blue-500 text-white border-blue-600'
                                          : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                                          }`}
                                        disabled={!canEditTreatment}
                                      >
                                        {tooth}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {/* Divider line representing mouth */}
                                <div className="flex justify-center items-center my-1">
                                  <div className="text-xs text-gray-400 px-2">R</div>
                                  <div className="flex-1 border-t border-gray-300 max-w-xs"></div>
                                  <div className="text-xs text-gray-400 px-2">L</div>
                                </div>
                                {/* Lower Permanent Teeth */}
                                <div className="flex justify-center mt-1">
                                  <div className="flex gap-0.5">
                                    {permanentTeeth.lowerRight.map(tooth => (
                                      <button
                                        key={tooth}
                                        onClick={() => toggleTooth(index, tooth)}
                                        className={`w-7 h-8 text-xs border rounded-b-lg transition-all ${(item.teeth || []).includes(tooth)
                                          ? 'bg-blue-500 text-white border-blue-600'
                                          : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                                          }`}
                                        disabled={!canEditTreatment}
                                      >
                                        {tooth}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="w-4"></div>
                                  <div className="flex gap-0.5">
                                    {permanentTeeth.lowerLeft.map(tooth => (
                                      <button
                                        key={tooth}
                                        onClick={() => toggleTooth(index, tooth)}
                                        className={`w-7 h-8 text-xs border rounded-b-lg transition-all ${(item.teeth || []).includes(tooth)
                                          ? 'bg-blue-500 text-white border-blue-600'
                                          : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                                          }`}
                                        disabled={!canEditTreatment}
                                      >
                                        {tooth}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Milk/Deciduous Teeth Chart */}
                            {toothChartType === 'milk' && (
                              <>
                                {/* Upper Milk Teeth */}
                                <div className="flex justify-center mb-1">
                                  <div className="flex gap-0.5">
                                    {milkTeeth.upperRight.map(tooth => (
                                      <button
                                        key={tooth}
                                        onClick={() => toggleTooth(index, tooth)}
                                        className={`w-8 h-9 text-xs border rounded-t-lg transition-all ${(item.teeth || []).includes(tooth)
                                          ? 'bg-green-500 text-white border-green-600'
                                          : 'bg-green-50 hover:bg-green-100 border-green-300'
                                          }`}
                                        disabled={!canEditTreatment}
                                      >
                                        {tooth}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="w-6"></div>
                                  <div className="flex gap-0.5">
                                    {milkTeeth.upperLeft.map(tooth => (
                                      <button
                                        key={tooth}
                                        onClick={() => toggleTooth(index, tooth)}
                                        className={`w-8 h-9 text-xs border rounded-t-lg transition-all ${(item.teeth || []).includes(tooth)
                                          ? 'bg-green-500 text-white border-green-600'
                                          : 'bg-green-50 hover:bg-green-100 border-green-300'
                                          }`}
                                        disabled={!canEditTreatment}
                                      >
                                        {tooth}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {/* Divider line representing mouth */}
                                <div className="flex justify-center items-center my-1">
                                  <div className="text-xs text-green-500 px-2">R</div>
                                  <div className="flex-1 border-t border-green-300 max-w-[200px]"></div>
                                  <div className="text-xs text-green-500 px-2">L</div>
                                </div>
                                {/* Lower Milk Teeth */}
                                <div className="flex justify-center mt-1">
                                  <div className="flex gap-0.5">
                                    {milkTeeth.lowerRight.map(tooth => (
                                      <button
                                        key={tooth}
                                        onClick={() => toggleTooth(index, tooth)}
                                        className={`w-8 h-9 text-xs border rounded-b-lg transition-all ${(item.teeth || []).includes(tooth)
                                          ? 'bg-green-500 text-white border-green-600'
                                          : 'bg-green-50 hover:bg-green-100 border-green-300'
                                          }`}
                                        disabled={!canEditTreatment}
                                      >
                                        {tooth}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="w-6"></div>
                                  <div className="flex gap-0.5">
                                    {milkTeeth.lowerLeft.map(tooth => (
                                      <button
                                        key={tooth}
                                        onClick={() => toggleTooth(index, tooth)}
                                        className={`w-8 h-9 text-xs border rounded-b-lg transition-all ${(item.teeth || []).includes(tooth)
                                          ? 'bg-green-500 text-white border-green-600'
                                          : 'bg-green-50 hover:bg-green-100 border-green-300'
                                          }`}
                                        disabled={!canEditTreatment}
                                      >
                                        {tooth}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Selected teeth summary */}
                            {(item.teeth || []).length > 0 && (
                              <div className="mt-3 pt-2 border-t text-xs text-center">
                                <span className="text-gray-500">Selected: </span>
                                <span className="font-medium text-blue-600">
                                  {(item.teeth || []).sort((a, b) => a - b).join(', ')}
                                </span>
                                <span className="text-gray-500 ml-2">({(item.teeth || []).length} teeth)</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Overall Discount */}
                    {canGiveDiscount && (
                      <div className="flex items-center gap-4 pt-3 border-t">
                        <Label>Overall Discount (₹)</Label>
                        <Input
                          type="number"
                          value={treatmentDiscount}
                          onChange={(e) => setTreatmentDiscount(parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                      </div>
                    )}

                    {/* Treatment Total */}
                    <div className="pt-3 border-t space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(treatmentSubtotal)}</span>
                      </div>
                      {treatmentGstAmount > 0 && (
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>GST:</span>
                          <span>+{formatCurrency(treatmentGstAmount)}</span>
                        </div>
                      )}
                      {(treatmentItemDiscounts + treatmentDiscount) > 0 && (
                        <div className="flex justify-between text-sm text-red-500">
                          <span>Discount:</span>
                          <span>-{formatCurrency(treatmentItemDiscounts + treatmentDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Treatment Total:</span>
                        <span className="text-emerald-600">{formatCurrency(treatmentTotal)}</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Add Bill Button - Only for Admin/Branch Manager */}
                {canEditTreatment && treatmentItems.length > 0 && selectedPatient && (
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleAddTemporaryBill}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Bill
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pharmacy Tab */}
          {activeTab === 'pharmacy' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Pharmacy Billing
                  </CardTitle>
                  {pharmacyItems.length > 0 && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handlePrintPharmacy}>
                        <Printer className="w-4 h-4 mr-1" /> Print
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleShareWhatsApp('pharmacy')} className="text-green-600 hover:text-green-700">
                        <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleShareEmail('pharmacy')}>
                        <Mail className="w-4 h-4 mr-1" /> Email
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Medicine Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search medicines..."
                    value={medicineSearch}
                    onChange={(e) => {
                      setMedicineSearch(e.target.value);
                      setFocusedMedicineIndex(-1); // Reset focus on search change
                    }}
                    onKeyDown={(e) => {
                      if (!medicineSearch || filteredMedicines.length === 0) return;

                      const maxIndex = Math.min(filteredMedicines.length, 10) - 1;

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setFocusedMedicineIndex(prev => prev < maxIndex ? prev + 1 : prev);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setFocusedMedicineIndex(prev => prev > 0 ? prev - 1 : prev);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (focusedMedicineIndex >= 0 && focusedMedicineIndex <= maxIndex) {
                          addPharmacyItem(filteredMedicines[focusedMedicineIndex]);
                        } else if (filteredMedicines.length > 0) {
                          // Select first one if none focused but enter pressed
                          addPharmacyItem(filteredMedicines[0]);
                        }
                      }
                    }}
                    className="pl-9"
                  />
                  {medicineSearch && filteredMedicines.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredMedicines.slice(0, 10).map((medicine, index) => (
                        <div
                          key={medicine.id}
                          className={`p-2 cursor-pointer border-b last:border-b-0 ${index === focusedMedicineIndex ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                            }`}
                          onClick={() => addPharmacyItem(medicine)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{medicine.name}</span>
                            <span className="font-semibold text-emerald-600">{formatCurrency(medicine.sales_price || medicine.mrp)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                            <span>Batch: <span className="font-medium text-gray-700">{medicine.batch_number || 'N/A'}</span></span>
                            <span>Exp: {medicine.expiry_date || 'N/A'}</span>
                            <span className="text-emerald-600">Stock: {medicine.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {medicineSearch && filteredMedicines.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                      No medicines found matching "{medicineSearch}"
                    </div>
                  )}
                </div>

                {pharmacyItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Pill className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No medicines added yet</p>
                    <p className="text-sm">Search and add medicines above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Medicine Items */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-2 px-3">Medicine</th>
                            <th className="text-center py-2 px-3 w-24">Qty</th>
                            <th className="text-right py-2 px-3 w-24">Price</th>
                            <th className="text-right py-2 px-3 w-24">Total</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {pharmacyItems.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="py-2 px-3">
                                <div>{item.medicine_name}</div>
                                {item.batch_number && (
                                  <div className="text-xs text-gray-500">Batch: {item.batch_number}</div>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <Input
                                  type="number"
                                  min="1"
                                  max={item.available_stock}
                                  value={item.quantity}
                                  onChange={(e) => updatePharmacyQuantity(index, e.target.value)}
                                  className="w-16 h-8 text-center mx-auto"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">{formatCurrency(item.unit_price)}</td>
                              <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.unit_price * item.quantity)}</td>
                              <td className="py-2 px-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500"
                                  onClick={() => removePharmacyItem(index)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Discount */}
                    {canGiveDiscount && (
                      <div className="flex items-center gap-4">
                        <Label>Discount (₹)</Label>
                        <Input
                          type="number"
                          value={pharmacyDiscount}
                          onChange={(e) => setPharmacyDiscount(parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                      </div>
                    )}

                    {/* Pharmacy Total */}
                    <div className="pt-3 border-t space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(pharmacySubtotal)}</span>
                      </div>
                      {pharmacyDiscount > 0 && (
                        <div className="flex justify-between text-sm text-red-500">
                          <span>Discount:</span>
                          <span>-{formatCurrency(pharmacyDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Pharmacy Total:</span>
                        <span className="text-emerald-600">{formatCurrency(pharmacyTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>



      {/* Add Patient Dialog */}
      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddNewPatient} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient ID</Label>
                <Input
                  value={newPatientForm.patient_id}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, patient_id: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={newPatientForm.phone}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={newPatientForm.gender}
                  onValueChange={(val) => setNewPatientForm({ ...newPatientForm, gender: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={newPatientForm.address}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, address: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">Add Patient</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Components */}
      <div className="hidden">
        {/* Treatment Print */}
        <div ref={treatmentPrintRef} className="p-4 text-sm" style={{ width: '80mm' }}>
          <div className="text-center mb-4 space-y-1">
            {(settings.print_logo !== false) && settings.logo_url && (
              <img src={getLogoUrl()} alt="Logo" className="h-16 mx-auto mb-2 object-contain" />
            )}
            <h1 className="font-bold text-xl text-emerald-600">{settings.clinic_name || 'Clinic Name'}</h1>
            <p className="text-sm font-medium">{branches.find(b => b.id === selectedBranch)?.name}</p>
            <h2 className="font-bold text-base mt-2">Treatment Bill</h2>
          </div>
          <div className="border-t border-b py-2 mb-2">
            <p><strong>Patient:</strong> {selectedPatient?.name}</p>
            <p><strong>Doctor:</strong> {doctors.find(d => d.id === selectedDoctor)?.name || '-'}</p>
            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
          </div>
          <table className="w-full text-xs mb-2">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Treatment</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {treatmentItems.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1">{item.treatment_name}</td>
                  <td className="text-right py-1">₹{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right space-y-1">
            <p>Subtotal: ₹{treatmentSubtotal}</p>
            {(treatmentItemDiscounts + treatmentDiscount) > 0 && (
              <p>Discount: -₹{treatmentItemDiscounts + treatmentDiscount}</p>
            )}
            <p className="font-bold text-base">Total: ₹{treatmentTotal}</p>
          </div>
          {/* Signature Section */}
          <div className="mt-8 pt-4 border-t">
            <div className="flex justify-between">
              <div className="text-center">
                <div className="border-t border-black w-24 mt-8"></div>
              </div>
              <div className="text-center">
                <div className="border-t border-black w-24 mt-8"></div>
              </div>
            </div>
          </div>
          <div className="text-center mt-4 text-xs">
            <p>--- Thank You ---</p>
          </div>
        </div>

        {/* Pharmacy Print */}
        <div ref={pharmacyPrintRef} className="p-4 text-sm" style={{ width: '80mm' }}>
          <div className="text-center mb-4 space-y-1">
            {(settings.print_logo !== false) && settings.logo_url && (
              <img src={getLogoUrl()} alt="Logo" className="h-16 mx-auto mb-2 object-contain" />
            )}
            <h1 className="font-bold text-xl text-emerald-600">{settings.clinic_name || 'Clinic Name'}</h1>
            <p className="text-sm font-medium">{branches.find(b => b.id === selectedBranch)?.name}</p>
            <h2 className="font-bold text-base mt-2">Pharmacy Bill</h2>
          </div>
          <div className="border-t border-b py-2 mb-2">
            <p><strong>Patient:</strong> {selectedPatient?.name}</p>
            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
          </div>
          <table className="w-full text-xs mb-2">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Medicine</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {pharmacyItems.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1">{item.medicine_name}</td>
                  <td className="text-center py-1">{item.quantity}</td>
                  <td className="text-right py-1">₹{item.unit_price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right space-y-1">
            <p>Subtotal: ₹{pharmacySubtotal}</p>
            {pharmacyDiscount > 0 && <p>Discount: -₹{pharmacyDiscount}</p>}
            <p className="font-bold text-base">Total: ₹{pharmacyTotal}</p>
          </div>
          {/* Signature Section */}
          <div className="mt-8 pt-4 border-t">
            <div className="flex justify-between">
              <div className="text-center">
                <div className="border-t border-black w-24 mt-8"></div>
              </div>
              <div className="text-center">
                <div className="border-t border-black w-24 mt-8"></div>
              </div>
            </div>
          </div>
          <div className="text-center mt-4 text-xs">
            <p>--- Thank You ---</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
