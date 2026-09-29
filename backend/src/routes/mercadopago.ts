import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const MP_POINT_BASE     = 'https://api.mercadopago.com/point/integration-api';
const MP_TERMINALS_BASE = 'https://api.mercadopago.com/terminals/v1';

function mpHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'x-idempotency-key': `pos-${Date.now()}`,
  };
}

function requireToken(res: Response): boolean {
  if (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN === 'TU_ACCESS_TOKEN_AQUI') {
    res.status(400).json({ error: 'MP_ACCESS_TOKEN no configurado en el archivo .env' });
    return false;
  }
  return true;
}

// GET /api/mp/devices
router.get('/devices', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!requireToken(res)) return;
  try {
    const r = await fetch(`${MP_TERMINALS_BASE}/list?limit=50&offset=0`, { headers: mpHeaders() });
    const data: any = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: data?.message || 'Error consultando terminales MP', raw: data });
      return;
    }
    const terminals = data?.data?.terminals ?? data?.terminals ?? [];
    res.json({ devices: terminals });
  } catch {
    res.status(500).json({ error: 'No se pudo conectar con Mercado Pago' });
  }
});

// PATCH /api/mp/activate-pdv
router.patch('/activate-pdv', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!requireToken(res)) return;
  try {
    const { terminalId } = req.body;
    if (!terminalId) { res.status(400).json({ error: 'terminalId es requerido' }); return; }
    const r = await fetch(`${MP_TERMINALS_BASE}/setup`, {
      method: 'PATCH',
      headers: mpHeaders(),
      body: JSON.stringify({ terminals: [{ id: terminalId, operating_mode: 'PDV' }] }),
    });
    const data: any = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: data?.message || 'Error activando PDV', raw: data }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: 'No se pudo conectar con Mercado Pago' });
  }
});

// POST /api/mp/payment-intent
router.post('/payment-intent', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!requireToken(res)) return;
  try {
    const { deviceId, amount, description } = req.body;
    if (!deviceId || !amount) { res.status(400).json({ error: 'deviceId y amount son requeridos' }); return; }
    if (typeof amount !== 'number' || amount <= 0) { res.status(400).json({ error: 'amount debe ser un número positivo' }); return; }
    // La API de Point solo acepta "amount" en centavos
    const body = {
      amount: Math.round(amount * 100),
    };
    const r = await fetch(`${MP_POINT_BASE}/devices/${encodeURIComponent(deviceId)}/payment-intents`, {
      method: 'POST', headers: mpHeaders(), body: JSON.stringify(body),
    });
    const data: any = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: data?.message || 'Error enviando cobro a la terminal' }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: 'No se pudo conectar con Mercado Pago' });
  }
});

// GET /api/mp/payment-intent/:id
router.get('/payment-intent/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!requireToken(res)) return;
  try {
    const r = await fetch(`${MP_POINT_BASE}/payment-intents/${encodeURIComponent(req.params.id)}`, { headers: mpHeaders() });
    const data: any = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: data?.message || 'Error consultando estado' }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: 'No se pudo conectar con Mercado Pago' });
  }
});

// DELETE /api/mp/payment-intent/:intentId/device/:deviceId
router.delete('/payment-intent/:intentId/device/:deviceId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!requireToken(res)) return;
  try {
    const { intentId, deviceId } = req.params;
    const r = await fetch(`${MP_POINT_BASE}/devices/${encodeURIComponent(deviceId)}/payment-intents/${encodeURIComponent(intentId)}`,
      { method: 'DELETE', headers: mpHeaders() });
    if (r.status === 204 || r.ok) { res.json({ message: 'Cobro cancelado' }); return; }
    const data: any = await r.json();
    res.status(r.status).json({ error: data?.message || 'Error cancelando cobro' });
  } catch {
    res.status(500).json({ error: 'No se pudo conectar con Mercado Pago' });
  }
});

// POST /api/mp/webhook
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  res.sendStatus(200);
  console.log('[MP Webhook]', JSON.stringify(req.body));
});

export default router;
