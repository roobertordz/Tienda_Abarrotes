# 🏪 POS Abarrotes - Sistema Punto de Venta

Sistema completo de Punto de Venta (POS) para tiendas de abarrotes en México. Aplicación moderna, responsive y optimizada para uso táctil en tabletas y con teclado/mouse en escritorio.

## 📋 Características

### Módulos
- **Punto de Venta (Caja)** — Búsqueda por nombre/código/SKU, carrito, descuentos, cobro efectivo/tarjeta/mixto, cálculo de cambio
- **Tickets** — Generación automática, vista previa, impresión en térmicas 58mm/80mm, reimpresión
- **Inventario** — CRUD de productos, categorías, marcas, proveedores, alertas de stock bajo
- **Dashboard** — Ventas del día/semana/mes, productos más vendidos, utilidad, gráficas interactivas
- **Reportes** — Por día/semana/mes/producto/categoría, exportación a Excel
- **Usuarios** — Roles (Admin/Cajero/Supervisor), bitácora de actividades, control de permisos

### Catálogo Precargado
- **150+ productos reales** de marcas mexicanas (Coca-Cola, Pepsi, Lala, Bimbo, Marinela, Sabritas, Barcel, y más)
- 24 categorías, 50 marcas, 6 proveedores

---

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express |
| Base de Datos | PostgreSQL 16 |
| ORM | Prisma |
| Autenticación | JWT |
| Gráficas | Recharts |
| Iconos | Lucide React |
| Notificaciones | React Hot Toast |
| Exportación | SheetJS (xlsx) |

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- **Node.js** 18+ (recomendado 20 LTS)
- **PostgreSQL** 16+ (o Docker)
- **npm** 9+

### Opción 1: Instalación Local

#### 1. Clonar e instalar dependencias
```bash
cd pos-abarrotes
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

#### 2. Configurar base de datos

Crear una base de datos PostgreSQL:
```sql
CREATE DATABASE pos_abarrotes;
CREATE USER pos_user WITH PASSWORD 'pos_password';
GRANT ALL PRIVILEGES ON DATABASE pos_abarrotes TO pos_user;
```

Editar `backend/.env` con tus credenciales si es necesario.

#### 3. Ejecutar migraciones y seed
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

#### 4. Iniciar la aplicación
```bash
# Desde la raíz del proyecto
npm run dev
```

Esto iniciará:
- **Backend** en `http://localhost:3001`
- **Frontend** en `http://localhost:5173`

### Opción 2: Docker Compose

```bash
docker compose up -d
```

La aplicación estará disponible en `http://localhost`.

### Opción 3: Ejecutable de escritorio (Windows / Mac)

También existe una versión de escritorio (Electron) que no requiere instalar Node.js, PostgreSQL ni configurar nada manualmente: incluye backend, frontend y base de datos empaquetados en un solo instalador.

- **Windows**: `POS-Abarrotes-Setup-1.0.0.exe`
- **macOS (Apple Silicon)**: `POS-Abarrotes-1.0.0-arm64.dmg`
- **macOS (Intel)**: `POS-Abarrotes-1.0.0-x64.dmg`

