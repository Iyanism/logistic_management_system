import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Package, Truck, Warehouse, MapPin,
  Users, Bell, LogOut, ChevronLeft, ChevronRight, Search, User
} from 'lucide-react';

const adminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: Package, label: 'Orders' },
  { to: '/fleet', icon: Truck, label: 'Fleet' },
  { to: '/warehouse', icon: Warehouse, label: 'Warehouse' },
  { to: '/routes', icon: MapPin, label: 'Routes' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

const driverLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: Package, label: 'My Trips' },
  { to: '/routes', icon: MapPin, label: 'Routes' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

const customerLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: Package, label: 'My Orders' },
  { to: '/track', icon: Search, label: 'Track Order' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const links = user?.role === 'admin' ? adminLinks :
                user?.role === 'driver' ? driverLinks : customerLinks;

  return (
    <aside className={`${collapsed ? 'w-[72px]' : 'w-64'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out min-h-screen`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Truck size={18} className="text-slate-900" />
          </div>
          {!collapsed && <span className="font-bold text-lg text-slate-900 tracking-tight">LMS</span>}
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to || location.pathname.startsWith(link.to + '/');
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <User size={14} className="text-slate-900" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 flex items-center justify-center border-t border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
