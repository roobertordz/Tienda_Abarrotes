#!/usr/bin/env bash
# =============================================================================
#  build-electron.sh — Genera el instalador .dmg (Mac) o .exe (Windows)
#
#  Uso:
#    bash scripts/build-electron.sh          # empaqueta para la plataforma actual
#    bash scripts/build-electron.sh --mac    # solo Mac (.dmg)
#    bash scripts/build-electron.sh --win    # solo Windows (.exe)  ← requiere Windows
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
ELECTRON_DIR="$ROOT/electron"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RESET='\033[0m'
step() { echo -e "\n${BLUE}▶ $1${RESET}"; }
ok()   { echo -e "${GREEN}  ✓ $1${RESET}"; }

echo "========================================================"
echo "   POS Abarrotes — Build Instalador Electron"
echo "========================================================"

# ─── 1. Build del frontend ────────────────────────────────────────────────────
step "[1/6] Compilando frontend (React + Vite)..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build
ok "Frontend compilado → frontend/dist/"

# ─── 2. Build del backend ─────────────────────────────────────────────────────
step "[2/6] Compilando backend (TypeScript)..."
cd "$BACKEND_DIR"
npm install --silent
npm run build
ok "Backend compilado → backend/dist/"

# ─── 3. Compilar seed.ts → seed.js ───────────────────────────────────────────
step "[3/6] Compilando script de datos iniciales..."
cd "$BACKEND_DIR"
npx tsc prisma/seed.ts \
  --module commonjs \
  --esModuleInterop \
  --target ES2022 \
  --moduleResolution node \
  --skipLibCheck \
  --outDir "$ELECTRON_DIR/prisma" 2>/dev/null || true
ok "seed.js generado → electron/prisma/seed.js"

# Prisma SQLite no soporta enums; el seed compilado usa client_1.Role.ADMIN etc.
# Reemplazamos por strings literales para que funcione en el app empaquetado.
sed -i '' \
  -e "s/client_1\.Role\.ADMIN/'ADMIN'/g" \
  -e "s/client_1\.Role\.CAJERO/'CAJERO'/g" \
  -e "s/client_1\.Role\.SUPERVISOR/'SUPERVISOR'/g" \
  -e "s/client_1\.UnitOfMeasure\.PIEZA/'PIEZA'/g" \
  -e "s/client_1\.UnitOfMeasure\.KILOGRAMO/'KILOGRAMO'/g" \
  -e "s/client_1\.UnitOfMeasure\.LITRO/'LITRO'/g" \
  -e "s/client_1\.UnitOfMeasure\.METRO/'METRO'/g" \
  -e "s/client_1\.UnitOfMeasure\.PAQUETE/'PAQUETE'/g" \
  -e "s/client_1\.UnitOfMeasure\.CAJA/'CAJA'/g" \
  -e "s/client_1\.PaymentMethod\.EFECTIVO/'EFECTIVO'/g" \
  -e "s/client_1\.PaymentMethod\.TARJETA/'TARJETA'/g" \
  -e "s/client_1\.PaymentMethod\.MIXTO/'MIXTO'/g" \
  "$ELECTRON_DIR/prisma/seed.js"
ok "seed.js: enums reemplazados por strings literales"
# SQLite no soporta createMany con skipDuplicates; el seed corre una sola vez
sed -i '' -e '/skipDuplicates/d' "$ELECTRON_DIR/prisma/seed.js"
ok "seed.js: skipDuplicates eliminado"

# ─── 4. Copiar artefactos al directorio electron/ ─────────────────────────────
step "[4/6] Copiando artefactos de build..."
rm -rf "$ELECTRON_DIR/backend-dist"
rm -rf "$ELECTRON_DIR/frontend-dist"
cp -r "$BACKEND_DIR/dist"        "$ELECTRON_DIR/backend-dist"
cp -r "$FRONTEND_DIR/dist"       "$ELECTRON_DIR/frontend-dist"
ok "Artefactos copiados a electron/"

# ─── 4b. Patches de compatibilidad SQLite en backend-dist ─────────────────────
# Prisma SQLite no soporta mode:'insensitive' ni el cast ::numeric de PostgreSQL
find "$ELECTRON_DIR/backend-dist" -name "*.js" | while read f; do
  sed -i '' \
    -e "s/, mode: 'insensitive'//g" \
    -e 's/, mode: "insensitive"//g' \
    -e "s/::numeric//g" \
    "$f"
done
ok "backend-dist: incompatibilidades SQLite corregidas (mode:insensitive, ::numeric)"

# ─── 5. Instalar dependencias Electron y generar cliente Prisma SQLite ────────
step "[5/6] Instalando dependencias de Electron y generando cliente Prisma..."
cd "$ELECTRON_DIR"
npm install --silent
npx prisma generate --schema=prisma/schema.prisma

# Prisma no soporta enums en SQLite; añadimos las constantes manualmente
# para que el código compilado del backend pueda seguir usando Role.ADMIN, etc.
node -e "
const fs = require('fs');
const clientIndex = './node_modules/@prisma/client/index.js';
let src = fs.readFileSync(clientIndex, 'utf8');
if (!src.includes('exports.Role')) {
  const shim = \`
// --- Enum shims para SQLite (generados por build-electron.sh) ---
Object.assign(exports, {
  Role:          { ADMIN: 'ADMIN', CAJERO: 'CAJERO', SUPERVISOR: 'SUPERVISOR' },
  UnitOfMeasure: { PIEZA: 'PIEZA', KILOGRAMO: 'KILOGRAMO', LITRO: 'LITRO', METRO: 'METRO', PAQUETE: 'PAQUETE', CAJA: 'CAJA' },
  PaymentMethod: { EFECTIVO: 'EFECTIVO', TARJETA: 'TARJETA', MIXTO: 'MIXTO' },
});
\`;
  fs.writeFileSync(clientIndex, src + shim);
  console.log('  ✓ Shim de enums aplicado al cliente Prisma');
}
"
ok "Dependencias instaladas y cliente Prisma generado (SQLite)"

# ─── 6. Empaquetar instalador ─────────────────────────────────────────────────
step "[6/6] Generando instalador..."
cd "$ELECTRON_DIR"

TARGET="${1:-}"
if   [[ "$TARGET" == "--mac" ]]; then
  echo "▶ Empaquetando para Mac (sin firma de código)..."
  CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
elif [[ "$TARGET" == "--win" ]]; then
  echo "  ⚠  Nota: el instalador .exe solo puede generarse en Windows."
  echo "     Puedes usar GitHub Actions o una VM con Windows."
  CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:win
else
  CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist
fi

echo ""
echo "========================================================"
echo -e "${GREEN}  ✅ Instalador generado en:${RESET}"
echo "     $ELECTRON_DIR/dist-installers/"
echo ""
echo "  📦 Mac:     POS-Abarrotes-*.dmg"
echo "  📦 Windows: POS-Abarrotes-Setup-*.exe"
echo "========================================================"
