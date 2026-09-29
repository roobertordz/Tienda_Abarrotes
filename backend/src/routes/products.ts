import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/products - Listar productos con filtros
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, brand, lowStock, page = '1', limit = '50', active } = req.query;

    const where: any = {};

    if (active !== undefined) {
      where.active = active === 'true';
    }

    if (search) {
      const searchStr = String(search);
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { sku: { contains: searchStr, mode: 'insensitive' } },
        { barcode: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    if (category) where.categoryId = parseInt(String(category));
    if (brand) where.brandId = parseInt(String(brand));
    if (lowStock === 'true') {
      where.stock = { lte: prisma.product.fields.minStock };
    }

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, brand: true, supplier: true },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error listando productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/products/search - Búsqueda rápida para POS
router.get('/search', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q) {
      res.json([]);
      return;
    }

    const searchStr = String(q);
    const products = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: searchStr, mode: 'insensitive' } },
          { sku: { contains: searchStr, mode: 'insensitive' } },
          { barcode: { equals: searchStr } },
        ],
      },
      include: { category: true, brand: true },
      take: 20,
    });

    res.json(products);
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/products/low-stock - Productos con bajo stock
router.get('/low-stock', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.$queryRaw`
      SELECT p.*, c.name as category_name, b.name as brand_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN brands b ON p.brand_id = b.id
      WHERE p.active = true AND p.stock <= p.min_stock
      ORDER BY p.stock ASC
    `;

    res.json(products);
  } catch (error) {
    console.error('Error obteniendo productos bajo stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/products/import - Importación masiva desde Excel (JSON parseado en frontend)
router.post('/import', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: Record<string, any>[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'Se requiere un array "rows" con al menos una fila' });
      return;
    }

    if (rows.length > 1000) {
      res.status(400).json({ error: 'Máximo 1000 productos por importación' });
      return;
    }

    const results = { created: 0, updated: 0, errors: [] as { row: number; sku: string; error: string }[] };

    // Cache de categorías y marcas para evitar consultas repetidas
    const categoryCache = new Map<string, number>();
    const brandCache = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 porque fila 1 es encabezado

      try {
        const sku = String(row['SKU'] ?? row['sku'] ?? '').trim();
        const name = String(row['Nombre'] ?? row['nombre'] ?? '').trim();
        const categoryName = String(row['Categoría'] ?? row['Categoria'] ?? '').trim();
        const brandName = String(row['Marca'] ?? row['marca'] ?? '').trim();
        const purchasePrice = parseFloat(String(row['Precio Compra'] ?? row['precio_compra'] ?? 0));
        const salePrice = parseFloat(String(row['Precio Venta'] ?? row['precio_venta'] ?? 0));
        const stock = parseInt(String(row['Stock'] ?? row['stock'] ?? 0));
        const minStock = parseInt(String(row['Stock Mínimo'] ?? row['Stock Minimo'] ?? row['stock_minimo'] ?? 5));
        const barcode = String(row['Código de Barras'] ?? row['Codigo de Barras'] ?? row['barcode'] ?? '').trim() || null;
        const unitOfMeasure = String(row['Unidad'] ?? row['unidad'] ?? 'PIEZA').trim().toUpperCase();

        if (!sku) { results.errors.push({ row: rowNum, sku: '—', error: 'SKU vacío' }); continue; }
        if (!name) { results.errors.push({ row: rowNum, sku, error: 'Nombre vacío' }); continue; }
        if (!categoryName) { results.errors.push({ row: rowNum, sku, error: 'Categoría vacía' }); continue; }
        if (!brandName) { results.errors.push({ row: rowNum, sku, error: 'Marca vacía' }); continue; }
        if (isNaN(salePrice) || salePrice <= 0) { results.errors.push({ row: rowNum, sku, error: 'Precio Venta inválido' }); continue; }
        if (isNaN(purchasePrice) || purchasePrice < 0) { results.errors.push({ row: rowNum, sku, error: 'Precio Compra inválido' }); continue; }

        const validUnits = ['PIEZA', 'KILOGRAMO', 'LITRO', 'METRO', 'PAQUETE', 'CAJA'];
        const unit = validUnits.includes(unitOfMeasure) ? unitOfMeasure : 'PIEZA';

        // Resolver categoría
        if (!categoryCache.has(categoryName)) {
          const cat = await prisma.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName },
          });
          categoryCache.set(categoryName, cat.id);
        }
        const categoryId = categoryCache.get(categoryName)!;

        // Resolver marca
        if (!brandCache.has(brandName)) {
          const brand = await prisma.brand.upsert({
            where: { name: brandName },
            update: {},
            create: { name: brandName },
          });
          brandCache.set(brandName, brand.id);
        }
        const brandId = brandCache.get(brandName)!;

        // Upsert por SKU
        const existing = await prisma.product.findUnique({ where: { sku } });

        if (existing) {
          await prisma.product.update({
            where: { sku },
            data: {
              name,
              barcode: barcode || existing.barcode,
              purchasePrice,
              salePrice,
              stock,
              minStock: isNaN(minStock) ? 5 : minStock,
              unitOfMeasure: unit as any,
              categoryId,
              brandId,
              active: true,
            },
          });

          if (stock !== existing.stock) {
            await prisma.inventoryMovement.create({
              data: {
                productId: existing.id,
                type: 'AJUSTE',
                quantity: stock - existing.stock,
                reference: 'Importación Excel',
                notes: `Ajuste por importación masiva`,
              },
            });
          }
          results.updated++;
        } else {
          const created = await prisma.product.create({
            data: {
              name, sku,
              barcode: barcode || null,
              purchasePrice,
              salePrice,
              stock: isNaN(stock) ? 0 : stock,
              minStock: isNaN(minStock) ? 5 : minStock,
              unitOfMeasure: unit as any,
              taxRate: 0.16,
              taxExempt: false,
              categoryId,
              brandId,
              active: true,
            },
          });

          if (stock > 0) {
            await prisma.inventoryMovement.create({
              data: {
                productId: created.id,
                type: 'ENTRADA',
                quantity: stock,
                reference: 'Importación Excel',
                notes: 'Alta por importación masiva',
              },
            });
          }
          results.created++;
        }
      } catch (rowError: any) {
        const sku = String(row['SKU'] ?? row['sku'] ?? '—').trim();
        results.errors.push({ row: rowNum, sku, error: rowError?.message ?? 'Error desconocido' });
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'IMPORT_PRODUCTS',
        description: `Importación: ${results.created} creados, ${results.updated} actualizados, ${results.errors.length} errores`,
      },
    });

    res.json(results);
  } catch (error) {
    console.error('Error en importación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/products/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { category: true, brand: true, supplier: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/products
router.post('/', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, sku, barcode, description, purchasePrice, salePrice, stock, minStock, unitOfMeasure, taxRate, taxExempt, categoryId, brandId, supplierId, imageUrl } = req.body;

    if (!name || !sku || !purchasePrice || !salePrice || !categoryId || !brandId) {
      res.status(400).json({ error: 'Campos obligatorios: name, sku, purchasePrice, salePrice, categoryId, brandId' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name, sku, barcode, description,
        purchasePrice, salePrice,
        stock: stock || 0,
        minStock: minStock || 5,
        unitOfMeasure: unitOfMeasure || 'PIEZA',
        taxRate: taxRate ?? 0.16,
        taxExempt: taxExempt || false,
        categoryId, brandId,
        supplierId: supplierId || null,
        imageUrl,
      },
      include: { category: true, brand: true },
    });

    if (stock > 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: 'ENTRADA',
          quantity: stock,
          reference: 'Inventario inicial',
          notes: 'Alta de producto',
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_PRODUCT',
        description: `Producto creado: ${name} (${sku})`,
      },
    });

    res.status(201).json(product);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'El SKU o código de barras ya existe' });
      return;
    }
    console.error('Error creando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true, brand: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_PRODUCT',
        description: `Producto actualizado: ${product.name} (${product.sku})`,
      },
    });

    res.json(product);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'El SKU o código de barras ya existe' });
      return;
    }
    console.error('Error actualizando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', authMiddleware, authorize('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const product = await prisma.product.update({
      where: { id },
      data: { active: false },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE_PRODUCT',
        description: `Producto desactivado: ${product.name} (${product.sku})`,
      },
    });

    res.json({ message: 'Producto desactivado correctamente' });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
