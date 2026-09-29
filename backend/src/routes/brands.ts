import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const brands = await prisma.brand.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return; }
    const brand = await prisma.brand.create({ data: { name } });
    res.status(201).json(brand);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ error: 'La marca ya existe' }); return; }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const brand = await prisma.brand.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
