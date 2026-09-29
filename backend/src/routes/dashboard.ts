import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dashboard
router.get('/', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ventas del día
    const salesToday = await prisma.sale.aggregate({
      where: { createdAt: { gte: todayStart }, status: 'COMPLETADA' },
      _sum: { total: true, discount: true },
      _count: true,
    });

    // Ventas de la semana
    const salesWeek = await prisma.sale.aggregate({
      where: { createdAt: { gte: weekStart }, status: 'COMPLETADA' },
      _sum: { total: true },
      _count: true,
    });

    // Ventas del mes
    const salesMonth = await prisma.sale.aggregate({
      where: { createdAt: { gte: monthStart }, status: 'COMPLETADA' },
      _sum: { total: true },
      _count: true,
    });

    // Productos más vendidos (top 10)
    const topProducts = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { createdAt: { gte: monthStart }, status: 'COMPLETADA' } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const topProductsWithNames = await Promise.all(
      topProducts.map(async (tp) => {
        const product = await prisma.product.findUnique({
          where: { id: tp.productId },
          select: { name: true, sku: true },
        });
        return {
          productId: tp.productId,
          name: product?.name || 'Desconocido',
          sku: product?.sku || '',
          totalQuantity: tp._sum.quantity,
          totalRevenue: tp._sum.total,
        };
      })
    );

    // Productos con bajo stock
    const lowStockProducts = await prisma.$queryRaw<any[]>`
      SELECT id, name, sku, stock, min_stock
      FROM products
      WHERE active = true AND stock <= min_stock
      ORDER BY stock ASC
      LIMIT 15
    `;

    // Utilidad estimada del mes
    const salesThisMonth = await prisma.sale.findMany({
      where: { createdAt: { gte: monthStart }, status: 'COMPLETADA' },
      include: { items: { include: { product: { select: { purchasePrice: true } } } } },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    for (const sale of salesThisMonth) {
      totalRevenue += Number(sale.total);
      for (const item of sale.items) {
        totalCost += Number(item.product.purchasePrice) * item.quantity;
      }
    }

    // Ventas por día de la semana actual
    const salesByDay: { date: string; total: number; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const daySales = await prisma.sale.aggregate({
        where: { createdAt: { gte: dayStart, lt: dayEnd }, status: 'COMPLETADA' },
        _sum: { total: true },
        _count: true,
      });

      salesByDay.push({
        date: dayStart.toISOString().slice(0, 10),
        total: Number(daySales._sum.total || 0),
        count: daySales._count,
      });
    }

    // Ventas por categoría
    const salesByCategory = await prisma.$queryRaw<any[]>`
      SELECT c.name as category, SUM(si.total::numeric) as total, SUM(si.quantity) as quantity
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ${monthStart} AND s.status = 'COMPLETADA'
      GROUP BY c.name
      ORDER BY total DESC
      LIMIT 10
    `;

    res.json({
      today: {
        total: Number(salesToday._sum.total || 0),
        count: salesToday._count,
        discount: Number(salesToday._sum.discount || 0),
      },
      week: {
        total: Number(salesWeek._sum.total || 0),
        count: salesWeek._count,
      },
      month: {
        total: Number(salesMonth._sum.total || 0),
        count: salesMonth._count,
      },
      profit: {
        revenue: Math.round(totalRevenue * 100) / 100,
        cost: Math.round(totalCost * 100) / 100,
        profit: Math.round((totalRevenue - totalCost) * 100) / 100,
        margin: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 10000) / 100 : 0,
      },
      topProducts: topProductsWithNames,
      lowStockProducts,
      salesByDay,
      salesByCategory: salesByCategory.map((s: any) => ({
        category: s.category,
        total: Number(s.total),
        quantity: Number(s.quantity),
      })),
    });
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
