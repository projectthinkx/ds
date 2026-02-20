import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';
import {
    Pill,
    History,
    Receipt,
    Wallet as WalletIcon,
    Stethoscope as StethoscopeIcon,
    UserPlus,
    Search,
    User,
    Calendar,
    Clock,
    CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const Reception = ({ user }) => {
    const [allPatients, setAllPatients] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [walkins, setWalkins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Add Patient State
    const [addPatientOpen, setAddPatientOpen] = useState(false);
    const [formData, setFormData] = useState({
        patient_id: '', prefix: '', name: '', phone: '', alternate_phone: '',
        email: '', dob: '', age: '', gender: 'male', address: '', branch_id: '',
        is_dob_estimated: false
    });

    // Checkout State
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [selectedWalkin, setSelectedWalkin] = useState(null);
    const [paymentMode, setPaymentMode] = useState('cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [bankAccounts, setBankAccounts] = useState([]);
    const [bankId, setBankId] = useState('');
    const [upiId, setUpiId] = useState('');
    const [transactionRef, setTransactionRef] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Financial Snapshot for selected walkin
    const [financialSnapshot, setFinancialSnapshot] = useState(null);
    const [pendingBills, setPendingBills] = useState([]);
    const [pendingPharmacySales, setPendingPharmacySales] = useState([]);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedBranches.length > 0) {
            fetchWalkins();
        } else {
            setWalkins([]);
        }
    }, [selectedBranches]);

    // Handle auto-refresh from other tabs/components
    useEffect(() => {
        const handleRefresh = () => {
            if (selectedBranches.length > 0) {
                fetchWalkins();
            }
        };
        window.addEventListener('billingUpdated', handleRefresh);
        return () => window.removeEventListener('billingUpdated', handleRefresh);
    }, [selectedBranches]);

    const fetchInitialData = async () => {
        try {
            const [branchesRes, patientsRes, bankAccountsRes] = await Promise.all([
                axios.get(`${API}/branches`),
                axios.get(`${API}/patients`),
                axios.get(`${API}/bank-accounts`)
            ]);

            const allBranches = branchesRes.data;
            setBranches(allBranches);
            setAllPatients(patientsRes.data);
            setBankAccounts(bankAccountsRes.data);

            let initial;
            if (isAdmin) {
                initial = allBranches.map(b => b.id);
            } else {
                initial = allBranches.filter(b => b.id === user?.branch_id).map(b => b.id);
            }
            setSelectedBranches(initial);
        } catch (error) {
            toast.error('Failed to fetch initial data');
        }
    };

    const fetchWalkins = async () => {
        setLoading(true);
        try {
            const idsParam = selectedBranches.join(',');
            const res = await axios.get(`${API}/walkins?branch_ids=${idsParam}`);
            setWalkins(res.data);
        } catch (error) {
            toast.error('Failed to fetch walk-ins');
        } finally {
            setLoading(false);
        }
    };

    const filteredSearchResults = allPatients.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery)
    ).slice(0, 10); // Show top 10 matches for UI clarity

    const handleCheckIn = async (patient) => {
        // Find best branch
        let branchId = user?.branch_id;
        if (!branchId && selectedBranches.length > 0) {
            branchId = selectedBranches[0];
        } else if (!branchId && branches.length > 0) {
            branchId = branches[0].id;
        }

        if (!branchId) {
            toast.error('No branch selected for check-in');
            return;
        }

        try {
            const res = await axios.post(`${API}/walkins/checkin`, {
                patient_id: patient.id,
                branch_id: branchId
            });
            toast.success(`${patient.name} checked in successfully`);
            setSearchQuery('');
            setSelectedIndex(-1);

            // Optimistically add to list if branch is selected
            if (selectedBranches.includes(branchId)) {
                setWalkins(prev => [res.data, ...prev]);
            } else {
                // If checking into a branch not currently viewed, select it
                setSelectedBranches(prev => [...prev, branchId]);
            }

            // Also fetch to be sure (in case of other updates or ordering)
            // setTimeout ensures we don't race with the backend if it's slightly slow
            setTimeout(fetchWalkins, 100);

        } catch (error) {
            toast.error(error.response?.data?.detail || 'Check-in failed');
        }
    };

    const handleToggleBranch = (id) => {
        if (selectedBranches.includes(id)) {
            setSelectedBranches(selectedBranches.filter(b => b !== id));
        } else {
            setSelectedBranches([...selectedBranches, id]);
        }
    };

    const handleSelectAll = () => {
        setSelectedBranches(branches.map(b => b.id));
    };

    const handleClearAll = () => {
        setSelectedBranches([]);
    };

    // Patient Helpers (Mirrored from Patients.js)
    const calculateAge = (dob) => {
        if (!dob) return null;
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const getDisplayAge = (patient) => patient.dob ? calculateAge(patient.dob) : patient.age || '-';

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

    const handleAddPatientSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                age: formData.age ? parseInt(formData.age) : (formData.dob ? calculateAge(formData.dob) : null),
                branch_id: formData.branch_id || user?.branch_id || (branches.length > 0 ? branches[0].id : '')
            };
            const response = await axios.post(`${API}/patients`, payload);
            toast.success('Patient added successfully');
            setAddPatientOpen(false);

            // Refresh local patient list for search
            const patientsRes = await axios.get(`${API}/patients`);
            setAllPatients(patientsRes.data);

            // Auto check-in
            handleCheckIn(response.data);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to add patient');
        }
    };

    const resetAddForm = () => {
        setFormData({
            patient_id: '', prefix: '', name: '', phone: '', alternate_phone: '',
            email: '', dob: '', age: '', gender: 'male', address: '',
            branch_id: user?.branch_id || (branches.length > 0 ? branches[0].id : ''),
            is_dob_estimated: false
        });
    };

    const openCheckout = async (walkin) => {
        setSelectedWalkin(walkin);
        setPaidAmount(walkin.current_balance || '');
        setPaymentMode('cash');
        setBankId('');
        setUpiId('');
        setTransactionRef('');

        try {
            // Fetch detailed financial snapshot if needed, or use what's in walkin
            // The backend already enriches walkins with get_patient_financial_snapshot
            // However, we might need the actual IDs of pending bills/sales to mark them as paid

            const [billsRes, salesRes] = await Promise.all([
                axios.get(`${API}/bills`),
                axios.get(`${API}/pharmacy-sales`)
            ]);

            const patientId = walkin.patient_id;
            const patientBills = billsRes.data.filter(b =>
                b.patient_id === patientId &&
                b.payment_status !== 'paid' &&
                b.balance_amount > 0
            );
            const patientSales = salesRes.data.filter(s =>
                s.patient_id === patientId &&
                s.payment_status !== 'paid' &&
                s.balance_amount > 0
            );

            setPendingBills(patientBills);
            setPendingPharmacySales(patientSales);
            setCheckoutOpen(true);
        } catch (error) {
            console.error('Error fetching pending transactions:', error);
            toast.error('Failed to prepare checkout');
        }
    };

    const allUpiIds = bankAccounts.flatMap(bank =>
        (bank.upi_ids || []).map(upi => ({
            upi,
            bank_id: bank.id,
            bank_name: bank.bank_name
        }))
    );

    const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

    const handleCheckout = async () => {
        if (!selectedWalkin) return;
        const totalToCollect = parseFloat(paidAmount) || 0;

        if (totalToCollect < 0) {
            toast.error('Amount collected cannot be negative');
            return;
        }

        setIsSubmitting(true);
        try {
            let remainingToPay = totalToCollect;

            // 1. Record payments against pending treatment bills
            for (const bill of pendingBills) {
                if (remainingToPay <= 0) break;

                const remainingBalance = bill.balance_amount || (bill.total_amount - (bill.paid_amount || 0));
                if (remainingBalance > 0) {
                    const paymentAmount = Math.min(remainingToPay, remainingBalance);
                    const newPaidAmount = (bill.paid_amount || 0) + paymentAmount;
                    const newBalance = bill.total_amount - newPaidAmount;

                    await axios.put(`${API}/bills/${bill.id}`, {
                        ...bill,
                        paid_amount: newPaidAmount,
                        balance_amount: newBalance,
                        payment_status: newBalance <= 0 ? 'paid' : 'partial',
                        is_temporary: false // Convert temporary bill to official if it was temporary
                    });
                    remainingToPay -= paymentAmount;
                }
            }

            // 2. Record payments against pending pharmacy sales
            for (const sale of pendingPharmacySales) {
                if (remainingToPay <= 0) break;

                const remainingBalance = sale.balance_amount || (sale.total_amount - (sale.paid_amount || 0));
                if (remainingBalance > 0) {
                    const paymentAmount = Math.min(remainingToPay, remainingBalance);
                    const newPaidAmount = (sale.paid_amount || 0) + paymentAmount;
                    const newBalance = sale.total_amount - newPaidAmount;

                    await axios.put(`${API}/pharmacy-sales/${sale.id}`, {
                        ...sale,
                        paid_amount: newPaidAmount,
                        balance_amount: newBalance,
                        payment_status: newBalance <= 0 ? 'paid' : 'partial'
                    });
                    remainingToPay -= paymentAmount;
                }
            }

            // 3. Record bank transaction for non-cash payment
            if (paymentMode !== 'cash' && bankId && totalToCollect > 0) {
                const selectedBank = bankAccounts.find(b => b.id === bankId);

                await axios.post(`${API}/bank-transactions`, {
                    bank_account_id: bankId,
                    bank_name: selectedBank ? selectedBank.bank_name : 'Unknown',
                    transaction_type: 'credit',
                    amount: totalToCollect,
                    payment_mode: paymentMode,
                    upi_id: upiId,
                    reference_type: 'checkout_payment',
                    reference_id: `CO-${selectedWalkin.id}-${Date.now()}`,
                    reference_number: transactionRef,
                    transaction_date: new Date().toISOString().split('T')[0],
                    description: `Checkout payment - ${selectedWalkin.patient_name}`,
                    party_name: selectedWalkin.patient_name,
                    party_id: selectedWalkin.patient_id,
                    branch_id: selectedWalkin.branch_id
                });
            }

            // 4. Complete the walk-in checkout
            await axios.post(`${API}/walkins/${selectedWalkin.id}/checkout`, {
                payment_mode: paymentMode,
                paid_amount: totalToCollect,
                transaction_reference: transactionRef
            });

            toast.success('Checkout completed successfully');
            setCheckoutOpen(false);
            fetchWalkins();
        } catch (error) {
            console.error('Checkout error:', error);
            const detail = error.response?.data?.detail;
            toast.error(typeof detail === 'string' ? detail : 'Checkout failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUndoCheckIn = async (e, walkinId) => {
        e.stopPropagation(); // Prevent row click
        if (!window.confirm("Are you sure you want to undo this check-in?")) return;

        try {
            await axios.delete(`${API}/walkins/${walkinId}`);
            toast.success("Check-in undone successfully");

            // Optimistically remove from list
            setWalkins(prev => prev.filter(w => w.id !== walkinId));
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to undo check-in");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'with_doctor': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'ready_for_billing': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const visibleBranches = isAdmin ? branches : branches.filter(b => b.id === user?.branch_id);

    // Group walkins by branch for display
    const groupedWalkins = React.useMemo(() => {
        const grouped = {};
        visibleBranches.forEach(b => {
            if (selectedBranches.includes(b.id)) {
                grouped[b.name] = walkins.filter(w => w.branch_id === b.id);
            }
        });
        return grouped;
    }, [walkins, visibleBranches, selectedBranches]);


    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev =>
                prev < filteredSearchResults.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            if (filteredSearchResults[selectedIndex]) {
                handleCheckIn(filteredSearchResults[selectedIndex]);
            }
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Left Side - Search & Registration */}
            <div className="w-1/3 border-r bg-white p-4 flex flex-col gap-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="h-6 w-6 text-emerald-600" />
                    <h2 className="text-xl font-bold text-slate-900">New Registration</h2>
                </div>

                {/* Search Box */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Name or Phone..."
                        className="pl-10 h-11"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSelectedIndex(-1); }}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto min-h-[200px]">
                    {searchQuery.length > 0 && searchQuery.length < 2 && (
                        <p className="text-sm text-slate-500 text-center mt-4">Type at least 2 characters to search...</p>
                    )}

                    {searchQuery.length >= 2 && filteredSearchResults.map((patient, index) => (
                        <div
                            key={patient.id}
                            className={`p-3 border rounded-lg transition-all group flex items-center justify-between cursor-pointer ${index === selectedIndex
                                ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                                : 'hover:border-emerald-500 hover:bg-emerald-50/30'
                                }`}
                            onClick={() => handleCheckIn(patient)}
                        >
                            <div>
                                <div className="font-medium text-slate-900">{patient.name}</div>
                                <div className="text-sm text-slate-500">{patient.phone}</div>
                                <div className="text-xs text-slate-400 mt-1 flex gap-2">
                                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {patient.gender || '-'}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {patient.age || '-'} y/o</span>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className={`opacity-0 group-hover:opacity-100 transition-opacity ${index === selectedIndex ? 'opacity-100' : ''}`}
                                variant="outline"
                            >
                                Check In
                            </Button>
                        </div>
                    ))}

                    {searchQuery.length >= 2 && filteredSearchResults.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-slate-500 mb-4">No patient found named "{searchQuery}"</p>
                            <div className="border-t pt-4">
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => { resetAddForm(); setAddPatientOpen(true); }}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Register New Patient
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Walk-in Queue */}
            <div className="w-2/3 bg-slate-50 p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Walk-in Queue</h2>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border">
                        {visibleBranches.map(branch => (
                            <button
                                key={branch.id}
                                onClick={() => handleToggleBranch(branch.id)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedBranches.includes(branch.id)
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {branch.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4">
                    {Object.entries(groupedWalkins).map(([branchName, patients]) => (
                        <div key={branchName} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
                                <h3 className="font-semibold text-slate-700">{branchName}</h3>
                                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">
                                    {patients.length} Waiting
                                </span>
                            </div>
                            {patients.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-slate-50/50">
                                            <th className="text-left py-2.5 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Patient</th>

                                            <th className="text-right py-2.5 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Previous Balance</th>
                                            <th className="text-right py-2.5 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Treatment Fee</th>
                                            <th className="text-right py-2.5 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Pharmacy Amt</th>
                                            <th className="text-center py-2.5 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Check Out</th>
                                            <th className="text-right py-2.5 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Balance</th>
                                            <th className="py-2.5 px-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {patients.map((walkin) => (
                                            <tr key={walkin.id} className="hover:bg-slate-50/70 transition-colors group">
                                                {/* Patient */}
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0">
                                                            {walkin.patient_name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-slate-900 truncate">{walkin.patient_name}</div>
                                                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                                                <Clock className="h-3 w-3 shrink-0" />
                                                                {new Date(walkin.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                <span className="text-slate-300">|</span>
                                                                <span className="truncate">{walkin.patient_phone}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Previous Balance */}
                                                <td className="py-3 px-3 text-right font-medium tabular-nums">
                                                    {walkin.previous_balance > 0 ? (
                                                        <span className="text-orange-600">₹{walkin.previous_balance.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-slate-300">₹0</span>
                                                    )}
                                                </td>
                                                {/* Treatment Fee (Today) */}
                                                <td className="py-3 px-3 text-right font-medium tabular-nums">
                                                    {walkin.treatment_fees_pending > 0 ? (
                                                        <span className="text-slate-800">₹{walkin.treatment_fees_pending.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-slate-300">₹0</span>
                                                    )}
                                                </td>
                                                {/* Pharmacy Amount */}
                                                <td className="py-3 px-3 text-right font-medium tabular-nums">
                                                    {walkin.pharmacy_fees_pending > 0 ? (
                                                        <span className="text-slate-800">₹{walkin.pharmacy_fees_pending.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-slate-300">₹0</span>
                                                    )}
                                                </td>
                                                {/* Check Out */}
                                                <td className="py-3 px-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={walkin.status === 'completed'}
                                                        onChange={() => openCheckout(walkin)}
                                                        className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                                                        title="Check out patient"
                                                    />
                                                </td>
                                                {/* Balance */}
                                                <td className="py-3 px-3 text-right font-bold tabular-nums">
                                                    {walkin.current_balance > 0 ? (
                                                        <span className="text-red-600">₹{walkin.current_balance.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-emerald-600">₹0</span>
                                                    )}
                                                </td>
                                                {/* Undo */}
                                                <td className="py-3 px-1">
                                                    {walkin.status === 'waiting' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs px-2"
                                                            onClick={(e) => handleUndoCheckIn(e, walkin.id)}
                                                            title="Undo Check-in"
                                                        >
                                                            Undo
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-slate-400 italic text-sm">
                                    No patients waiting in this branch
                                </div>
                            )}
                        </div>
                    ))}

                    {walkins.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <UserPlus className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                            <p>No active walk-ins at the moment</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Patient Modal */}
            <Dialog open={addPatientOpen} onOpenChange={setAddPatientOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Patient</DialogTitle>
                        <DialogDescription>Register a new patient and check them in automatically.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddPatientSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Patient ID *</label>
                                <Input value={formData.patient_id} onChange={(e) => setFormData({ ...formData, patient_id: e.target.value.toUpperCase() })} placeholder="PAT001" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
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
                                    <SelectTrigger className="bg-white"><SelectValue placeholder="Title" /></SelectTrigger>
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
                            <label className="text-sm font-medium">Full Name *</label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone / WhatsApp *</label>
                                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Gender *</label>
                                <select
                                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date of Birth</label>
                                <Input type="date" value={formData.dob} onChange={(e) => handleDobChange(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Age</label>
                                <Input type="number" value={formData.age} onChange={(e) => handleAgeChange(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Address</label>
                            <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setAddPatientOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Add & Check-In</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Checkout Modal */}
            <Dialog open={checkoutOpen} onOpenChange={(open) => {
                if (!isSubmitting) setCheckoutOpen(open);
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            Patient Checkout
                        </DialogTitle>
                        <DialogDescription>
                            Collect payment and complete visit for {selectedWalkin?.patient_name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Financial Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="text-sm font-medium text-slate-500 mb-1">Previous Balance</div>
                                <div className="text-2xl font-bold text-orange-600">{formatCurrency(selectedWalkin?.previous_balance)}</div>
                                <div className="text-xs text-slate-400 mt-1">Pending from earlier visits</div>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <div className="text-sm font-medium text-emerald-600 mb-1">Today's Total</div>
                                <div className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedWalkin?.treatment_fees_pending + selectedWalkin?.pharmacy_fees_pending)}</div>
                                <div className="text-xs text-emerald-600/60 mt-1">
                                    Tx: {formatCurrency(selectedWalkin?.treatment_fees_pending)} | Rx: {formatCurrency(selectedWalkin?.pharmacy_fees_pending)}
                                </div>
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl shadow-lg shadow-slate-200">
                                <span className="text-lg font-medium">Grand Total to Collect</span>
                                <span className="text-3xl font-bold">{formatCurrency(selectedWalkin?.current_balance)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-700">Payment Mode</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['cash', 'card', 'upi', 'netbanking'].map(mode => (
                                                <Button
                                                    key={mode}
                                                    type="button"
                                                    variant={paymentMode === mode ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={`capitalize h-10 ${paymentMode === mode ? 'bg-emerald-600 hover:bg-emerald-700' : 'hover:border-emerald-200'}`}
                                                    onClick={() => setPaymentMode(mode)}
                                                >
                                                    {mode}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-700">Amount Collected (₹)</Label>
                                        <div className="relative">
                                            <WalletIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                            <Input
                                                type="number"
                                                value={paidAmount}
                                                onChange={(e) => setPaidAmount(e.target.value)}
                                                className="text-xl font-bold pl-10 h-12"
                                                placeholder={selectedWalkin?.current_balance?.toString()}
                                            />
                                        </div>
                                        {parseFloat(paidAmount) < selectedWalkin?.current_balance && (
                                            <p className="text-xs text-amber-600 font-medium">
                                                Partial payment: {formatCurrency(selectedWalkin?.current_balance - (parseFloat(paidAmount) || 0))} will remain as balance.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {paymentMode !== 'cash' && (
                                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                                            {paymentMode === 'upi' && allUpiIds.length > 0 ? (
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Select UPI ID</Label>
                                                    <Select value={upiId} onValueChange={(val) => {
                                                        setUpiId(val);
                                                        const upiData = allUpiIds.find(u => u.upi === val);
                                                        if (upiData) setBankId(upiData.bank_id);
                                                    }}>
                                                        <SelectTrigger className="bg-white">
                                                            <SelectValue placeholder="Select UPI QR" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {allUpiIds.map((item, idx) => (
                                                                <SelectItem key={idx} value={item.upi}>
                                                                    {item.upi} ({item.bank_name})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Select Bank Account</Label>
                                                    <Select value={bankId} onValueChange={setBankId}>
                                                        <SelectTrigger className="bg-white">
                                                            <SelectValue placeholder="Select bank" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {bankAccounts.map(bank => (
                                                                <SelectItem key={bank.id} value={bank.id}>
                                                                    {bank.bank_name} - {bank.account_number?.slice(-4)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Transaction ID / Ref</Label>
                                                <Input
                                                    value={transactionRef}
                                                    onChange={(e) => setTransactionRef(e.target.value)}
                                                    placeholder="UTR/Ref Number"
                                                    className="bg-white"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Breakdown breakdown */}
                                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                                        <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Allocation</div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600 flex items-center gap-1.5">
                                                    <StethoscopeIcon className="h-3.5 w-3.5" /> Treatment
                                                </span>
                                                <span className="font-medium text-slate-900">{formatCurrency(selectedWalkin?.treatment_fees_pending)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600 flex items-center gap-1.5">
                                                    <Pill className="h-3.5 w-3.5" /> Pharmacy
                                                </span>
                                                <span className="font-medium text-slate-900">{formatCurrency(selectedWalkin?.pharmacy_fees_pending)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-1.5 border-t border-dashed">
                                                <span className="text-slate-500 italic">Previous Due</span>
                                                <span className="font-medium text-slate-700">{formatCurrency(selectedWalkin?.previous_balance)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-6 gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setCheckoutOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 min-w-[200px] h-11 text-lg font-bold shadow-lg shadow-emerald-100"
                            onClick={handleCheckout}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : (
                                <>
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Confirm Payment
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Reception;
