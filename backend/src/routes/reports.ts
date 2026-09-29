import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/reports/sales
router.get('/sales', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, groupBy = 'day' } = req.query;

    const fromDate = from ? new Date(String(from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(String(to) + 'T23:59:59.999Z') : new Date();

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate }, status: 'COMPLETADA' },
      include: {
        items: { include: { product: { select: { name: true, sku: true, purchasePrice: true, categoryId: true } } } },
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Agrupar por período
    const grouped: Record<string, { total: number; count: number; cost: number }> = {};
    for (const sale of sales) {
      let key: string;
      const d = new Date(sale.createdAt);
      if (groupBy === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = d.toISOString().slice(0, 10);
      }

      if (!grouped[key]) grouped[key] = { total: 0, count: 0, cost: 0 };
      grouped[key].total += Number(sale.total);
      grouped[key].count += 1;
      for (const item of sale.items) {
        grouped[key].cost += Number(item.product.purchasePrice) * item.quantity;
      }
    }

    const report = Object.entries(grouped).map(([period, data]) => ({
      period,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
      cost: Math.round(data.cost * 100) / 100,
      profit: Math.round((data.total - data.cost) * 100) / 100,
    })).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      from: fromDate,
      to: toDate,
      groupBy,
      data: report,
      summary: {
        totalSales: sales.length,
        totalRevenue: Math.round(sales.reduce((acc, s) => acc + Number(s.total), 0) * 100) / 100,
        totalItems: sales.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0), 0),
      },
    });
  } catch (error) {
    console.error('Error en reporte de ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reports/products
router.get('/products', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(String(from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(String(to) + 'T23:59:59.999Z') : new Date();

    const productSales = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { createdAt: { gte: fromDate, lte: toDate }, status: 'COMPLETADA' } },
      _sum: { quantity: true, total: true, subtotal: true },
      orderBy: { _sum: { total: 'desc' } },
    });

    const report = await Promise.all(
      productSales.map(async (ps) => {
        const product = await prisma.product.findUnique({
          where: { id: ps.productId },
          include: { category: true, brand: true },
        });
        return {
          product: product?.name || 'Desconocido',
          sku: product?.sku || '',
          category: product?.category?.name || '',
          brand: product?.brand?.name || '',
          quantitySold: ps._sum.quantity,
          revenue: Number(ps._sum.total),
          cost: Number(product?.purchasePrice || 0) * (ps._sum.quantity || 0),
          profit: Number(ps._sum.total) - Number(product?.purchasePrice || 0) * (ps._sum.quantity || 0),
        };
      })
    );

    res.json({ from: fromDate, to: toDate, data: report });
  } catch (error) {
    console.error('Error en reporte de productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reports/inventory
router.get('/inventory', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { category: true, brand: true },
      orderBy: { name: 'asc' },
    });

    const report = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category.name,
      brand: p.brand.name,
      stock: p.stock,
      minStock: p.minStock,
      purchasePrice: Number(p.purchasePrice),
      salePrice: Number(p.salePrice),
      stockValue: Number(p.purchasePrice) * p.stock,
      status: p.stock === 0 ? 'AGOTADO' : p.stock <= p.minStock ? 'BAJO' : 'OK',
    }));

    const totalValue = report.reduce((acc, p) => acc + p.stockValue, 0);

    res.json({
      data: report,
      summary: {
        totalProducts: report.length,
        totalValue: Math.round(totalValue * 100) / 100,
        outOfStock: report.filter((p) => p.status === 'AGOTADO').length,
        lowStock: report.filter((p) => p.status === 'BAJO').length,
      },
    });
  } catch (error) {
    console.error('Error en reporte de inventario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reports/categories
router.get('/categories', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(String(from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(String(to) + 'T23:59:59.999Z') : new Date();

    const result = await prisma.$queryRaw<any[]>`
      SELECT c.name as category, 
             COUNT(DISTINCT s.id) as sales_count,
             SUM(si.quantity) as total_quantity,
             SUM(si.total::numeric) as total_revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ${fromDate} AND s.created_at <= ${toDate} AND s.status = 'COMPLETADA'
      GROUP BY c.name
      ORDER BY total_revenue DESC
    `;

    res.json({
      from: fromDate,
      to: toDate,
      data: result.map((r: any) => ({
        category: r.category,
        salesCount: Number(r.sales_count),
        totalQuantity: Number(r.total_quantity),
        totalRevenue: Number(r.total_revenue),
      })),
    });
  } catch (error) {
    console.error('Error en reporte por categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
