import React from 'react';
import { TicketData } from '../types';
import { Printer, X, Download } from 'lucide-react';

interface Props {
  ticketData: TicketData;
  onClose: () => void;
}

export default function TicketPreview({ ticketData, onClose }: Props) {
  const { store, sale } = ticketData;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
      ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handlePrint = () => window.print();

  const payMethodLabel: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    MIXTO: 'Mixto (Efectivo + Tarjeta)',
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">Ticket de Venta</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-primary py-2 px-4 text-sm flex items-center gap-1">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ticket Content */}
        <div className="overflow-y-auto p-4">
          <div className="ticket-print bg-white font-mono text-sm mx-auto" style={{ maxWidth: '80mm' }}>
            {/* Store Header */}
            <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
              <h2 className="font-bold text-base">{store.name}</h2>
              <p className="text-xs text-gray-600">{store.address}</p>
              <p className="text-xs text-gray-600">RFC: {store.rfc}</p>
              <p className="text-xs text-gray-600">Tel: {store.phone}</p>
            </div>

            {/* Sale Info */}
            <div className="border-b border-dashed border-gray-300 pb-2 mb-2 text-xs">
              <div className="flex justify-between">
                <span>Folio:</span>
                <span className="font-bold">{sale.folio}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>{formatDate(sale.date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cajero:</span>
                <span>{sale.cashier}</span>
              </div>
            </div>

            {/* Items */}
            <div className="border-b border-dashed border-gray-300 pb-2 mb-2">
              <div className="text-xs font-bold flex justify-between mb-1">
                <span>PRODUCTO</span>
                <span>IMPORTE</span>
              </div>
              {sale.items.map((item, idx) => (
                <div key={idx} className="mb-1.5">
                  <p className="text-xs truncate">{item.name}</p>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{item.quantity} x ${item.unitPrice.toFixed(2)}</span>
                    <span>${item.total.toFixed(2)}</span>
                  </div>
                  {item.discount > 0 && (
                    <p className="text-xs text-green-600 text-right">Desc: -${item.discount.toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal (s/IVA):</span>
                <span>${sale.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16% inc.):</span>
                <span>${sale.tax.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento:</span>
                  <span>-${sale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-dashed border-gray-300 pt-2">
                <span>TOTAL:</span>
                <span>${sale.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="border-t border-dashed border-gray-300 mt-2 pt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Método de pago:</span>
                <span>{payMethodLabel[sale.paymentMethod] || sale.paymentMethod}</span>
              </div>
              {sale.cashReceived !== null && (
                <div className="flex justify-between">
                  <span>Efectivo:</span>
                  <span>${sale.cashReceived.toFixed(2)}</span>
                </div>
              )}
              {sale.cardAmount !== null && (
                <div className="flex justify-between">
                  <span>Tarjeta:</span>
                  <span>${sale.cardAmount.toFixed(2)}</span>
                </div>
              )}
              {sale.changeGiven > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Cambio:</span>
                  <span>${sale.changeGiven.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-4 pt-3 border-t-2 border-dashed border-gray-300">
              <p className="text-[10px] text-gray-400 mb-1">Precios incluyen IVA</p>
              <p className="text-xs text-gray-500">¡Gracias por su compra!</p>
              <p className="text-xs text-gray-400 mt-1">Vuelva pronto</p>
              <p className="text-[10px] text-gray-300 mt-2">POS Abarrotes v1.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
