'use strict';

const { app, BrowserWindow, dialog } = require('electron');
const path   = require('path');
const { spawn, execFileSync } = require('child_process');
const http   = require('http');
const fs     = require('fs');
const crypto = require('crypto');

let mainWindow   = null;
let serverProcess = null;
let serverStderr  = '';
const SERVER_PORT = 3001;

// ─── Rutas ─────────────────────────────────────────────────────────────────────

/** Directorio raíz de la app (tanto en dev como en producción). */
function getAppDir() {
  return app.isPackaged ? app.getAppPath() : __dirname;
}

/** Ruta al archivo de base de datos SQLite en los datos del usuario. */
function getDbPath() {
  const userData = app.getPath('userData');
  fs.mkdirSync(userData, { recursive: true });
  return path.join(userData, 'pos.db');
}

// ─── Seguridad ─────────────────────────────────────────────────────────────────

/** Lee o genera una clave JWT persistida en userData. */
function getOrCreateJwtSecret() {
  const cfgPath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.jwtSecret && cfg.jwtSecret.length >= 32) return cfg.jwtSecret;
    }
  } catch (_) { /* archivo corrupto, regenerar */ }

  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(cfgPath, JSON.stringify({ jwtSecret: secret }, null, 2));
  return secret;
}

// ─── Variables de entorno para procesos hijos ──────────────────────────────────

function buildEnv(dbPath, jwtSecret) {
  const appDir  = getAppDir();
  const envVars = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    DATABASE_URL:     `file:${dbPath}`,
    PORT:             String(SERVER_PORT),
    JWT_SECRET:       jwtSecret,
    JWT_EXPIRES_IN:   '8h',
    NODE_ENV:         'production',
    STORE_NAME:       process.env.STORE_NAME    || 'Mi Tienda de Abarrotes',
    STORE_ADDRESS:    process.env.STORE_ADDRESS || 'Dirección de la tienda',
    STORE_RFC:        process.env.STORE_RFC     || 'XAXX010101000',
    STORE_PHONE:      process.env.STORE_PHONE   || '55-0000-0000',
    FRONTEND_DIST_PATH: path.join(appDir, 'frontend-dist'),
  };
  return envVars;
}

// ─── Base de datos ─────────────────────────────────────────────────────────────

/** Aplica el esquema SQLite usando prisma db push (sin migraciones). */
function initDatabase(dbPath, jwtSecret) {
  const appDir    = getAppDir();
  const prismaCLI = path.join(appDir, 'node_modules', 'prisma', 'build', 'index.js');
  const schema    = path.join(appDir, 'prisma', 'schema.prisma');

  if (!fs.existsSync(prismaCLI)) {
    throw new Error(`No se encontró prisma CLI en:\n${prismaCLI}`);
  }

  console.log('[pos] Inicializando base de datos...');
  execFileSync(
    process.execPath,
    [prismaCLI, 'db', 'push', '--schema', schema, '--skip-generate', '--accept-data-loss'],
    { env: buildEnv(dbPath, jwtSecret), timeout: 30_000, stdio: 'pipe' }
  );
  console.log('[pos] Base de datos lista');
}

/** Carga datos iniciales (usuarios, categorías, productos) si la BD está vacía. */
function seedIfNeeded(dbPath, jwtSecret) {
  const flagPath   = path.join(app.getPath('userData'), '.seeded');
  if (fs.existsSync(flagPath)) return;

  const appDir     = getAppDir();
  const seedScript = path.join(appDir, 'prisma', 'seed.js');
  if (!fs.existsSync(seedScript)) {
    console.warn('[pos] seed.js no encontrado, omitiendo seed inicial');
    return;
  }

  console.log('[pos] Cargando datos iniciales...');
  execFileSync(
    process.execPath,
    [seedScript],
    { env: buildEnv(dbPath, jwtSecret), timeout: 60_000, stdio: 'pipe' }
  );

  fs.writeFileSync(flagPath, new Date().toISOString());
  console.log('[pos] Datos iniciales cargados');
}

// ─── Servidor Express ──────────────────────────────────────────────────────────

