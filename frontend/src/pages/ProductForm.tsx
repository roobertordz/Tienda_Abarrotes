import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Product, Category, Brand, Supplier } from '../types';
import { X, Save, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  product: Product | null;
  categories: Category[];
  brands: Brand[];
  onClose: (saved?: boolean) => void;
}

export default function ProductForm({ product, categories, brands, onClose }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [localCategories, setLocalCategories] = useState(categories);
  const [localBrands, setLocalBrands] = useState(brands);

  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    description: product?.description || '',
    purchasePrice: product ? Number(product.purchasePrice) : 0,
    salePrice: product ? Number(product.salePrice) : 0,
    stock: product?.stock || 0,
    minStock: product?.minStock || 5,
    unitOfMeasure: product?.unitOfMeasure || 'PIEZA',
    taxRate: product ? Number(product.taxRate) : 0.16,
    taxExempt: product?.taxExempt || false,
    categoryId: product?.categoryId || '',
    brandId: product?.brandId || '',
    supplierId: product?.supplierId || '',
    active: product?.active ?? true,
  });

  useEffect(() => {
    api.get('/suppliers').then((res) => setSuppliers(res.data)).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.categoryId || !form.brandId) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...form,
        categoryId: Number(form.categoryId),
        brandId: Number(form.brandId),
        supplierId: form.supplierId ? Number(form.supplierId) : null,
      };

      if (product) {
        await api.put(`/products/${product.id}`, data);
        toast.success('Producto actualizado');
      } else {
        await api.post('/products', data);
        toast.success('Producto creado');
      }
      onClose(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await api.post('/categories', { name: newCategoryName });
      setLocalCategories([...localCategories, res.data]);
      setForm((prev) => ({ ...prev, categoryId: res.data.id }));
      setNewCategoryName('');
      setShowNewCategory(false);
      toast.success('Categoría creada');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await api.post('/brands', { name: newBrandName });
      setLocalBrands([...localBrands, res.data]);
      setForm((prev) => ({ ...prev, brandId: res.data.id }));
      setNewBrandName('');
      setShowNewBrand(false);
      toast.success('Marca creada');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const margin = form.salePrice > 0 && form.purchasePrice > 0
    ? (((form.salePrice - form.purchasePrice) / form.salePrice) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-xl font-bold">{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={() => onClose()} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-6">
          {/* Basic Info */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-3">Información Básica</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-600 mb-1 block">Nombre *</label>
                <input name="name" value={form.name} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">SKU *</label>
                <input name="sku" value={form.sku} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Código de Barras</label>
                <input name="barcode" value={form.barcode} onChange={handleChange} className="input-field" />
              </div>
            </div>
          </fieldset>

          {/* Category & Brand */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-3">Clasificación</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                  <span>Categoría *</span>
                  <button type="button" onClick={() => setShowNewCategory(!showNewCategory)} className="text-primary-600 text-xs hover:underline flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Nueva
                  </button>
                </label>
                {showNewCategory ? (
                  <div className="flex gap-2">
                    <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="input-field flex-1" placeholder="Nombre de categoría" />
                    <button type="button" onClick={handleCreateCategory} className="btn-primary py-2 px-3 text-sm">Crear</button>
                  </div>
                ) : (
                  <select name="categoryId" value={form.categoryId} onChange={handleChange} className="input-field" required>
                    <option value="">Seleccionar...</option>
                    {localCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                  <span>Marca *</span>
                  <button type="button" onClick={() => setShowNewBrand(!showNewBrand)} className="text-primary-600 text-xs hover:underline flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Nueva
                  </button>
                </label>
                {showNewBrand ? (
                  <div className="flex gap-2">
                    <input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} className="input-field flex-1" placeholder="Nombre de marca" />
                    <button type="button" onClick={handleCreateBrand} className="btn-primary py-2 px-3 text-sm">Crear</button>
                  </div>
                ) : (
                  <select name="brandId" value={form.brandId} onChange={handleChange} className="input-field" required>
                    <option value="">Seleccionar...</option>
                    {localBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Proveedor</label>
                <select name="supplierId" value={form.supplierId} onChange={handleChange} className="input-field">
                  <option value="">Sin proveedor</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Unidad de Medida</label>
                <select name="unitOfMeasure" value={form.unitOfMeasure} onChange={handleChange} className="input-field">
                  <option value="PIEZA">Pieza</option>
                  <option value="KILOGRAMO">Kilogramo</option>
                  <option value="LITRO">Litro</option>
                  <option value="METRO">Metro</option>
                  <option value="PAQUETE">Paquete</option>
                  <option value="CAJA">Caja</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Prices */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-3">Precios e Inventario</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Precio Compra *</label>
                <input name="purchasePrice" type="number" step="0.01" min="0" value={form.purchasePrice} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Precio Venta *</label>
                <input name="salePrice" type="number" step="0.01" min="0" value={form.salePrice} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Stock</label>
                <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Stock Mínimo</label>
                <input name="minStock" type="number" min="0" value={form.minStock} onChange={handleChange} className="input-field" />
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-700">Margen de ganancia:</span>
              <span className="font-bold text-blue-700">{margin}%</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input name="taxExempt" type="checkbox" checked={form.taxExempt} onChange={handleChange} className="w-4 h-4 rounded" />
                <span className="text-sm">Exento de IVA</span>
              </label>
              {product && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input name="active" type="checkbox" checked={form.active} onChange={handleChange} className="w-4 h-4 rounded" />
                  <span className="text-sm">Activo</span>
                </label>
              )}
            </div>
          </fieldset>

          {/* Description */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Descripción</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="input-field resize-none" />
          </div>
        </form>

        <div className="p-5 border-t flex justify-end gap-3">
          <button type="button" onClick={() => onClose()} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : product ? 'Actualizar' : 'Crear Producto'}
          </button>
        </div>
      </div>
    </div>
  );
}
