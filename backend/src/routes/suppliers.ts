import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { products: { where: { active: true }, select: { id: true, name: true, sku: true } } },
    });
    if (!supplier) { res.status(404).json({ error: 'Proveedor no encontrado' }); return; }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, contactName, phone, email, address } = req.body;
    if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return; }
    const supplier = await prisma.supplier.create({ data: { name, contactName, phone, email, address } });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const supplier = await prisma.supplier.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
