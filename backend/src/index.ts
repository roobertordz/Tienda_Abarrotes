import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import salesRoutes from './routes/sales';
import categoryRoutes from './routes/categories';
import brandRoutes from './routes/brands';
import supplierRoutes from './routes/suppliers';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';
import userRoutes from './routes/users';
import inventoryRoutes from './routes/inventory';
import mpRoutes from './routes/mercadopago';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/mp', mpRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve uploads
app.use('/uploads', express.static('uploads'));

// Serve frontend (modo Electron / standalone — activado con FRONTEND_DIST_PATH)
const frontendDistPath = process.env.FRONTEND_DIST_PATH;
if (frontendDistPath && fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  // SPA fallback: cualquier ruta no-API entrega index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Servidor POS iniciado en puerto ${config.port}`);
  console.log(`📋 API disponible en http://localhost:${config.port}/api`);
  console.log(`🌐 Accesible desde red local (reemplaza IP_LOCAL por tu IP)`);
  console.log(`   http://IP_LOCAL:${config.port}/api`);
});

export default app;
