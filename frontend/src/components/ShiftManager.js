import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Play, StopCircle, Clock, User, Building2, CheckCircle2, AlertTriangle
} from 'lucide-react';

const ShiftManager = ({ user, branches, onShiftChange }) => {
  const [activeShift, setActiveShift] = useState(null);
  const [activeShifts, setActiveShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [postHandoverTx, setPostHandoverTx] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isBranchManager = user?.role === 'branch_manager';
  const isStaff = user?.role === 'receptionist' || user?.role === 'accountant';

  useEffect(() => {
    fetchShiftData();
  }, []);

  const fetchShiftData = async () => {
    setLoading(true);
    try {
      if (isStaff) {
        // Staff sees their own active shift
        const res = await axios.get(`${API}/shifts/my-active`);
        setActiveShift(res.data);
      }
      
      if (isAdmin || isBranchManager) {
        // Admin/Manager sees all active shifts needing handover
        const res = await axios.get(`${API}/shifts/active`);
        setActiveShifts(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching shift data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async () => {
    const branchId = user?.branch_id || branches[0]?.id;
    const branchName = branches.find(b => b.id === branchId)?.name || 'Unknown';
    
    if (!branchId) {
      toast.error('No branch assigned. Contact admin.');
      return;
    }

    try {
      const res = await axios.post(`${API}/shifts/start`, {
        branch_id: branchId,
        branch_name: branchName
      });
      setActiveShift(res.data);
      toast.success('Shift started successfully!');
      onShiftChange?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start shift');
    }
  };

  const handleConfirmHandover = async () => {
    if (!selectedShift) return;

    try {
      await axios.post(`${API}/shifts/end`, {
        shift_id: selectedShift.id
      });
      toast.success(`Handover confirmed for ${selectedShift.user_name}`);
      setConfirmDialog(false);
      setSelectedShift(null);
      fetchShiftData();
      onShiftChange?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm handover');
    }
  };

  const checkPostHandoverTransactions = async (shift) => {
    try {
      const res = await axios.get(`${API}/shifts/post-handover-transactions`, {
        params: { user_id: shift.user_id, shift_id: shift.id }
      });
      if (res.data.bills?.length > 0 || res.data.pharmacy_sales?.length > 0) {
        setPostHandoverTx(res.data);
      } else {
        setPostHandoverTx(null);
      }
    } catch (error) {
      console.error('Error checking post-handover transactions:', error);
    }
  };

  const openConfirmDialog = (shift) => {
    setSelectedShift(shift);
    checkPostHandoverTransactions(shift);
    setConfirmDialog(true);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '-';
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return null;
  }

  return (
    <>
      {/* Staff: Start Shift Button */}
      {isStaff && !activeShift && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">No active shift</p>
                  <p className="text-sm text-amber-600">Start your shift to begin transactions</p>
                </div>
              </div>
              <Button onClick={handleStartShift} className="bg-emerald-600 hover:bg-emerald-700">
                <Play className="w-4 h-4 mr-2" />
                Start Shift
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff: Active Shift Status */}
      {isStaff && activeShift && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-emerald-800">Shift Active</p>
                  <p className="text-sm text-emerald-600">
                    Started at {formatTime(activeShift.start_time)} • Duration: {formatDuration(activeShift.start_time)}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700">
                <Clock className="w-3 h-3 mr-1" />
                {activeShift.branch_name}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin/Manager: Pending Handovers */}
      {(isAdmin || isBranchManager) && activeShifts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Handovers ({activeShifts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeShifts.map((shift) => (
                <div 
                  key={shift.id} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{shift.user_name}</p>
                      <p className="text-xs text-slate-500">
                        {shift.user_email} • Started {formatTime(shift.start_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="w-3 h-3 mr-1" />
                      {shift.branch_name}
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-700">
                      {formatDuration(shift.start_time)}
                    </Badge>
                    <Button 
                      size="sm"
                      onClick={() => openConfirmDialog(shift)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Confirm Handover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Handover Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Handover</DialogTitle>
            <DialogDescription>
              Confirm that you have received the handover from {selectedShift?.user_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedShift && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Staff</p>
                    <p className="font-medium">{selectedShift.user_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Branch</p>
                    <p className="font-medium">{selectedShift.branch_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Shift Started</p>
                    <p className="font-medium">{formatTime(selectedShift.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Duration</p>
                    <p className="font-medium">{formatDuration(selectedShift.start_time)}</p>
                  </div>
                </div>
              </div>

              {postHandoverTx && (postHandoverTx.bills?.length > 0 || postHandoverTx.pharmacy_sales?.length > 0) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <p className="font-medium text-amber-800">Post-Handover Transactions Found!</p>
                  </div>
                  <p className="text-sm text-amber-700">
                    This user has {postHandoverTx.bills?.length || 0} bill(s) and {postHandoverTx.pharmacy_sales?.length || 0} pharmacy sale(s) 
                    after the previous handover. These will need another handover.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setConfirmDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmHandover}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Handover Received
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShiftManager;