Pasos:
1. Descarga el instalador correspondiente a tu sistema operativo (sección [Releases](https://github.com/roobertordz/Tienda_Abarrotes/releases) del repositorio, o generado localmente).
2. Ejecuta el instalador:
   - **Windows**: doble clic en el `.exe` y sigue el asistente.
   - **Mac**: abre el `.dmg` y arrastra la app a la carpeta `Aplicaciones`. Si macOS bloquea la app por venir de un desarrollador no identificado, ve a `Preferencias del Sistema → Privacidad y Seguridad` y presiona "Abrir de todas formas".
3. Abre la aplicación **POS Abarrotes** desde el menú de inicio (Windows) o Launchpad (Mac). No necesitas conexión a internet ni servicios externos: todo corre localmente.

> Los instaladores no se incluyen dentro del repositorio (pesan varios cientos de MB), pero puedes generarlos tú mismo con:
> ```bash
> bash scripts/build-electron.sh          # empaqueta para tu plataforma actual
> bash scripts/build-electron.sh --mac    # solo Mac (.dmg)
> bash scripts/build-electron.sh --win    # solo Windows (.exe), requiere ejecutarse en Windows
> ```
> El resultado se genera en `electron/dist-installers/`.

---

## 🔐 Credenciales de Prueba

| Rol | Usuario | Contraseña | Acceso |
|-----|---------|------------|--------|
| Administrador | `admin` | `admin123` | Total |
| Cajero | `cajero1` | `cajero123` | Solo ventas |
| Cajero | `cajero2` | `cajero123` | Solo ventas |
| Supervisor | `supervisor` | `super123` | Ventas + Reportes |

---

## 📐 Arquitectura

```
pos-abarrotes/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Esquema de BD (12 tablas)
│   │   └── seed.ts              # 150+ productos precargados
│   └── src/
│       ├── config/index.ts      # Configuración central
│       ├── middleware/auth.ts   # JWT + RBAC
│       ├── routes/
│       │   ├── auth.ts          # Login, sesión
│       │   ├── products.ts      # CRUD productos
│       │   ├── sales.ts         # Crear/listar ventas
│       │   ├── categories.ts    # Categorías
│       │   ├── brands.ts        # Marcas
│       │   ├── suppliers.ts     # Proveedores
│       │   ├── dashboard.ts     # KPIs y métricas
│       │   ├── reports.ts       # Reportes analíticos
│       │   ├── users.ts         # Gestión de usuarios
│       │   └── inventory.ts     # Movimientos de inventario
│       └── index.ts             # Servidor Express
├── frontend/
│   └── src/
│       ├── api/client.ts        # Axios configurado
│       ├── contexts/AuthContext  # Autenticación
│       ├── components/
│       │   ├── Layout.tsx       # Layout principal
│       │   ├── Sidebar.tsx      # Menú lateral
│       │   └── ProtectedRoute   # Guardia de rutas
│       └── pages/
│           ├── Login.tsx        # Inicio de sesión
│           ├── POS.tsx          # Punto de venta
│           ├── TicketPreview    # Vista de ticket
│           ├── Inventory.tsx    # Inventario
│           ├── ProductForm.tsx  # Alta/edición productos
│           ├── Dashboard.tsx    # Dashboard KPIs
│           ├── Reports.tsx      # Reportes
│           └── Users.tsx        # Usuarios
└── docker-compose.yml
```

---

## 🗄 Diagrama Entidad-Relación

```mermaid
erDiagram
    users ||--o{ sales : "realiza"
    users ||--o{ activity_logs : "genera"
    
    categories ||--o{ products : "contiene"
    brands ||--o{ products : "pertenece"
    suppliers ||--o{ products : "provee"
    
    products ||--o{ sale_items : "incluido en"
    products ||--o{ inventory_movements : "tiene"
    
    sales ||--o{ sale_items : "contiene"
    sales ||--|| tickets : "genera"
    
    users {
        int id PK
        string username UK
        string email UK
        string password
        string full_name
        enum role
        boolean active
        datetime last_login
    }
    
    products {
        int id PK
        string name
        string sku UK
        string barcode UK
        decimal purchase_price
        decimal sale_price
        int stock
        int min_stock
        enum unit_of_measure
        decimal tax_rate
        boolean tax_exempt
        int category_id FK
        int brand_id FK
        int supplier_id FK
    }
    
    sales {
        int id PK
        string folio UK
        decimal subtotal
        decimal tax_amount
        decimal discount
        decimal total
        enum payment_method
        decimal cash_received
        decimal card_amount
        decimal change_given
        string status
        int user_id FK
    }
    
    sale_items {
        int id PK
        int quantity
        decimal unit_price
        decimal discount
        decimal tax_rate
        decimal tax_amount
        decimal subtotal
        decimal total
        int sale_id FK
        int product_id FK
    }
    
    tickets {
        int id PK
        int sale_id FK UK
        text ticket_data
        boolean printed
        int print_count
    }
    
    categories {
        int id PK
        string name UK
        boolean active
    }
    
    brands {
        int id PK
        string name UK
        boolean active
    }
    
    suppliers {
        int id PK
        string name
        string contact_name
        string phone
        string email
    }
    
    inventory_movements {
        int id PK
        int product_id FK
        string type
        int quantity
        string reference
        string notes
    }
    
    activity_logs {
        int id PK
        int user_id FK
        string action
        string description
    }
```

---

## 🔧 API REST

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Obtener usuario actual |

### Productos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Listar productos (paginado, filtros) |
| GET | `/api/products/search?q=` | Búsqueda rápida para POS |
| GET | `/api/products/low-stock` | Productos con stock bajo |
| GET | `/api/products/:id` | Detalle de producto |
| POST | `/api/products` | Crear producto |
| PUT | `/api/products/:id` | Actualizar producto |
| DELETE | `/api/products/:id` | Desactivar producto |

### Ventas
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sales` | Crear venta |
| GET | `/api/sales` | Listar ventas |
| GET | `/api/sales/:id` | Detalle de venta |
| GET | `/api/sales/:id/ticket` | Obtener ticket |

### Catálogos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST/PUT | `/api/categories` | Categorías |
| GET/POST/PUT | `/api/brands` | Marcas |
| GET/POST/PUT | `/api/suppliers` | Proveedores |

### Dashboard y Reportes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard` | KPIs y métricas |
| GET | `/api/reports/sales` | Reporte de ventas |
| GET | `/api/reports/products` | Reporte por producto |
| GET | `/api/reports/categories` | Reporte por categoría |
| GET | `/api/reports/inventory` | Reporte de inventario |

### Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/users` | Listar usuarios |
| POST | `/api/users` | Crear usuario |
| PUT | `/api/users/:id` | Actualizar usuario |
| GET | `/api/users/activity-log` | Bitácora |

### Inventario
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/inventory/adjust` | Ajustar inventario |
| GET | `/api/inventory/movements` | Movimientos |

---

## ⌨️ Atajos de Teclado (POS)

| Tecla | Acción |
|-------|--------|
| `F2` | Enfocar búsqueda de productos |
| `F4` | Abrir modal de cobro |
| `Esc` | Cerrar modales |

---

## 📱 Compatibilidad

- ✅ Chrome, Firefox, Safari, Edge (últimas 2 versiones)
- ✅ Windows, macOS, Linux
- ✅ iPad y tabletas Android (diseño táctil optimizado)
- ✅ Impresoras térmicas 58mm y 80mm

---

## 🏗 Despliegue en Producción

1. Configurar variables de entorno en `backend/.env`:
   - Cambiar `JWT_SECRET` por una clave segura
   - Configurar `DATABASE_URL` con credenciales de producción
   - Ajustar datos de la tienda

2. Build y despliegue:
```bash
# Con Docker
docker compose -f docker-compose.yml up -d --build

# Sin Docker
cd backend && npm run build && npm start
cd frontend && npm run build
# Servir frontend/dist con Nginx
```

---

## 📜 Licencia

Desarrollado para uso interno de tiendas de abarrotes en México.
