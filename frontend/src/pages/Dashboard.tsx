import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { DashboardData } from '../types';
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle, Package, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch {
        toast.error('Error cargando dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) return <div className="p-6">Error cargando datos</div>;

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const salesByDayChart = data.salesByDay.map((d) => ({
    ...d,
    day: dayNames[new Date(d.date + 'T12:00:00').getDay()],
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500">Resumen de operaciones</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Ventas Hoy</span>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">${data.today.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">{data.today.count} tickets</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Ventas Semana</span>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">${data.week.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">{data.week.count} tickets</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Ventas Mes</span>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">${data.month.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">{data.month.count} tickets</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Utilidad Mes</span>
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">${data.profit.profit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">Margen: {data.profit.margin}%</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Day */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Ventas de la Semana</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesByDayChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']} />
              <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Category */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Ventas por Categoría (Mes)</h3>
          {data.salesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.salesByCategory}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {data.salesByCategory.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400">Sin datos</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" /> Productos Más Vendidos (Mes)
          </h3>
          <div className="space-y-3">
            {data.topProducts.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Sin ventas este mes</p>
            ) : (
              data.topProducts.map((product, idx) => (
                <div key={product.productId} className="flex items-center gap-3">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold text-white ${idx < 3 ? 'bg-primary-500' : 'bg-gray-400'}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{product.totalQuantity} uds</p>
                    <p className="text-xs text-gray-500">${Number(product.totalRevenue).toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" /> Alertas de Stock Bajo
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.lowStockProducts.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Todo el inventario está bien</p>
            ) : (
              data.lowStockProducts.map((product: any) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${product.stock === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {product.stock === 0 ? 'AGOTADO' : `${product.stock} uds`}
                    </p>
                    <p className="text-xs text-gray-500">Mín: {product.min_stock}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
