import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import {
  LayoutDashboard,
  Pill,
  FileText,
  CreditCard,
  LogOut,
  Menu,
  X,
  Settings as SettingsIcon,
  PackagePlus,
  Database,
  BarChart3,
  Landmark,
  FlaskConical,
  ClipboardList,
  ArrowRightLeft,
  Users,
  Inbox,
  Stethoscope
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);

  // Navigation source of truth - exactly in requested order
  const adminNavigation = [
    { type: 'header' },
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, module: 'dashboard' },
    { name: 'Patients', href: '/patients', icon: Users, module: 'patients' },
    { name: 'Treatment Billing', href: '/treatment-billing', icon: Stethoscope, module: 'treatment_billing' },
    { name: 'Pharmacy Billing', href: '/pharmacy-billing', icon: FileText, module: 'pharmacy_billing' },
    { name: 'Reception', href: '/reception', icon: Inbox, module: 'reception' },
    { name: 'Lab Orders', href: '/lab-orders', icon: FlaskConical, module: 'lab_orders' },
    { name: 'Pharmacy', href: '/pharmacy', icon: Pill, module: 'pharmacy' },
    { name: 'Daily Report', href: '/daily-report', icon: ClipboardList, module: 'daily_report' },
    { name: 'Expenses', href: '/expenses', icon: CreditCard, module: 'expenses' },
    { type: 'divider' },
    { type: 'header' },
    { name: 'Purchase Entry', href: '/purchase-entry', icon: PackagePlus, module: 'purchases' },
    { name: 'Stock Transfer', href: '/stock-transfer', icon: ArrowRightLeft, module: 'stock_transfer' },
    { type: 'divider' },
    { type: 'header' },
    { name: 'Master Data', href: '/master-data', icon: Database, module: 'master_data' },
    { name: 'Settings', href: '/settings', icon: SettingsIcon, module: 'settings' },
    { name: 'Reports', href: '/reports', icon: BarChart3, module: 'reports' },
  ];


  useEffect(() => {
    if (user && user.role !== 'admin') {
      fetchUserPermissions();
    }
  }, [user]);

  const fetchUserPermissions = async () => {
    try {
      const response = await axios.get(`${API}/user-permissions`);
      // Filter permissions for current user that have view access
      const myPermissions = response.data.filter(
        p => p.user_id === user?.id && p.can_view
      );
      setUserPermissions(myPermissions);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  // Build navigation based on user role
  const getNavigation = () => {
    if (user?.role === 'admin') {
      return adminNavigation;
    }

    let filtered = [];
    if (user?.role === 'receptionist' || user?.role === 'accountant') {
      const allowedNames = ['Dashboard', 'Reception', 'Pharmacy', 'Pharmacy Billing', 'Lab Orders', 'Daily Report'];
      filtered = adminNavigation.filter(item => item.type === 'divider' || item.type === 'header' || allowedNames.includes(item.name));
    } else {
      // For other non-admin users (branch_manager), show only permitted modules
      const permittedModules = userPermissions.map(p => p.module);
      filtered = adminNavigation.filter(item => {
        if (item.type === 'divider' || item.type === 'header') return true;
        if (item.module === 'dashboard') return true;
        return permittedModules.includes(item.module);
      });
    }

    // Clean up dividers and headers (remove leading/trailing/empty ones)
    return filtered.filter((item, index, self) => {
      // If it's a real nav item, keep it
      if (!['divider', 'header'].includes(item.type)) return true;

      // If it's a divider, must have content before and after, and not be consecutive
      if (item.type === 'divider') {
        const hasBefore = self.slice(0, index).some(i => !['divider', 'header'].includes(i.type));
        const hasAfter = self.slice(index + 1).some(i => !['divider', 'header'].includes(i.type));
        const prevIsDivider = index > 0 && self[index - 1].type === 'divider';
        return hasBefore && hasAfter && !prevIsDivider;
      }

      // If it's a header, must have at least one nav item before the next header/divider or EOF
      if (item.type === 'header') {
        let hasContentBelow = false;
        for (let i = index + 1; i < self.length; i++) {
          if (['divider', 'header'].includes(self[i].type)) break;
          hasContentBelow = true;
          break;
        }
        return hasContentBelow;
      }
      return true;
    });
  };

  const navigation = getNavigation();

  return (
    <div className="min-h-screen bg-slate-50" data-testid="layout">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
            <h1 className="text-xl font-heading font-bold text-emerald-600">
              DentalSuthra
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div key={`divider-${index}`} className="my-2 border-t border-slate-100 mx-2" />
                );
              }
              if (item.type === 'header') {
                return (
                  <div key={`header-${index}`} className="h-6" />
                );
              }
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 font-semibold text-sm">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-700">{user?.username || 'User'}</p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role || 'Role'}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex items-center h-16 px-4 bg-white border-b border-slate-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500"
          >
            <Menu size={24} />
          </button>
          <h1 className="ml-4 text-lg font-heading font-bold text-emerald-600">
            DentalSuthra
          </h1>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
