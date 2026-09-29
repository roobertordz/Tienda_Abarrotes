import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/inventory/adjust - Ajuste de inventario
router.post('/adjust', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, quantity, type, notes } = req.body;

    if (!productId || quantity === undefined || !type) {
      res.status(400).json({ error: 'productId, quantity y type son requeridos' });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    let newStock = product.stock;
    if (type === 'ENTRADA') {
      newStock += quantity;
    } else if (type === 'SALIDA') {
      if (product.stock < quantity) {
        res.status(400).json({ error: 'Stock insuficiente' });
        return;
      }
      newStock -= quantity;
    } else if (type === 'AJUSTE') {
      newStock = quantity;
    }

    await prisma.$transaction([
      prisma.product.update({ where: { id: productId }, data: { stock: newStock } }),
      prisma.inventoryMovement.create({
        data: {
          productId,
          type,
          quantity: type === 'SALIDA' ? -quantity : type === 'AJUSTE' ? quantity - product.stock : quantity,
          notes: notes || `Ajuste de inventario - ${type}`,
        },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'INVENTORY_ADJUST',
        description: `Ajuste de inventario: ${product.name} - ${type}: ${quantity}`,
      },
    });

    res.json({ message: 'Inventario ajustado correctamente', newStock });
  } catch (error) {
    console.error('Error ajustando inventario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/inventory/movements
router.get('/movements', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, type, from, to, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (productId) where.productId = parseInt(String(productId));
    if (type) where.type = String(type);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to) + 'T23:59:59.999Z');
    }

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    res.json({ data: movements, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
