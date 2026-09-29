import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ShoppingCart, Package, LayoutDashboard, FileBarChart, Users,
  LogOut, Store, ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { to: '/pos', icon: ShoppingCart, label: 'Punto de Venta', roles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] },
    { to: '/inventory', icon: Package, label: 'Inventario', roles: ['ADMIN', 'SUPERVISOR'] },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR'] },
    { to: '/reports', icon: FileBarChart, label: 'Reportes', roles: ['ADMIN', 'SUPERVISOR'] },
    { to: '/users', icon: Users, label: 'Usuarios', roles: ['ADMIN'] },
  ];

  const filteredItems = menuItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className={`fixed left-0 top-0 h-full bg-gray-900 text-white transition-all duration-300 z-40 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Store className="w-7 h-7 text-primary-400" />
            <div>
              <h1 className="text-sm font-bold text-primary-400">POS Abarrotes</h1>
              <p className="text-[10px] text-gray-400">Punto de Venta</p>
            </div>
          </div>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors">
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-700 p-4">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-400">
              {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'CAJERO' ? 'Cajero' : 'Supervisor'}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
