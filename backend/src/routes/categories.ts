import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/categories
router.get('/', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json(categories);
  } catch (error) {
    console.error('Error listando categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/categories
router.post('/', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: 'Nombre requerido' }); return; }
    const category = await prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ error: 'La categoría ya existe' }); return; }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/categories/:id
router.put('/:id', authMiddleware, authorize('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
