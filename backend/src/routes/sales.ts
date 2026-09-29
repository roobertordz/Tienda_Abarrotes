import { Router, Request, Response } from 'express';
import { PrismaClient, PaymentMethod } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { config } from '../config';

const router = Router();
const prisma = new PrismaClient();

// Generar folio único
function generateFolio(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `V${date}${time}${random}`;
}

// POST /api/sales - Crear venta
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, paymentMethod, cashReceived, cardAmount, discount = 0 } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ error: 'La venta debe tener al menos un producto' });
      return;
    }

    if (!paymentMethod) {
      res.status(400).json({ error: 'Método de pago requerido' });
      return;
    }

    // Validar stock y calcular totales
    let subtotal = 0;
    let totalTax = 0;
    const saleItems: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        res.status(400).json({ error: `Producto con ID ${item.productId} no encontrado` });
        return;
      }
      if (!product.active) {
        res.status(400).json({ error: `Producto ${product.name} está inactivo` });
        return;
      }
      if (product.stock < item.quantity) {
        res.status(400).json({ error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` });
        return;
      }

      const unitPrice = Number(product.salePrice); // precio con IVA incluido
      const itemDiscount = item.discount || 0;
      const itemTotal = Math.round(((unitPrice * item.quantity) - itemDiscount) * 100) / 100;
      const taxRate = product.taxExempt ? 0 : Number(product.taxRate);
      const itemSubtotal = Math.round((itemTotal / (1 + taxRate)) * 100) / 100;
      const itemTax = Math.round((itemTotal - itemSubtotal) * 100) / 100;

      subtotal += itemSubtotal;
      totalTax += itemTax;

      saleItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        discount: itemDiscount,
        taxRate,
        taxAmount: itemTax,
        subtotal: itemSubtotal,
        total: itemTotal,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;
    const total = Math.round((subtotal + totalTax - discount) * 100) / 100;

    // Validar pago
    let changeGiven = 0;
    if (paymentMethod === 'EFECTIVO') {
      if (!cashReceived || cashReceived < total) {
        res.status(400).json({ error: 'Monto en efectivo insuficiente' });
        return;
      }
      changeGiven = Math.round((cashReceived - total) * 100) / 100;
    } else if (paymentMethod === 'MIXTO') {
      const totalPaid = (cashReceived || 0) + (cardAmount || 0);
      if (totalPaid < total) {
        res.status(400).json({ error: 'El pago total es insuficiente' });
        return;
      }
      changeGiven = Math.round((totalPaid - total) * 100) / 100;
    }

    const folio = generateFolio();

    // Crear venta en transacción
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          folio,
          subtotal,
          taxAmount: totalTax,
          discount,
          total,
          paymentMethod: paymentMethod as PaymentMethod,
          cashReceived: cashReceived || null,
          cardAmount: cardAmount || null,
          changeGiven,
          userId: req.user!.userId,
          items: { create: saleItems },
        },
        include: {
          items: { include: { product: true } },
          user: { select: { fullName: true } },
        },
      });

      // Actualizar stock y crear movimientos de inventario
      for (const item of saleItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'VENTA',
            quantity: -item.quantity,
            reference: folio,
            notes: `Venta ${folio}`,
          },
        });
      }

      // Generar ticket
      const ticketData = JSON.stringify({
        store: config.store,
        sale: {
          folio: newSale.folio,
          date: newSale.createdAt,
          cashier: newSale.user.fullName,
          items: newSale.items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            discount: Number(i.discount),
            subtotal: Number(i.subtotal),
            tax: Number(i.taxAmount),
            total: Number(i.total),
          })),
          subtotal: Number(newSale.subtotal),
          tax: Number(newSale.taxAmount),
          discount: Number(newSale.discount),
          total: Number(newSale.total),
          paymentMethod: newSale.paymentMethod,
          cashReceived: newSale.cashReceived ? Number(newSale.cashReceived) : null,
          cardAmount: newSale.cardAmount ? Number(newSale.cardAmount) : null,
          changeGiven: Number(newSale.changeGiven),
        },
      });

      await tx.ticket.create({
        data: { saleId: newSale.id, ticketData },
      });

      return newSale;
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_SALE',
        description: `Venta creada: ${folio} - Total: $${total}`,
      },
    });

    res.status(201).json(sale);
  } catch (error) {
    console.error('Error creando venta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/sales - Listar ventas
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to) + 'T23:59:59.999Z');
    }

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          user: { select: { fullName: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      data: sales,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Error listando ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/sales/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { fullName: true } },
        items: { include: { product: true } },
        ticket: true,
      },
    });

    if (!sale) {
      res.status(404).json({ error: 'Venta no encontrada' });
      return;
    }

    res.json(sale);
  } catch (error) {
    console.error('Error obteniendo venta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/sales/:id/ticket
router.get('/:id/ticket', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: { saleId: parseInt(req.params.id) },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket no encontrado' });
      return;
    }

    // Incrementar contador de impresión
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { printed: true, printCount: { increment: 1 } },
    });

    res.json(JSON.parse(ticket.ticketData));
  } catch (error) {
    console.error('Error obteniendo ticket:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