function startServer(dbPath, jwtSecret) {
  const appDir       = getAppDir();
  const backendEntry = path.join(appDir, 'backend-dist', 'index.js');

  if (!fs.existsSync(backendEntry)) {
    throw new Error(
      `No se encontró el servidor en:\n${backendEntry}\n\n` +
      'Ejecuta el script de build antes de iniciar la app.'
    );
  }

  serverProcess = spawn(process.execPath, [backendEntry], {
    env:   buildEnv(dbPath, jwtSecret),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverStderr = '';
  serverProcess.stdout.on('data', d => process.stdout.write('[servidor] ' + d));
  serverProcess.stderr.on('data', d => {
    process.stderr.write('[servidor:err] ' + d);
    serverStderr += d.toString();
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0 && mainWindow) {
      dialog.showErrorBox(
        'Error del servidor POS',
        `El servidor se detuvo inesperadamente (código ${code}).\n${serverStderr.slice(-600) || 'Reinicia la aplicación.'}`
      );
    }
  });
}

/** Espera hasta que el servidor responda en /api/health. */
function waitForServer(retries = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      // Si el proceso ya murió, falla inmediatamente con el error real
      if (serverProcess && serverProcess.exitCode !== null && serverProcess.exitCode !== 0) {
        const detail = serverStderr ? `\n\nDetalle del error:\n${serverStderr.slice(-800)}` : '';
        reject(new Error(`El servidor no pudo iniciarse.${detail}`));
        return;
      }

      const req = http.get(
        `http://127.0.0.1:${SERVER_PORT}/api/health`,
        (res) => { if (res.statusCode === 200) resolve(); else retry(); }
      );
      req.on('error', retry);
      req.setTimeout(2000, () => { req.destroy(); retry(); });
    };

    const retry = () => {
      if (++attempts >= retries) {
        const detail = serverStderr ? `\n\nDetalle del error:\n${serverStderr.slice(-800)}` : '';
        reject(new Error(`El servidor no respondió tras ${retries} intentos.${detail}`));
      } else {
        setTimeout(check, 800);
      }
    };

    check();
  });
}

// ─── Ventanas ──────────────────────────────────────────────────────────────────

function createSplash() {
  const win = new BrowserWindow({
    width:     420,
    height:    280,
    frame:     false,
    resizable: false,
    center:    true,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const htmlPath = path.join(getAppDir(), 'loading.html');
  if (fs.existsSync(htmlPath)) {
    win.loadFile(htmlPath);
  } else {
    win.loadURL(
      'data:text/html,' +
      '<body style="margin:0;background:#0f172a;color:#f1f5f9;display:flex;' +
      'align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:20px">' +
      'Iniciando POS Abarrotes…</body>'
    );
  }
  return win;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width:    1280,
    height:   800,
    minWidth: 1024,
    minHeight: 600,
    title:    'POS Abarrotes',
    show:     false,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Ciclo de vida ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const dbPath    = getDbPath();
  const jwtSecret = getOrCreateJwtSecret();
  const splash    = createSplash();

  try {
    initDatabase(dbPath, jwtSecret);
    seedIfNeeded(dbPath, jwtSecret);
    startServer(dbPath, jwtSecret);
    await waitForServer();

    createMainWindow();
    splash.close();

  } catch (err) {
    splash.close();
    dialog.showErrorBox('Error al iniciar POS Abarrotes', String(err.message || err));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // En Windows/Linux, cerrar todas las ventanas cierra la app
  if (process.platform !== 'darwin') {
    if (serverProcess) { serverProcess.kill(); serverProcess = null; }
    app.quit();
  }
});

app.on('activate', () => {
  // En Mac, recrear la ventana al hacer clic en el dock
  if (!mainWindow) {
    waitForServer(5)
      .then(createMainWindow)
      .catch(() => {
        const dbPath    = getDbPath();
        const jwtSecret = getOrCreateJwtSecret();
        startServer(dbPath, jwtSecret);
        waitForServer().then(createMainWindow);
      });
  }
});

app.on('will-quit', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
});
