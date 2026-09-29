import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users
router.get('/', authMiddleware, authorize('ADMIN'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, fullName: true, role: true, active: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/users
router.post('/', authMiddleware, authorize('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, fullName, role } = req.body;
    if (!username || !email || !password || !fullName) {
      res.status(400).json({ error: 'Todos los campos son requeridos' });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword, fullName, role: role || 'CAJERO' },
      select: { id: true, username: true, email: true, fullName: true, role: true, active: true },
    });

    await prisma.activityLog.create({
      data: { userId: req.user!.userId, action: 'CREATE_USER', description: `Usuario creado: ${username}` },
    });

    res.status(201).json(user);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ error: 'El usuario o email ya existe' }); return; }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/users/:id
router.put('/:id', authMiddleware, authorize('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { password, ...data } = req.body;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, fullName: true, role: true, active: true },
    });
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ error: 'El usuario o email ya existe' }); return; }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/users/activity-log
router.get('/activity-log', authMiddleware, authorize('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        include: { user: { select: { fullName: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.activityLog.count(),
    ]);

    res.json({ data: logs, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
