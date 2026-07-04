import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Package, List, Wallet, User, LogOut, Bell,
  ChevronDown, Menu, Settings, Shield, Truck, BarChart3,
} from 'lucide-react';
import clsx from 'clsx';
import useAuthStore from '../../store/authStore';
import { Avatar, Badge } from './UI';

const NAV_RECEIVER = [
  { to:'/dashboard',     icon:Home,      label:'Dashboard'    },
  { to:'/post',          icon:Package,   label:'Post Request' },
  { to:'/orders',        icon:List,      label:'My Orders'    },
  { to:'/wallet',        icon:Wallet,    label:'Wallet'       },
  { to:'/profile',       icon:User,      label:'Profile'      },
];
const NAV_CARRIER = [
  { to:'/carrier',       icon:Home,      label:'Dashboard', key:'c-home'    },
  { to:'/carrier/feed',  icon:Package,   label:'Live Feed',  key:'c-feed'   },
  { to:'/orders',        icon:List,      label:'History',    key:'c-orders' },
  { to:'/wallet',        icon:Wallet,    label:'Earnings',   key:'c-wallet' },
  { to:'/profile',       icon:User,      label:'Profile',    key:'c-profile'},
];
const NAV_ADMIN = [
  { to:'/admin',         icon:BarChart3, label:'Overview'  },
  { to:'/admin/kyc',     icon:Shield,    label:'KYC Queue' },
  { to:'/admin/users',   icon:User,      label:'Users'     },
  { to:'/admin/disputes',icon:Truck,     label:'Disputes'  },
];

// ── Sidebar extracted OUTSIDE AppLayout so it never remounts on re-render ──
function Sidebar({ user, navLinks, onMobileClose, onLogout, onSwitch, roleDropdown, setRoleDropdown }) {
  const isBoth = user?.roles?.includes('carrier') && user?.roles?.includes('receiver');

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center text-lg">📦</div>
          <div>
            <p className="font-black text-white text-lg leading-none">CampusRelay</p>
            <p className="text-white/40 text-xs font-medium">Campus delivery network</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Avatar name={user?.fullName} color="brand" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">{user?.fullName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={clsx('w-1.5 h-1.5 rounded-full', user?.isActive ? 'bg-success' : 'bg-yellow-400')} />
              <p className="text-white/50 text-xs capitalize">{user?.activeRole || 'receiver'}</p>
            </div>
          </div>
          {isBoth && (
            <div className="relative">
              <button onClick={() => setRoleDropdown(v => !v)} className="text-white/50 hover:text-white">
                <ChevronDown className="w-4 h-4" />
              </button>
              {roleDropdown && (
                <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50 w-40">
                  <button onClick={() => onSwitch('receiver')}
                    className={clsx('w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                      user.activeRole === 'receiver' ? 'text-brand bg-orange-50' : 'text-campus-dark hover:bg-gray-50')}>
                    🏠 Hostel Student
                  </button>
                  <button onClick={() => onSwitch('carrier')}
                    className={clsx('w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                      user.activeRole === 'carrier' ? 'text-brand bg-orange-50' : 'text-campus-dark hover:bg-gray-50')}>
                    🛵 Day Scholar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navLinks.map(({ to, icon: Icon, label, key }) => (
          <NavLink key={key || to} to={to} end={to === navLinks[0].to}
            className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            onClick={onMobileClose}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 border-t border-white/10 pt-4 space-y-0.5">
        <NavLink to="/profile"
          className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
          onClick={onMobileClose}>
          <Settings className="w-4 h-4" /> Settings
        </NavLink>
        <button onClick={onLogout}
          className="sidebar-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

export function AppLayout({ children }) {
  const { user, logout, switchRole } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [roleDropdown, setRoleDropdown] = useState(false);

  const isAdmin  = user?.roles?.includes('admin');
  const isCarrier= user?.activeRole === 'carrier';
  const navLinks = isAdmin ? NAV_ADMIN : isCarrier ? NAV_CARRIER : NAV_RECEIVER;

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleSwitch = async (role) => {
    await switchRole(role);
    setRoleDropdown(false);
    navigate(role === 'carrier' ? '/carrier' : '/dashboard');
  };

  const sidebarProps = {
    user, navLinks,
    onMobileClose: () => setMobileOpen(false),
    onLogout:      handleLogout,
    onSwitch:      handleSwitch,
    roleDropdown,
    setRoleDropdown,
  };

  return (
    <div className="flex h-screen bg-[#F7F5F2] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col bg-campus-dark flex-shrink-0">
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-campus-dark flex flex-col">
            <Sidebar {...sidebarProps} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:flex items-center gap-2">
            {!user?.isActive && <Badge color="yellow">⏳ Pending KYC Approval</Badge>}
            {user?.wallet && (
              <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="text-sm">💰</span>
                <span className="text-sm font-bold text-campus-dark">₹{user.wallet.balance?.toFixed(0)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-muted" />
            </button>
            <NavLink to="/profile">
              <Avatar name={user?.fullName} size="sm" />
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
