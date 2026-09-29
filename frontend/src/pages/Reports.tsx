import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { FileBarChart, Download, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

type ReportType = 'sales' | 'products' | 'categories' | 'inventory';
type GroupBy = 'day' | 'week' | 'month';

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = `/reports/${reportType}`;
      const params: any = {};
      if (reportType !== 'inventory') {
        params.from = from;
        params.to = to;
      }
      if (reportType === 'sales') params.groupBy = groupBy;

      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch {
      toast.error('Error cargando reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [reportType, groupBy, from, to]);

  const handleExport = async () => {
    if (!data?.data) return;
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
      XLSX.writeFile(wb, `reporte_${reportType}_${from}_${to}.xlsx`);
      toast.success('Reporte exportado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  const reportTabs = [
    { key: 'sales' as const, label: 'Ventas' },
    { key: 'products' as const, label: 'Por Producto' },
    { key: 'categories' as const, label: 'Por Categoría' },
    { key: 'inventory' as const, label: 'Inventario' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
          <p className="text-sm text-gray-500">Análisis detallado de operaciones</p>
        </div>
        <button onClick={handleExport} disabled={!data?.data} className="btn-primary py-2 px-4 text-sm flex items-center gap-1 disabled:opacity-40">
          <Download className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
        {reportTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setReportType(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              reportType === tab.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {reportType !== 'inventory' && (
        <div className="card">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field" />
            </div>
            {reportType === 'sales' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Agrupar por</label>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="input-field">
                  <option value="day">Día</option>
                  <option value="week">Semana</option>
                  <option value="month">Mes</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          {data.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(data.summary).map(([key, value]) => (
                <div key={key} className="card text-center">
                  <p className="text-xs text-gray-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-xl font-bold text-gray-800">
                    {typeof value === 'number' && key.toLowerCase().includes('value') || key.toLowerCase().includes('revenue')
                      ? `$${(value as number).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      : String(value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Chart for sales */}
          {reportType === 'sales' && data.data?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">Tendencia de Ventas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(2)}`,
                      name === 'total' ? 'Ventas' : name === 'profit' ? 'Utilidad' : name,
                    ]}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ventas" />
                  <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} name="Utilidad" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data Table */}
          {data.data?.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {Object.keys(data.data[0]).map((key) => (
                        <th key={key} className="px-4 py-3 font-semibold text-gray-600 capitalize whitespace-nowrap">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.data.slice(0, 50).map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {Object.entries(row).map(([key, value], colIdx) => (
                          <td key={colIdx} className="px-4 py-3 whitespace-nowrap">
                            {typeof value === 'number'
                              ? key.toLowerCase().includes('price') ||
                                key.toLowerCase().includes('total') ||
                                key.toLowerCase().includes('revenue') ||
                                key.toLowerCase().includes('cost') ||
                                key.toLowerCase().includes('profit') ||
                                key.toLowerCase().includes('value')
                                ? `$${value.toFixed(2)}`
                                : value
                              : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.data.length > 50 && (
                <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500">
                  Mostrando 50 de {data.data.length} registros. Exporta para ver todos.
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
