import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Pharmacy from './pages/Pharmacy';
import PharmacySales from './pages/PharmacySales';
import Suppliers from './pages/Suppliers';
import Billing from './pages/Billing';
import Expenses from './pages/Expenses';
import Branches from './pages/Branches';
import Users from './pages/Users';
import Treatments from './pages/Treatments';
import Settings from './pages/Settings';
import PurchaseEntry from './pages/PurchaseEntry';
import Doctors from './pages/Doctors';
import Godown from './pages/Godown';
import MasterData from './pages/MasterData';
import Reports from './pages/Reports';
import CreditSales from './pages/CreditSales';
import LabOrders from './pages/LabOrders';
import DailyReport from './pages/DailyReport';
import StockTransfer from './pages/StockTransfer';
import Reception from './pages/Reception';
import Layout from './components/Layout';
import TreatmentBilling from './pages/TreatmentBilling';
import PharmacyBilling from './pages/PharmacyBilling';
import { Toaster } from './components/ui/sonner';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_API_URL;
export const API = `${BACKEND_URL}/api`;

console.log('Backend URL:', BACKEND_URL);
console.log('API URL:', API);

export const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Global logout handler for interceptor
let globalLogoutHandler = null;
export const setGlobalLogoutHandler = (handler) => {
  globalLogoutHandler = handler;
};

// Setup axios interceptor for 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - trigger logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      if (globalLogoutHandler) {
        globalLogoutHandler();
      }
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        setAuthToken(token);
        try {
          // Verify token is still valid
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (error) {
          // Token invalid - clear session
          console.log('Session expired, clearing credentials');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    validateSession();
  }, []);

  const handleLogin = (token, userData) => {
    setAuthToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  // Register global logout handler for axios interceptor
  useEffect(() => {
    setGlobalLogoutHandler(handleLogout);
    return () => setGlobalLogoutHandler(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Dashboard user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/reception"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Reception user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/patients"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Patients user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/pharmacy"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Pharmacy user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/pharmacy-sales"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <PharmacySales user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/suppliers"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Suppliers user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/pharmacy-billing"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <PharmacyBilling user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/treatment-billing"
            element={
              isAuthenticated ? (
                (user?.role === 'receptionist' || user?.role === 'accountant') ? (
                  <Navigate to="/" replace />
                ) : (
                  <Layout user={user} onLogout={handleLogout}>
                    <TreatmentBilling user={user} />
                  </Layout>
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/expenses"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Expenses user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/branches"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Branches user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/users"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Users user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/treatments"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Treatments user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Settings user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/purchase-entry"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <PurchaseEntry user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/stock-transfer"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <StockTransfer user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/doctors"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Doctors user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/godown"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Godown user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/master-data"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <MasterData user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/reports"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Reports user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/credit-sales"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <CreditSales user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/lab-orders"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <LabOrders user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/daily-report"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <DailyReport user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
