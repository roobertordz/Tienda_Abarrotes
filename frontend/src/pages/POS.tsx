import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import { Product, CartItem, TicketData, Category } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, ArrowLeftRight, ShoppingCart, X, Check, LayoutGrid, Receipt, Smartphone, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import TicketPreview from './TicketPreview';

type MpTerminalStatus = 'idle' | 'sending' | 'waiting' | 'approved' | 'rejected' | 'cancelled' | 'error';

interface MpDevice { id: string; operating_mode: string; }

export default function POS() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'MIXTO' | 'TERMINAL_MP'>('EFECTIVO');
  const [cashReceived, setCashReceived] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [processing, setProcessing] = useState(false);

  // Catálogo
  const [activeTab, setActiveTab] = useState<'cart' | 'catalog'>('cart');
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Mercado Pago Terminal
  const [mpDeviceId, setMpDeviceId] = useState<string>(() => localStorage.getItem('mp_device_id') || '');
  const [mpDevices, setMpDevices] = useState<MpDevice[]>([]);
  const [showMpDeviceSelector, setShowMpDeviceSelector] = useState(false);
  const [mpTerminalStatus, setMpTerminalStatus] = useState<MpTerminalStatus>('idle');
  const [mpPaymentIntentId, setMpPaymentIntentId] = useState<string | null>(null);
  const mpPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Cargar catálogo y categorías al montar
  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products', { params: { limit: 200, active: 'true' } }),
          api.get('/categories'),
        ]);
        setCatalogProducts(prodRes.data.data ?? []);
        setCategories(catRes.data);
      } catch {
        toast.error('Error cargando catálogo');
      } finally {
        setCatalogLoading(false);
      }
    };
    loadCatalog();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F3') { e.preventDefault(); setActiveTab((t) => t === 'catalog' ? 'cart' : 'catalog'); }
      if (e.key === 'F4' && cart.length > 0) { e.preventDefault(); setShowPayment(true); }
      if (e.key === 'Escape') { setShowPayment(false); setShowTicket(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Limpiar polling de MP al desmontar
  useEffect(() => {
    return () => { if (mpPollRef.current) clearInterval(mpPollRef.current); };
  }, []);

  // ── MERCADO PAGO ──
  const loadMpDevices = async () => {
    try {
      const res = await api.get('/mp/devices');
      const devices: MpDevice[] = res.data?.devices ?? [];
      setMpDevices(devices);
      if (devices.length === 0) toast.error('No se encontraron terminales en tu cuenta MP');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error conectando con Mercado Pago');
    }
  };

  const activatePdv = async (terminalId: string) => {
    try {
      toast.loading('Activando modo PDV...', { id: 'pdv' });
      await api.patch('/mp/activate-pdv', { terminalId });
      toast.success('Modo PDV activado. Reinicia la terminal y verifica en Más opciones > Ajustes > Modo de vinculación', { id: 'pdv', duration: 6000 });
      // Recargar lista para ver el nuevo estado
      await loadMpDevices();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error activando PDV', { id: 'pdv' });
    }
  };

  const selectMpDevice = (id: string) => {
    setMpDeviceId(id);
    localStorage.setItem('mp_device_id', id);
    setShowMpDeviceSelector(false);
    toast.success('Terminal configurada');
  };

  const stopMpPolling = () => {
    if (mpPollRef.current) { clearInterval(mpPollRef.current); mpPollRef.current = null; }
  };

  const cancelMpPayment = async () => {
    stopMpPolling();
    if (mpPaymentIntentId && mpDeviceId) {
      try {
        await api.delete(`/mp/payment-intent/${mpPaymentIntentId}/device/${mpDeviceId}`);
      } catch { /* ignorar si ya estaba cancelado */ }
    }
    setMpPaymentIntentId(null);
    setMpTerminalStatus('cancelled');
  };

  const handleMpTerminalPayment = async () => {
    if (!mpDeviceId) {
      await loadMpDevices();
      setShowMpDeviceSelector(true);
      return;
    }

    setMpTerminalStatus('sending');
    try {
      const intentRes = await api.post('/mp/payment-intent', {
        deviceId: mpDeviceId,
        amount: total,
        description: `Venta POS ${new Date().toISOString().slice(0, 10)}`,
      });
      const intentId: string = intentRes.data.id;
      setMpPaymentIntentId(intentId);
      setMpTerminalStatus('waiting');

      // Polling cada 2.5 segundos
      mpPollRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get(`/mp/payment-intent/${intentId}`);
          const state: string = statusRes.data?.state ?? '';
          const paymentResult = statusRes.data?.payment;

          if (state === 'PROCESSED') {
            stopMpPolling();
            const approved = paymentResult?.state === 'approved';
            if (approved) {
              setMpTerminalStatus('approved');
              // Crear venta en el sistema
              await completeSaleWithMethod('TARJETA', total, intentId);
            } else {
              setMpTerminalStatus('rejected');
              toast.error('Pago rechazado por la terminal');
            }
          } else if (state === 'CANCELED') {
            stopMpPolling();
            setMpTerminalStatus('cancelled');
          }
        } catch {
          // No interrumpir polling por errores transitorios
        }
      }, 2500);

    } catch (err: any) {
      setMpTerminalStatus('error');
      toast.error(err.response?.data?.error || 'Error enviando cobro a la terminal');
    }
  };

  const resetMpState = () => {
    stopMpPolling();
    setMpTerminalStatus('idle');
    setMpPaymentIntentId(null);
  };

  // Crear venta (compartido entre flujo normal y terminal MP)
  const completeSaleWithMethod = async (
    method: 'EFECTIVO' | 'TARJETA' | 'MIXTO',
    paidAmount: number,
    mpIntentRef?: string
  ) => {
    setProcessing(true);
    try {
      const saleData = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discount: item.discount,
        })),
        paymentMethod: method,
        cashReceived: method === 'EFECTIVO' || method === 'MIXTO' ? parseFloat(cashReceived || '0') : undefined,
        cardAmount: method === 'TARJETA' ? paidAmount : method === 'MIXTO' ? parseFloat(cardAmount || '0') || paidAmount : undefined,
        discount: globalDiscount,
      };

      const res = await api.post('/sales', saleData);
      const ticketRes = await api.get(`/sales/${res.data.id}/ticket`);
      setTicketData(ticketRes.data);
      setShowPayment(false);
      setShowTicket(true);
      setCart([]);
      setGlobalDiscount(0);
      setCashReceived('');
      setCardAmount('');
      resetMpState();
      toast.success(`Venta ${res.data.folio} completada`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar la venta');
    } finally {
      setProcessing(false);
    }
  };

  // Productos filtrados en catálogo
  const filteredCatalog = selectedCategory
    ? catalogProducts.filter((p) => p.categoryId === selectedCategory)
    : catalogProducts;

  // Search products
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get('/products/search', { params: { q: query } });
        setSearchResults(res.data);
      } catch {
        toast.error('Error buscando productos');
      }
    }, 250);
  }, []);

  // Add to cart
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Stock máximo: ${product.stock}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? recalcItem({ ...item, quantity: item.quantity + 1 })
            : item
        );
      }
      if (product.stock <= 0) {
        toast.error('Producto agotado');
        return prev;
      }
      return [...prev, recalcItem({ product, quantity: 1, discount: 0, subtotal: 0, tax: 0, total: 0 })];
    });
    setSearchQuery('');
    setSearchResults([]);
    searchRef.current?.focus();
  };

  const recalcItem = (item: CartItem): CartItem => {
    const total = Number(item.product.salePrice) * item.quantity - item.discount;
    const taxRate = item.product.taxExempt ? 0 : Number(item.product.taxRate);
    const subtotal = Math.round((total / (1 + taxRate)) * 100) / 100;
    const tax = Math.round((total - subtotal) * 100) / 100;
    return { ...item, subtotal, tax, total: Math.round(total * 100) / 100 };
  };

  const updateQuantity = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        if (newQty > item.product.stock) {
          toast.error(`Stock máximo: ${item.product.stock}`);
          return item;
        }
        return recalcItem({ ...item, quantity: newQty });
      })
    );
  };

  const updateItemDiscount = (productId: number, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? recalcItem({ ...item, discount }) : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setGlobalDiscount(0);
    searchRef.current?.focus();
  };

  // Totals
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalTax = cart.reduce((acc, item) => acc + item.tax, 0);
  const total = subtotal + totalTax - globalDiscount;
  const changeGiven =
    paymentMethod === 'EFECTIVO'
      ? Math.max(0, parseFloat(cashReceived || '0') - total)
      : paymentMethod === 'MIXTO'
      ? Math.max(0, parseFloat(cashReceived || '0') + parseFloat(cardAmount || '0') - total)
      : 0;

  // Process sale (flujo normal: efectivo, tarjeta manual, mixto)
  const handleCompleteSale = async () => {
    if (processing) return;

    if (paymentMethod === 'EFECTIVO' && parseFloat(cashReceived || '0') < total) {
      toast.error('Monto insuficiente');
      return;
    }
    if (paymentMethod === 'MIXTO') {
      const totalPaid = parseFloat(cashReceived || '0') + parseFloat(cardAmount || '0');
      if (totalPaid < total) {
        toast.error('El pago total es insuficiente');
        return;
      }
    }

    await completeSaleWithMethod(paymentMethod as 'EFECTIVO' | 'TARJETA' | 'MIXTO', total);
  };

  // Quick cash buttons
  const quickCashAmounts = [20, 50, 100, 200, 500, 1000];

  return (
    <div className="h-screen flex flex-col lg:flex-row">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Search Bar */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por nombre, código de barras o SKU... (F2)"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="bg-white border-b shadow-lg max-h-64 overflow-y-auto z-10 relative">
            {searchResults.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-0"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    {product.sku} {product.barcode && `• ${product.barcode}`} • {product.category?.name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-bold text-lg text-primary-600">${Number(product.salePrice).toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">IVA incl.</p>
                  <p className={`text-xs ${product.stock <= product.minStock ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    Stock: {product.stock}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border-b flex">
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'cart'
                ? 'border-primary-500 text-primary-600 bg-primary-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Venta
            {cart.length > 0 && (
              <span className="ml-1 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.reduce((a, i) => a + i.quantity, 0)}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'catalog'
                ? 'border-primary-500 text-primary-600 bg-primary-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Catálogo
            <span className="ml-1 text-xs text-gray-400">(F3)</span>
          </button>
        </div>

        {/* ── TAB: CARRITO ── */}
        {activeTab === 'cart' && (
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="w-20 h-20 mb-4 opacity-30" />
                <p className="text-xl font-medium">Carrito vacío</p>
                <p className="text-sm mt-1">Busca o selecciona productos del catálogo</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  <div className="col-span-5">Producto</div>
                  <div className="col-span-2 text-center">Cant.</div>
                  <div className="col-span-2 text-right">Precio</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>
                {cart.map((item) => (
                  <div key={item.product.id} className="grid grid-cols-12 gap-2 items-center bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                    <div className="col-span-5">
                      <p className="font-medium text-sm text-gray-800 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">{item.product.sku}</p>
                      {item.discount > 0 && <p className="text-xs text-green-600">-${item.discount.toFixed(2)} desc.</p>}
                    </div>
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation">
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                        className="w-12 text-center font-bold text-lg border border-gray-200 rounded-lg py-1"
                        min="1"
                        max={item.product.stock}
                      />
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="font-medium">${Number(item.product.salePrice).toFixed(2)}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="font-bold text-primary-600">${item.total.toFixed(2)}</p>
                      {!item.product.taxExempt && <p className="text-[10px] text-gray-400">IVA inc: ${item.tax.toFixed(2)}</p>}
                    </div>
                    <div className="col-span-1 text-right">
                      <button onClick={() => removeFromCart(item.product.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: CATÁLOGO ── */}
        {activeTab === 'catalog' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filtro por categoría */}
            <div className="bg-white border-b px-3 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Grid de productos */}
            <div className="flex-1 overflow-y-auto p-3">
              {catalogLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <svg className="animate-spin w-8 h-8 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Cargando catálogo...
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <LayoutGrid className="w-12 h-12 mb-2 opacity-30" />
                  <p>Sin productos en esta categoría</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredCatalog.map((product) => {
                    const inCart = cart.find((i) => i.product.id === product.id);
                    const outOfStock = product.stock <= 0;
                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          addToCart(product);
                          setActiveTab('cart');
                        }}
                        disabled={outOfStock}
                        className={`relative flex flex-col text-left p-3 rounded-xl border-2 transition-all touch-manipulation ${
                          outOfStock
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : inCart
                            ? 'border-primary-400 bg-primary-50 hover:bg-primary-100 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Badge en carrito */}
                        {inCart && (
                          <span className="absolute top-2 right-2 bg-primary-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {inCart.quantity}
                          </span>
                        )}
                        {/* Categoría */}
                        <span className="text-[10px] text-primary-600 font-medium bg-primary-50 px-1.5 py-0.5 rounded mb-1.5 self-start truncate max-w-full">
                          {product.category?.name ?? '—'}
                        </span>
                        {/* Nombre */}
                        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 flex-1 mb-2">
                          {product.name}
                        </p>
                        {/* Precio */}
                        <p className="text-base font-bold text-primary-600">
                          ${Number(product.salePrice).toFixed(2)}
                        </p>
                        {/* Stock */}
                        <p className={`text-[10px] mt-0.5 ${
                          outOfStock ? 'text-red-500 font-semibold' :
                          product.stock <= product.minStock ? 'text-amber-500' : 'text-gray-400'
                        }`}>
                          {outOfStock ? 'Agotado' : `Stock: ${product.stock}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Right Panel - Totals & Actions */}
      <div className="w-full lg:w-96 bg-white border-l flex flex-col shadow-lg">
        {/* Totals */}
        <div className="p-5 space-y-3 border-b">
          <div className="flex justify-between text-gray-600">
            <span>Artículos:</span>
            <span className="font-medium">{cart.reduce((acc, i) => acc + i.quantity, 0)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Subtotal (s/IVA):</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>IVA (incluido):</span>
            <span className="font-medium">${totalTax.toFixed(2)}</span>
          </div>
          {globalDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Descuento:</span>
              <span className="font-medium">-${globalDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-2xl font-bold text-gray-800 pt-2 border-t">
            <span>TOTAL:</span>
            <span className="text-primary-600">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Discount input */}
        <div className="px-5 py-3 border-b">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Descuento global ($)</label>
          <input
            type="number"
            value={globalDiscount || ''}
            onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="input-field text-sm"
            min="0"
            step="0.01"
          />
        </div>

        {/* Action Buttons */}
        <div className="p-5 space-y-3 mt-auto">
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            className="btn-success w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Banknote className="w-6 h-6" />
            Cobrar (F4)
          </button>
          <button onClick={clearCart} disabled={cart.length === 0} className="btn-secondary w-full disabled:opacity-40">
            Limpiar Carrito
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Cobrar Venta</h2>
              <button onClick={() => { setShowPayment(false); resetMpState(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Total */}
              <div className="text-center py-4 bg-primary-50 rounded-xl">
                <p className="text-sm text-primary-600 font-medium">Total a cobrar</p>
                <p className="text-4xl font-bold text-primary-700">${total.toFixed(2)}</p>
              </div>

              {/* ── FLUJO TERMINAL MP ── */}
              {paymentMethod === 'TERMINAL_MP' && (
                <div>
                  {/* Estado: idle */}
                  {mpTerminalStatus === 'idle' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Smartphone className="w-4 h-4 text-primary-500" />
                          {mpDeviceId
                            ? <span>Terminal: <span className="font-mono text-xs">{mpDeviceId.slice(-12)}</span></span>
                            : <span className="text-amber-600">Sin terminal configurada</span>
                          }
                        </div>
                        <button onClick={async () => { await loadMpDevices(); setShowMpDeviceSelector(true); }}
                          className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                          <Settings className="w-3 h-3" /> Cambiar
                        </button>
                      </div>
                      <button
                        onClick={handleMpTerminalPayment}
                        className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Smartphone className="w-6 h-6" />
                        Enviar ${total.toFixed(2)} a Terminal
                      </button>
                    </div>
                  )}

                  {/* Estado: sending */}
                  {mpTerminalStatus === 'sending' && (
                    <div className="text-center py-6 space-y-3">
                      <svg className="animate-spin w-10 h-10 mx-auto text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="font-semibold text-gray-700">Enviando cobro a la terminal...</p>
                    </div>
                  )}

                  {/* Estado: waiting */}
                  {mpTerminalStatus === 'waiting' && (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                        <Smartphone className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-lg">Esperando pago en terminal</p>
                        <p className="text-sm text-gray-500 mt-1">El cliente puede pagar con tarjeta en la Point Smart 2</p>
                        <p className="text-2xl font-bold text-blue-600 mt-2">${total.toFixed(2)}</p>
                      </div>
                      <button onClick={cancelMpPayment} className="btn-secondary text-sm px-5">
                        Cancelar cobro
                      </button>
                    </div>
                  )}

                  {/* Estado: approved */}
                  {mpTerminalStatus === 'approved' && (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="font-bold text-green-700 text-lg">Pago aprobado</p>
                      <p className="text-sm text-gray-500">Registrando venta...</p>
                    </div>
                  )}

                  {/* Estado: rejected */}
                  {mpTerminalStatus === 'rejected' && (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                        <X className="w-8 h-8 text-red-600" />
                      </div>
                      <p className="font-bold text-red-700 text-lg">Pago rechazado</p>
                      <p className="text-sm text-gray-500">El pago no fue autorizado por el banco</p>
                      <button onClick={resetMpState} className="btn-primary px-6">Intentar de nuevo</button>
                    </div>
                  )}

                  {/* Estado: cancelled */}
                  {mpTerminalStatus === 'cancelled' && (
                    <div className="text-center py-6 space-y-4">
                      <p className="font-semibold text-gray-600">Cobro cancelado</p>
                      <button onClick={resetMpState} className="btn-secondary px-6">Volver</button>
                    </div>
                  )}

                  {/* Estado: error */}
                  {mpTerminalStatus === 'error' && (
                    <div className="text-center py-6 space-y-4">
                      <p className="font-bold text-red-700">Error de conexión con Mercado Pago</p>
                      <p className="text-sm text-gray-500">Verifica el Access Token en el archivo .env</p>
                      <button onClick={resetMpState} className="btn-secondary px-6">Reintentar</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── MÉTODOS DE PAGO NORMALES ── */}
              {paymentMethod !== 'TERMINAL_MP' && (
                <>
                  {/* Payment Method */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Método de pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'EFECTIVO' as const, icon: Banknote, label: 'Efectivo' },
                        { value: 'TARJETA' as const, icon: CreditCard, label: 'Tarjeta (manual)' },
                        { value: 'MIXTO' as const, icon: ArrowLeftRight, label: 'Mixto' },
                        { value: 'TERMINAL_MP' as const, icon: Smartphone, label: 'Terminal MP' },
                      ].map((method) => (
                        <button
                          key={method.value}
                          onClick={() => {
                            setPaymentMethod(method.value);
                            setCashReceived('');
                            setCardAmount('');
                            resetMpState();
                          }}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                            paymentMethod === method.value
                              ? (method.value as string) === 'TERMINAL_MP'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <method.icon className="w-5 h-5" />
                          <span className="text-sm font-medium">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Input */}
                  {(paymentMethod === 'EFECTIVO' || paymentMethod === 'MIXTO') && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Efectivo recibido</label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0.00"
                        className="input-field text-2xl font-bold text-center"
                        autoFocus
                        min="0"
                        step="0.01"
                      />
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {quickCashAmounts.map((amount) => (
                          <button key={amount} onClick={() => setCashReceived(String(amount))} className="pos-key text-base">
                            ${amount}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setCashReceived(String(Math.ceil(total)))} className="w-full mt-2 pos-key bg-primary-50 hover:bg-primary-100 text-primary-700 text-base">
                        Exacto (${Math.ceil(total)})
                      </button>
                    </div>
                  )}

                  {/* Card Amount (for mixed) */}
                  {paymentMethod === 'MIXTO' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Monto con tarjeta</label>
                      <input type="number" value={cardAmount} onChange={(e) => setCardAmount(e.target.value)}
                        placeholder="0.00" className="input-field text-xl font-bold text-center" min="0" step="0.01" />
                    </div>
                  )}

                  {/* Change */}
                  {paymentMethod !== 'TARJETA' && parseFloat(cashReceived || '0') > 0 && (
                    <div className={`text-center py-3 rounded-xl ${changeGiven >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-sm font-medium text-gray-600">Cambio</p>
                      <p className={`text-3xl font-bold ${changeGiven >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${changeGiven.toFixed(2)}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Selector de dispositivo MP */}
              {showMpDeviceSelector && (
                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
                  <p className="text-sm font-semibold text-blue-800">Terminales en tu cuenta MP:</p>
                  {mpDevices.length === 0 ? (
                    <p className="text-sm text-blue-600">No se encontraron terminales. Verifica el Access Token en .env</p>
                  ) : (
                    mpDevices.map((d) => {
                      const isPdv = d.operating_mode === 'PDV';
                      return (
                        <div key={d.id} className="bg-white border border-blue-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-blue-500" /> Point Smart 2
                              </p>
                              <p className="text-[11px] font-mono text-gray-500 mt-0.5 break-all">{d.id}</p>
                              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPdv ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {isPdv ? 'PDV ✓' : d.operating_mode ?? 'STANDALONE'}
                              </span>
                            </div>
                          </div>
                          {!isPdv && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
                              <p className="font-semibold mb-1">La terminal no está en modo PDV</p>
                              <p>Para integrarla con este sistema debes activar el modo PDV:</p>
                              <button
                                onClick={() => activatePdv(d.id)}
                                className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                              >
                                Activar modo PDV en esta terminal
                              </button>
                              <p className="mt-1 text-amber-600">Después reinicia la terminal y verifica en:<br/>
                                <span className="font-mono">Más opciones → Ajustes → Modo de vinculación</span>
                              </p>
                            </div>
                          )}
                          {isPdv && (
                            <button
                              onClick={() => selectMpDevice(d.id)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                            >
                              Usar esta terminal
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                  <button onClick={() => setShowMpDeviceSelector(false)} className="text-xs text-gray-500 underline">Cancelar</button>
                </div>
              )}
            </div>

            {/* Footer del modal */}
            {paymentMethod !== 'TERMINAL_MP' && (
              <div className="p-6 border-t">
                <button onClick={handleCompleteSale} disabled={processing}
                  className="btn-success w-full py-4 text-lg flex items-center justify-center gap-2">
                  {processing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Procesando...
                    </>
                  ) : (
                    <><Check className="w-6 h-6" /> Completar Venta</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Preview Modal */}
      {showTicket && ticketData && (
        <TicketPreview ticketData={ticketData} onClose={() => { setShowTicket(false); searchRef.current?.focus(); }} />
      )}
    </div>
  );
}
