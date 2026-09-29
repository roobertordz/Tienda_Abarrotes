import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { Product, Category, Brand } from '../types';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, Filter, Download, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductForm from './ProductForm';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 25 };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (brandFilter) params.brand = brandFilter;
      if (!showInactive) params.active = 'true';

      const res = await api.get('/products', { params });
      setProducts(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotal(res.data.pagination.total);
    } catch {
      toast.error('Error cargando productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogues = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        api.get('/categories'),
        api.get('/brands'),
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
    } catch {
      // silently fail
    }
  };

  useEffect(() => { fetchCatalogues(); }, []);
  useEffect(() => { fetchProducts(); }, [page, search, categoryFilter, brandFilter, showInactive]);

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Desactivar "${product.name}"?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Producto desactivado');
      fetchProducts();
    } catch {
      toast.error('Error al desactivar producto');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormClose = (saved?: boolean) => {
    setShowForm(false);
    setEditingProduct(null);
    if (saved) fetchProducts();
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 10000, active: 'true' } });
      const XLSX = await import('xlsx');
      const data = res.data.data.map((p: Product) => ({
        SKU: p.sku,
        'Código de Barras': p.barcode || '',
        Nombre: p.name,
        Categoría: p.category?.name || '',
        Marca: p.brand?.name || '',
        'Precio Compra': Number(p.purchasePrice),
        'Precio Venta': Number(p.salePrice),
        Stock: p.stock,
        'Stock Mínimo': p.minStock,
        Unidad: p.unitOfMeasure,
        Estado: p.active ? 'Activo' : 'Inactivo',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      XLSX.writeFile(wb, `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Inventario exportado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  // ── IMPORTACIÓN ──
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, any>[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: { row: number; sku: string; error: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];
      setImportRows(rows);
    } catch {
      toast.error('Error leyendo el archivo. Asegúrate que sea .xlsx o .csv');
      setImportRows([]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportConfirm = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    try {
      const res = await api.post('/products/import', { rows: importRows });
      setImportResult(res.data);
      if (res.data.created > 0 || res.data.updated > 0) {
        fetchProducts();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al importar');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportClose = () => {
    setShowImport(false);
    setImportRows([]);
    setImportFileName('');
    setImportResult(null);
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const template = [
      {
        SKU: 'PROD001',
        'Código de Barras': '7501234567890',
        Nombre: 'Ejemplo Producto',
        Categoría: 'Bebidas',
        Marca: 'MiMarca',
        'Precio Compra': 10.00,
        'Precio Venta': 15.00,
        Stock: 50,
        'Stock Mínimo': 5,
        Unidad: 'PIEZA',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_importacion.xlsx');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
          <p className="text-sm text-gray-500">{total} productos registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="btn-secondary py-2 px-4 text-sm flex items-center gap-1">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setShowImport(true)} className="btn-secondary py-2 px-4 text-sm flex items-center gap-1">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={() => { setEditingProduct(null); setShowForm(true); }} className="btn-primary py-2 px-4 text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre, SKU o código de barras..."
              className="input-field pl-10"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary py-2 px-4 text-sm flex items-center gap-1">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="input-field">
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }} className="input-field">
              <option value="">Todas las marcas</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm">Mostrar inactivos</span>
            </label>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Producto</th>
                <th className="px-4 py-3 font-semibold text-gray-600">SKU</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Categoría</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">P. Compra</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">P. Venta</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Stock</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Estado</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No se encontraron productos</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className={`hover:bg-gray-50 ${!product.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.brand?.name}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{product.sku}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{product.category?.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right">${Number(product.purchasePrice).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium">${Number(product.salePrice).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        product.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : product.stock <= product.minStock
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {product.stock === 0 && <AlertTriangle className="w-3 h-3" />}
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {product.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(product)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        {product.active && (
                          <button onClick={() => handleDelete(product)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Desactivar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              Página {page} de {totalPages} ({total} productos)
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          brands={brands}
          onClose={handleFormClose}
        />
      )}

      {/* ── MODAL IMPORTACIÓN ── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary-500" /> Importar Inventario
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Carga productos desde un archivo Excel (.xlsx)</p>
              </div>
              <button onClick={handleImportClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <Package className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Instrucciones + plantilla */}
              {!importResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Columnas requeridas en el archivo:</p>
                  <p className="font-mono text-xs">SKU · Nombre · Categoría · Marca · Precio Compra · Precio Venta · Stock</p>
                  <p className="font-mono text-xs text-blue-600">Opcionales: Código de Barras · Stock Mínimo · Unidad</p>
                  <p className="text-xs mt-2 text-blue-700">• Si el SKU ya existe, el producto se <strong>actualiza</strong>. Si no existe, se <strong>crea</strong>.</p>
                  <p className="text-xs text-blue-700">• Categorías y marcas nuevas se crean automáticamente.</p>
                  <button onClick={handleDownloadTemplate} className="mt-2 text-xs underline text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Download className="w-3 h-3" /> Descargar plantilla de ejemplo
                  </button>
                </div>
              )}

              {/* Zona de carga */}
              {!importResult && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportFile}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-1" />
                    {importFileName ? (
                      <p className="text-sm font-medium text-primary-600">{importFileName}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Haz clic para seleccionar el archivo</p>
                    )}
                    <p className="text-xs text-gray-400">.xlsx, .xls, .csv</p>
                  </label>
                </div>
              )}

              {/* Preview de filas */}
              {importRows.length > 0 && !importResult && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Vista previa — {importRows.length} filas detectadas
                    <span className="ml-2 text-xs text-gray-400">(mostrando primeras 5)</span>
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(importRows[0]).slice(0, 8).map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.keys(importRows[0]).slice(0, 8).map((col) => (
                              <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[120px] truncate">
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Resultado */}
              {importResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-green-600">{importResult.created}</p>
                      <p className="text-xs text-green-700 mt-1">Productos creados</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600">{importResult.updated}</p>
                      <p className="text-xs text-blue-700 mt-1">Productos actualizados</p>
                    </div>
                    <div className={`border rounded-xl p-4 text-center ${importResult.errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-3xl font-bold ${importResult.errors.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{importResult.errors.length}</p>
                      <p className={`text-xs mt-1 ${importResult.errors.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>Errores</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-2">Filas con error:</p>
                      <div className="overflow-y-auto max-h-40 rounded-lg border border-red-200">
                        <table className="w-full text-xs">
                          <thead className="bg-red-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-red-700">Fila</th>
                              <th className="px-3 py-2 text-left text-red-700">SKU</th>
                              <th className="px-3 py-2 text-left text-red-700">Error</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-100">
                            {importResult.errors.map((e, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 text-gray-600">{e.row}</td>
                                <td className="px-3 py-2 font-mono text-gray-700">{e.sku}</td>
                                <td className="px-3 py-2 text-red-600">{e.error}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={handleImportClose} className="btn-secondary px-5">
                {importResult ? 'Cerrar' : 'Cancelar'}
              </button>
              {!importResult && (
                <button
                  onClick={handleImportConfirm}
                  disabled={importRows.length === 0 || importLoading}
                  className="btn-primary px-6 flex items-center gap-2 disabled:opacity-40"
                >
                  {importLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importar {importRows.length > 0 && `(${importRows.length} filas)`}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
