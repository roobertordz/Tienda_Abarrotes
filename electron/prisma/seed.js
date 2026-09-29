"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');
    // ============ USUARIOS ============
    const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
    const hashedCajero = await bcryptjs_1.default.hash('cajero123', 10);
    const hashedSupervisor = await bcryptjs_1.default.hash('super123', 10);
    await prisma.user.createMany({
        data: [
            { username: 'admin', email: 'admin@abarrotes.com', password: hashedPassword, fullName: 'Administrador General', role: 'ADMIN' },
            { username: 'cajero1', email: 'cajero1@abarrotes.com', password: hashedCajero, fullName: 'María García López', role: 'CAJERO' },
            { username: 'cajero2', email: 'cajero2@abarrotes.com', password: hashedCajero, fullName: 'Juan Hernández Ruiz', role: 'CAJERO' },
            { username: 'supervisor', email: 'supervisor@abarrotes.com', password: hashedSupervisor, fullName: 'Carlos Martínez Soto', role: 'SUPERVISOR' },
        ],
    });
    console.log('✅ Usuarios creados');
    // ============ CATEGORÍAS ============
    const categoriesData = [
        'Refrescos y Bebidas', 'Lácteos', 'Pan y Bollería', 'Dulces y Chocolates',
        'Botanas y Frituras', 'Galletas', 'Agua y Jugos', 'Café y Té',
        'Cereales', 'Aceites y Vinagres', 'Granos y Semillas', 'Enlatados',
        'Limpieza del Hogar', 'Higiene Personal', 'Papel y Desechables',
        'Condimentos y Salsas', 'Harinas y Repostería', 'Carnes Frías',
        'Huevo', 'Tortillas y Tostadas', 'Bebidas Alcohólicas', 'Tabaco',
        'Frutas y Verduras', 'Congelados',
    ];
    for (const name of categoriesData) {
        await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    }
    const categories = {};
    for (const cat of await prisma.category.findMany()) {
        categories[cat.name] = cat.id;
    }
    console.log('✅ Categorías creadas');
    // ============ MARCAS ============
    const brandsData = [
        'Coca-Cola', 'Pepsi', 'Lala', 'Bimbo', 'Marinela', 'Tía Rosa',
        'Sonrics', 'Sabritas', 'Gamesa', 'Barcel', 'Bonafont', 'Ciel',
        'Epura', 'Nescafé', 'Kelloggs', 'La Costeña', 'Herdez',
        'Del Monte', 'McCormick', 'Fud', 'KIR', 'Nestlé', 'Jumex',
        'Del Valle', 'Alpura', 'Nutrileche', 'Maseca', 'Great Value',
        'Dove', 'Palmolive', 'Colgate', 'Pétalo', 'Regio', 'Suavitel',
        'Fabuloso', 'Pinol', 'Cloralex', 'Roma', 'Ariel', 'Ace',
        'Knorr', 'Maggi', 'Valentina', 'Tajín', 'La Moderna',
        'Maruchan', 'Modelo', 'Corona', 'Victoria', 'Presidente',
    ];
    for (const name of brandsData) {
        await prisma.brand.upsert({ where: { name }, update: {}, create: { name } });
    }
    const brands = {};
    for (const b of await prisma.brand.findMany()) {
        brands[b.name] = b.id;
    }
    console.log('✅ Marcas creadas');
    // ============ PROVEEDORES ============
    await prisma.supplier.createMany({
        data: [
            { name: 'FEMSA Distribución', contactName: 'Roberto Sánchez', phone: '55-9876-5432', email: 'ventas@femsa.com' },
            { name: 'Grupo Bimbo Distribución', contactName: 'Ana López', phone: '55-8765-4321', email: 'distribuidores@bimbo.com' },
            { name: 'PepsiCo México', contactName: 'Luis Torres', phone: '55-7654-3210', email: 'ventas@pepsico.com.mx' },
            { name: 'Grupo Lala', contactName: 'Marta Díaz', phone: '55-6543-2109', email: 'distribuidores@lala.com.mx' },
            { name: 'Abarrotero del Centro', contactName: 'Pedro Ramírez', phone: '55-5432-1098', email: 'pedidos@abarroterocentro.com' },
            { name: 'Central de Abastos CDMX', contactName: 'Jorge Flores', phone: '55-4321-0987', email: 'ventas@centralabastos.com' },
        ],
    });
    console.log('✅ Proveedores creados');
    const products = [
        // ---- COCA-COLA ----
        { name: 'Coca-Cola 600 ml', sku: 'CC-001', barcode: '7501055300120', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 11.0, salePrice: 18.0, stock: 120, minStock: 24, unit: 'PIEZA', taxExempt: false },
        { name: 'Coca-Cola 1 L', sku: 'CC-002', barcode: '7501055300137', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 15.0, salePrice: 24.0, stock: 80, minStock: 20, unit: 'PIEZA', taxExempt: false },
        { name: 'Coca-Cola 2 L', sku: 'CC-003', barcode: '7501055300144', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 22.0, salePrice: 35.0, stock: 60, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Coca-Cola 2.5 L', sku: 'CC-004', barcode: '7501055300151', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 25.0, salePrice: 39.0, stock: 48, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Coca-Cola 3 L', sku: 'CC-005', barcode: '7501055300168', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 28.0, salePrice: 45.0, stock: 36, minStock: 8, unit: 'PIEZA', taxExempt: false },
        { name: 'Coca-Cola Sin Azúcar 600 ml', sku: 'CC-006', barcode: '7501055300175', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 11.0, salePrice: 18.0, stock: 72, minStock: 15, unit: 'PIEZA', taxExempt: false },
        { name: 'Sprite 600 ml', sku: 'CC-007', barcode: '7501055300182', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 10.5, salePrice: 17.0, stock: 60, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Fanta Naranja 600 ml', sku: 'CC-008', barcode: '7501055300199', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 10.5, salePrice: 17.0, stock: 48, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Sidral Mundet 600 ml', sku: 'CC-009', barcode: '7501055300206', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 10.5, salePrice: 17.0, stock: 48, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Fresca 600 ml', sku: 'CC-010', barcode: '7501055300213', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 10.5, salePrice: 17.0, stock: 36, minStock: 8, unit: 'PIEZA', taxExempt: false },
        { name: 'Coca-Cola Lata 355 ml', sku: 'CC-011', barcode: '7501055300220', category: 'Refrescos y Bebidas', brand: 'Coca-Cola', purchasePrice: 9.0, salePrice: 15.0, stock: 96, minStock: 24, unit: 'PIEZA', taxExempt: false },
        // ---- PEPSI ----
        { name: 'Pepsi 600 ml', sku: 'PE-001', barcode: '7501031311309', category: 'Refrescos y Bebidas', brand: 'Pepsi', purchasePrice: 10.0, salePrice: 17.0, stock: 96, minStock: 20, unit: 'PIEZA', taxExempt: false },
        { name: 'Pepsi 2 L', sku: 'PE-002', barcode: '7501031311316', category: 'Refrescos y Bebidas', brand: 'Pepsi', purchasePrice: 20.0, salePrice: 32.0, stock: 48, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Pepsi Black 600 ml', sku: 'PE-003', barcode: '7501031311323', category: 'Refrescos y Bebidas', brand: 'Pepsi', purchasePrice: 10.0, salePrice: 17.0, stock: 60, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Mirinda Naranja 600 ml', sku: 'PE-004', barcode: '7501031311330', category: 'Refrescos y Bebidas', brand: 'Pepsi', purchasePrice: 9.5, salePrice: 16.0, stock: 48, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: '7UP 600 ml', sku: 'PE-005', barcode: '7501031311347', category: 'Refrescos y Bebidas', brand: 'Pepsi', purchasePrice: 10.0, salePrice: 17.0, stock: 60, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Manzanita Sol 600 ml', sku: 'PE-006', barcode: '7501031311354', category: 'Refrescos y Bebidas', brand: 'Pepsi', purchasePrice: 10.0, salePrice: 17.0, stock: 48, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Squirt 600 ml', sku: 'PE-007', barcode: '7501031311361', category: 'Refrescos y Bebidas', brand: 'Pepsi', purchasePrice: 10.0, salePrice: 17.0, stock: 36, minStock: 8, unit: 'PIEZA', taxExempt: false },
        // ---- LALA ----
        { name: 'Leche Lala Entera 1 L', sku: 'LA-001', barcode: '7501005102100', category: 'Lácteos', brand: 'Lala', purchasePrice: 22.0, salePrice: 29.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: true },
        { name: 'Leche Lala Light 1 L', sku: 'LA-002', barcode: '7501005102117', category: 'Lácteos', brand: 'Lala', purchasePrice: 23.0, salePrice: 30.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: true },
        { name: 'Leche Lala Deslactosada 1 L', sku: 'LA-003', barcode: '7501005102124', category: 'Lácteos', brand: 'Lala', purchasePrice: 24.0, salePrice: 32.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: true },
        { name: 'Yogurt Lala Fresa 220 g', sku: 'LA-004', barcode: '7501005102131', category: 'Lácteos', brand: 'Lala', purchasePrice: 8.0, salePrice: 14.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Yogurt Lala Natural 900 g', sku: 'LA-005', barcode: '7501005102148', category: 'Lácteos', brand: 'Lala', purchasePrice: 28.0, salePrice: 42.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Queso Oaxaca Lala 400 g', sku: 'LA-006', barcode: '7501005102155', category: 'Lácteos', brand: 'Lala', purchasePrice: 52.0, salePrice: 72.0, stock: 20, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Queso Panela Lala 400 g', sku: 'LA-007', barcode: '7501005102162', category: 'Lácteos', brand: 'Lala', purchasePrice: 48.0, salePrice: 65.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Crema Lala 450 ml', sku: 'LA-008', barcode: '7501005102179', category: 'Lácteos', brand: 'Lala', purchasePrice: 28.0, salePrice: 39.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Mantequilla Lala 90 g', sku: 'LA-009', barcode: '7501005102186', category: 'Lácteos', brand: 'Lala', purchasePrice: 18.0, salePrice: 26.0, stock: 20, minStock: 5, unit: 'PIEZA', taxExempt: true },
        // ---- ALPURA ----
        { name: 'Leche Alpura Entera 1 L', sku: 'AL-001', barcode: '7501025403100', category: 'Lácteos', brand: 'Alpura', purchasePrice: 24.0, salePrice: 32.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: true },
        { name: 'Leche Alpura Deslactosada 1 L', sku: 'AL-002', barcode: '7501025403117', category: 'Lácteos', brand: 'Alpura', purchasePrice: 25.0, salePrice: 34.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        // ---- BIMBO ----
        { name: 'Pan Blanco Bimbo Grande', sku: 'BI-001', barcode: '7441029500127', category: 'Pan y Bollería', brand: 'Bimbo', purchasePrice: 32.0, salePrice: 48.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: true },
        { name: 'Pan Blanco Bimbo Chico', sku: 'BI-002', barcode: '7441029500134', category: 'Pan y Bollería', brand: 'Bimbo', purchasePrice: 22.0, salePrice: 34.0, stock: 25, minStock: 8, unit: 'PIEZA', taxExempt: true },
        { name: 'Pan Integral Bimbo', sku: 'BI-003', barcode: '7441029500141', category: 'Pan y Bollería', brand: 'Bimbo', purchasePrice: 35.0, salePrice: 52.0, stock: 20, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Pan Tostado Bimbo', sku: 'BI-004', barcode: '7441029500158', category: 'Pan y Bollería', brand: 'Bimbo', purchasePrice: 25.0, salePrice: 38.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Roles de Canela Bimbo', sku: 'BI-005', barcode: '7441029500165', category: 'Pan y Bollería', brand: 'Bimbo', purchasePrice: 28.0, salePrice: 42.0, stock: 15, minStock: 5, unit: 'PIEZA', taxExempt: false },
        { name: 'Donas Bimbo 6 pzas', sku: 'BI-006', barcode: '7441029500172', category: 'Pan y Bollería', brand: 'Bimbo', purchasePrice: 30.0, salePrice: 45.0, stock: 15, minStock: 5, unit: 'PAQUETE', taxExempt: false },
        { name: 'Mantecadas Bimbo 4 pzas', sku: 'BI-007', barcode: '7441029500189', category: 'Pan y Bollería', brand: 'Bimbo', purchasePrice: 24.0, salePrice: 36.0, stock: 12, minStock: 4, unit: 'PAQUETE', taxExempt: false },
        { name: 'Medias Noches Bimbo 8 pzas', sku: 'BI-008', barcode: '7441029500196', category: 'Pan y Bollería', brand: 'Bimbo', purchasePrice: 32.0, salePrice: 48.0, stock: 15, minStock: 5, unit: 'PAQUETE', taxExempt: true },
        { name: 'Tortillas de Harina Bimbo 10 pzas', sku: 'BI-009', barcode: '7441029500203', category: 'Tortillas y Tostadas', brand: 'Bimbo', purchasePrice: 18.0, salePrice: 28.0, stock: 25, minStock: 8, unit: 'PAQUETE', taxExempt: true },
        // ---- MARINELA ----
        { name: 'Gansito Marinela', sku: 'MR-001', barcode: '7441029512100', category: 'Pan y Bollería', brand: 'Marinela', purchasePrice: 10.0, salePrice: 17.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: false },
        { name: 'Pingüinos Marinela 2 pzas', sku: 'MR-002', barcode: '7441029512117', category: 'Pan y Bollería', brand: 'Marinela', purchasePrice: 12.0, salePrice: 20.0, stock: 48, minStock: 12, unit: 'PAQUETE', taxExempt: false },
        { name: 'Submarinos Marinela', sku: 'MR-003', barcode: '7441029512124', category: 'Pan y Bollería', brand: 'Marinela', purchasePrice: 9.0, salePrice: 15.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Chocorroles Marinela 2 pzas', sku: 'MR-004', barcode: '7441029512131', category: 'Pan y Bollería', brand: 'Marinela', purchasePrice: 11.0, salePrice: 18.0, stock: 36, minStock: 10, unit: 'PAQUETE', taxExempt: false },
        { name: 'Barritas de Fresa Marinela', sku: 'MR-005', barcode: '7441029512148', category: 'Pan y Bollería', brand: 'Marinela', purchasePrice: 9.0, salePrice: 15.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Barritas de Piña Marinela', sku: 'MR-006', barcode: '7441029512155', category: 'Pan y Bollería', brand: 'Marinela', purchasePrice: 9.0, salePrice: 15.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Polvorones Marinela', sku: 'MR-007', barcode: '7441029512162', category: 'Pan y Bollería', brand: 'Marinela', purchasePrice: 8.0, salePrice: 14.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: false },
        // ---- TÍA ROSA ----
        { name: 'Tortillinas Tía Rosa 10 pzas', sku: 'TR-001', barcode: '7441029518100', category: 'Tortillas y Tostadas', brand: 'Tía Rosa', purchasePrice: 15.0, salePrice: 24.0, stock: 30, minStock: 8, unit: 'PAQUETE', taxExempt: true },
        { name: 'Pan Integral Tía Rosa', sku: 'TR-002', barcode: '7441029518117', category: 'Pan y Bollería', brand: 'Tía Rosa', purchasePrice: 28.0, salePrice: 42.0, stock: 15, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Bimbuñuelos Tía Rosa', sku: 'TR-003', barcode: '7441029518124', category: 'Pan y Bollería', brand: 'Tía Rosa', purchasePrice: 10.0, salePrice: 16.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: false },
        // ---- SONRICS / DULCES ----
        { name: 'Paleta Payaso', sku: 'SO-001', barcode: '7501030420100', category: 'Dulces y Chocolates', brand: 'Sonrics', purchasePrice: 8.0, salePrice: 14.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Bubulubu', sku: 'SO-002', barcode: '7501030420117', category: 'Dulces y Chocolates', brand: 'Sonrics', purchasePrice: 7.0, salePrice: 12.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: false },
        { name: 'Duvalín', sku: 'SO-003', barcode: '7501030420124', category: 'Dulces y Chocolates', brand: 'Sonrics', purchasePrice: 3.5, salePrice: 6.0, stock: 80, minStock: 20, unit: 'PIEZA', taxExempt: false },
        { name: 'Chocoretas', sku: 'SO-004', barcode: '7501030420131', category: 'Dulces y Chocolates', brand: 'Sonrics', purchasePrice: 5.0, salePrice: 9.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Lunetas', sku: 'SO-005', barcode: '7501030420148', category: 'Dulces y Chocolates', brand: 'Sonrics', purchasePrice: 4.0, salePrice: 7.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: false },
        { name: 'Kranky', sku: 'SO-006', barcode: '7501030420155', category: 'Dulces y Chocolates', brand: 'Sonrics', purchasePrice: 6.0, salePrice: 10.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Carlos V', sku: 'NE-001', barcode: '7501059200100', category: 'Dulces y Chocolates', brand: 'Nestlé', purchasePrice: 7.0, salePrice: 12.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Crunch', sku: 'NE-002', barcode: '7501059200117', category: 'Dulces y Chocolates', brand: 'Nestlé', purchasePrice: 8.0, salePrice: 14.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        // ---- SABRITAS ----
        { name: 'Sabritas Original 45 g', sku: 'SA-001', barcode: '7501011115100', category: 'Botanas y Frituras', brand: 'Sabritas', purchasePrice: 12.0, salePrice: 20.0, stock: 72, minStock: 18, unit: 'PIEZA', taxExempt: false },
        { name: 'Sabritas Adobadas 45 g', sku: 'SA-002', barcode: '7501011115117', category: 'Botanas y Frituras', brand: 'Sabritas', purchasePrice: 12.0, salePrice: 20.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: false },
        { name: 'Doritos Nacho 62 g', sku: 'SA-003', barcode: '7501011115124', category: 'Botanas y Frituras', brand: 'Sabritas', purchasePrice: 14.0, salePrice: 22.0, stock: 72, minStock: 18, unit: 'PIEZA', taxExempt: false },
        { name: 'Ruffles Queso 50 g', sku: 'SA-004', barcode: '7501011115131', category: 'Botanas y Frituras', brand: 'Sabritas', purchasePrice: 13.0, salePrice: 21.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: false },
        { name: 'Cheetos Torciditos 52 g', sku: 'SA-005', barcode: '7501011115148', category: 'Botanas y Frituras', brand: 'Sabritas', purchasePrice: 13.0, salePrice: 21.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: false },
        { name: 'Cheetos Flamin Hot 55 g', sku: 'SA-006', barcode: '7501011115155', category: 'Botanas y Frituras', brand: 'Sabritas', purchasePrice: 14.0, salePrice: 22.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Fritos Sal 60 g', sku: 'SA-007', barcode: '7501011115162', category: 'Botanas y Frituras', brand: 'Sabritas', purchasePrice: 12.0, salePrice: 20.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Tostitos 65 g', sku: 'SA-008', barcode: '7501011115179', category: 'Botanas y Frituras', brand: 'Sabritas', purchasePrice: 15.0, salePrice: 24.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        // ---- GAMESA ----
        { name: 'Emperador Chocolate 109 g', sku: 'GA-001', barcode: '7501000911100', category: 'Galletas', brand: 'Gamesa', purchasePrice: 10.0, salePrice: 17.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Marías Gamesa 170 g', sku: 'GA-002', barcode: '7501000911117', category: 'Galletas', brand: 'Gamesa', purchasePrice: 9.0, salePrice: 15.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Chokis 125 g', sku: 'GA-003', barcode: '7501000911124', category: 'Galletas', brand: 'Gamesa', purchasePrice: 11.0, salePrice: 18.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Arcoiris 63 g', sku: 'GA-004', barcode: '7501000911131', category: 'Galletas', brand: 'Gamesa', purchasePrice: 8.0, salePrice: 14.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Animalitos Gamesa 45 g', sku: 'GA-005', barcode: '7501000911148', category: 'Galletas', brand: 'Gamesa', purchasePrice: 5.0, salePrice: 9.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: true },
        { name: 'Crackets 285 g', sku: 'GA-006', barcode: '7501000911155', category: 'Galletas', brand: 'Gamesa', purchasePrice: 18.0, salePrice: 28.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        // ---- BARCEL ----
        { name: 'Takis Fuego 62 g', sku: 'BA-001', barcode: '7501031310100', category: 'Botanas y Frituras', brand: 'Barcel', purchasePrice: 14.0, salePrice: 22.0, stock: 72, minStock: 18, unit: 'PIEZA', taxExempt: false },
        { name: 'Takis Original 62 g', sku: 'BA-002', barcode: '7501031310117', category: 'Botanas y Frituras', brand: 'Barcel', purchasePrice: 14.0, salePrice: 22.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: false },
        { name: 'Chips Jalapeño 60 g', sku: 'BA-003', barcode: '7501031310124', category: 'Botanas y Frituras', brand: 'Barcel', purchasePrice: 13.0, salePrice: 21.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Runners 35 g', sku: 'BA-004', barcode: '7501031310131', category: 'Botanas y Frituras', brand: 'Barcel', purchasePrice: 8.0, salePrice: 14.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: false },
        { name: 'Toreadas Hot 50 g', sku: 'BA-005', barcode: '7501031310148', category: 'Botanas y Frituras', brand: 'Barcel', purchasePrice: 12.0, salePrice: 20.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Hot Nuts Enchilados 80 g', sku: 'BA-006', barcode: '7501031310155', category: 'Botanas y Frituras', brand: 'Barcel', purchasePrice: 15.0, salePrice: 24.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        // ---- AGUA ----
        { name: 'Agua Bonafont 1 L', sku: 'BF-001', barcode: '7501013130100', category: 'Agua y Jugos', brand: 'Bonafont', purchasePrice: 6.0, salePrice: 12.0, stock: 120, minStock: 30, unit: 'PIEZA', taxExempt: false },
        { name: 'Agua Bonafont 1.5 L', sku: 'BF-002', barcode: '7501013130117', category: 'Agua y Jugos', brand: 'Bonafont', purchasePrice: 8.0, salePrice: 15.0, stock: 80, minStock: 20, unit: 'PIEZA', taxExempt: false },
        { name: 'Agua Bonafont 600 ml', sku: 'BF-003', barcode: '7501013130124', category: 'Agua y Jugos', brand: 'Bonafont', purchasePrice: 4.0, salePrice: 9.0, stock: 120, minStock: 30, unit: 'PIEZA', taxExempt: false },
        { name: 'Agua Ciel 600 ml', sku: 'CI-001', barcode: '7501055301100', category: 'Agua y Jugos', brand: 'Ciel', purchasePrice: 4.0, salePrice: 9.0, stock: 120, minStock: 30, unit: 'PIEZA', taxExempt: false },
        { name: 'Agua Ciel 1.5 L', sku: 'CI-002', barcode: '7501055301117', category: 'Agua y Jugos', brand: 'Ciel', purchasePrice: 7.0, salePrice: 14.0, stock: 72, minStock: 18, unit: 'PIEZA', taxExempt: false },
        { name: 'Agua Epura 1 L', sku: 'EP-001', barcode: '7501073840100', category: 'Agua y Jugos', brand: 'Epura', purchasePrice: 5.0, salePrice: 11.0, stock: 96, minStock: 24, unit: 'PIEZA', taxExempt: false },
        // ---- JUGOS ----
        { name: 'Jugo Jumex Mango 335 ml', sku: 'JU-001', barcode: '7501030440100', category: 'Agua y Jugos', brand: 'Jumex', purchasePrice: 7.0, salePrice: 13.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: true },
        { name: 'Jugo Jumex Durazno 335 ml', sku: 'JU-002', barcode: '7501030440117', category: 'Agua y Jugos', brand: 'Jumex', purchasePrice: 7.0, salePrice: 13.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: true },
        { name: 'Jugo Del Valle Manzana 335 ml', sku: 'DV-001', barcode: '7501055310100', category: 'Agua y Jugos', brand: 'Del Valle', purchasePrice: 8.0, salePrice: 14.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Jugo Del Valle Naranja 1 L', sku: 'DV-002', barcode: '7501055310117', category: 'Agua y Jugos', brand: 'Del Valle', purchasePrice: 20.0, salePrice: 32.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        // ---- CAFÉ Y TÉ ----
        { name: 'Nescafé Clásico 42 g', sku: 'NC-001', barcode: '7501059230100', category: 'Café y Té', brand: 'Nescafé', purchasePrice: 32.0, salePrice: 48.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Nescafé Clásico 120 g', sku: 'NC-002', barcode: '7501059230117', category: 'Café y Té', brand: 'Nescafé', purchasePrice: 72.0, salePrice: 98.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Nescafé Clásico 200 g', sku: 'NC-003', barcode: '7501059230124', category: 'Café y Té', brand: 'Nescafé', purchasePrice: 110.0, salePrice: 148.0, stock: 12, minStock: 3, unit: 'PIEZA', taxExempt: true },
        { name: 'Coffee Mate 160 g', sku: 'NC-004', barcode: '7501059230131', category: 'Café y Té', brand: 'Nestlé', purchasePrice: 28.0, salePrice: 42.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        // ---- CEREALES ----
        { name: 'Zucaritas 420 g', sku: 'KE-001', barcode: '7501008004100', category: 'Cereales', brand: 'Kelloggs', purchasePrice: 48.0, salePrice: 68.0, stock: 15, minStock: 4, unit: 'PIEZA', taxExempt: true },
        { name: 'Corn Flakes 340 g', sku: 'KE-002', barcode: '7501008004117', category: 'Cereales', brand: 'Kelloggs', purchasePrice: 42.0, salePrice: 59.0, stock: 15, minStock: 4, unit: 'PIEZA', taxExempt: true },
        { name: 'Choco Krispis 420 g', sku: 'KE-003', barcode: '7501008004124', category: 'Cereales', brand: 'Kelloggs', purchasePrice: 50.0, salePrice: 72.0, stock: 12, minStock: 3, unit: 'PIEZA', taxExempt: true },
        { name: 'Froot Loops 230 g', sku: 'KE-004', barcode: '7501008004131', category: 'Cereales', brand: 'Kelloggs', purchasePrice: 38.0, salePrice: 55.0, stock: 12, minStock: 3, unit: 'PIEZA', taxExempt: true },
        // ---- ACEITES ----
        { name: 'Aceite 1-2-3 1 L', sku: 'AC-001', barcode: '7501007410100', category: 'Aceites y Vinagres', brand: 'La Costeña', purchasePrice: 32.0, salePrice: 46.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: true },
        { name: 'Aceite Nutrioli 900 ml', sku: 'AC-002', barcode: '7501007410117', category: 'Aceites y Vinagres', brand: 'La Costeña', purchasePrice: 35.0, salePrice: 50.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Vinagre Clemente Jacques 500 ml', sku: 'AC-003', barcode: '7501007410124', category: 'Aceites y Vinagres', brand: 'Herdez', purchasePrice: 12.0, salePrice: 19.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        // ---- GRANOS Y SEMILLAS ----
        { name: 'Arroz SOS 900 g', sku: 'GR-001', barcode: '7501024500100', category: 'Granos y Semillas', brand: 'La Moderna', purchasePrice: 18.0, salePrice: 28.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Arroz Verde Valle 900 g', sku: 'GR-002', barcode: '7501024500117', category: 'Granos y Semillas', brand: 'La Moderna', purchasePrice: 20.0, salePrice: 32.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: true },
        { name: 'Frijol Negro La Sierra 560 g', sku: 'GR-003', barcode: '7501024500124', category: 'Granos y Semillas', brand: 'La Costeña', purchasePrice: 22.0, salePrice: 34.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Frijol Pinto a Granel 1 kg', sku: 'GR-004', barcode: '7501024500131', category: 'Granos y Semillas', brand: 'Great Value', purchasePrice: 28.0, salePrice: 42.0, stock: 25, minStock: 8, unit: 'KILOGRAMO', taxExempt: true },
        { name: 'Azúcar Estándar 1 kg', sku: 'GR-005', barcode: '7501024500148', category: 'Granos y Semillas', brand: 'Great Value', purchasePrice: 26.0, salePrice: 38.0, stock: 40, minStock: 10, unit: 'KILOGRAMO', taxExempt: true },
        { name: 'Sal Fina La Fina 1 kg', sku: 'GR-006', barcode: '7501024500155', category: 'Granos y Semillas', brand: 'Great Value', purchasePrice: 8.0, salePrice: 14.0, stock: 30, minStock: 8, unit: 'KILOGRAMO', taxExempt: true },
        { name: 'Lenteja 500 g', sku: 'GR-007', barcode: '7501024500162', category: 'Granos y Semillas', brand: 'Great Value', purchasePrice: 15.0, salePrice: 24.0, stock: 20, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Avena Quaker 800 g', sku: 'GR-008', barcode: '7501024500179', category: 'Granos y Semillas', brand: 'Pepsi', purchasePrice: 28.0, salePrice: 42.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        // ---- ENLATADOS Y CONSERVAS ----
        { name: 'Chiles Jalapeños La Costeña 220 g', sku: 'EN-001', barcode: '7501017005100', category: 'Enlatados', brand: 'La Costeña', purchasePrice: 12.0, salePrice: 20.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: true },
        { name: 'Frijoles Refritos La Costeña 580 g', sku: 'EN-002', barcode: '7501017005117', category: 'Enlatados', brand: 'La Costeña', purchasePrice: 18.0, salePrice: 28.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Atún Herdez en Agua 140 g', sku: 'EN-003', barcode: '7501003115100', category: 'Enlatados', brand: 'Herdez', purchasePrice: 16.0, salePrice: 26.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Atún Dolores en Aceite 140 g', sku: 'EN-004', barcode: '7501003115117', category: 'Enlatados', brand: 'Del Monte', purchasePrice: 17.0, salePrice: 28.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: true },
        { name: 'Elote Dorado Herdez 220 g', sku: 'EN-005', barcode: '7501003115124', category: 'Enlatados', brand: 'Herdez', purchasePrice: 14.0, salePrice: 22.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Puré de Tomate Herdez 210 g', sku: 'EN-006', barcode: '7501003115131', category: 'Enlatados', brand: 'Herdez', purchasePrice: 6.0, salePrice: 11.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        // ---- CONDIMENTOS Y SALSAS ----
        { name: 'Salsa Valentina 370 ml', sku: 'CO-001', barcode: '7501028400100', category: 'Condimentos y Salsas', brand: 'Valentina', purchasePrice: 12.0, salePrice: 20.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Tajín Clásico 142 g', sku: 'CO-002', barcode: '7501003320100', category: 'Condimentos y Salsas', brand: 'Tajín', purchasePrice: 18.0, salePrice: 28.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Salsa Maggi Jugo 100 ml', sku: 'CO-003', barcode: '7501059260100', category: 'Condimentos y Salsas', brand: 'Maggi', purchasePrice: 8.0, salePrice: 14.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: true },
        { name: 'Caldo de Pollo Knorr 8 cubos', sku: 'CO-004', barcode: '7501005176100', category: 'Condimentos y Salsas', brand: 'Knorr', purchasePrice: 10.0, salePrice: 17.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Mayonesa McCormick 390 g', sku: 'CO-005', barcode: '7501003190100', category: 'Condimentos y Salsas', brand: 'McCormick', purchasePrice: 28.0, salePrice: 42.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Mostaza McCormick 200 g', sku: 'CO-006', barcode: '7501003190117', category: 'Condimentos y Salsas', brand: 'McCormick', purchasePrice: 15.0, salePrice: 24.0, stock: 15, minStock: 4, unit: 'PIEZA', taxExempt: true },
        { name: 'Catsup Clásica 220 g', sku: 'CO-007', barcode: '7501003190124', category: 'Condimentos y Salsas', brand: 'McCormick', purchasePrice: 14.0, salePrice: 22.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        // ---- PASTA Y SOPAS ----
        { name: 'Sopa Maruchan Pollo', sku: 'SP-001', barcode: '7501031313100', category: 'Enlatados', brand: 'Maruchan', purchasePrice: 6.0, salePrice: 11.0, stock: 72, minStock: 20, unit: 'PIEZA', taxExempt: false },
        { name: 'Sopa Maruchan Camarón', sku: 'SP-002', barcode: '7501031313117', category: 'Enlatados', brand: 'Maruchan', purchasePrice: 6.0, salePrice: 11.0, stock: 72, minStock: 20, unit: 'PIEZA', taxExempt: false },
        { name: 'Pasta La Moderna Coditos 200 g', sku: 'SP-003', barcode: '7501024510100', category: 'Granos y Semillas', brand: 'La Moderna', purchasePrice: 5.0, salePrice: 9.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Pasta La Moderna Espagueti 200 g', sku: 'SP-004', barcode: '7501024510117', category: 'Granos y Semillas', brand: 'La Moderna', purchasePrice: 5.0, salePrice: 9.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Sopa Knorr Fideos 95 g', sku: 'SP-005', barcode: '7501005176117', category: 'Enlatados', brand: 'Knorr', purchasePrice: 5.0, salePrice: 9.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: true },
        // ---- HARINAS ----
        { name: 'Harina Maseca 1 kg', sku: 'HA-001', barcode: '7501000710100', category: 'Harinas y Repostería', brand: 'Maseca', purchasePrice: 18.0, salePrice: 28.0, stock: 30, minStock: 8, unit: 'KILOGRAMO', taxExempt: true },
        { name: 'Harina Maseca 2 kg', sku: 'HA-002', barcode: '7501000710117', category: 'Harinas y Repostería', brand: 'Maseca', purchasePrice: 32.0, salePrice: 48.0, stock: 20, minStock: 5, unit: 'KILOGRAMO', taxExempt: true },
        // ---- CARNES FRÍAS ----
        { name: 'Jamón de Pavo FUD 250 g', sku: 'CF-001', barcode: '7501011140100', category: 'Carnes Frías', brand: 'Fud', purchasePrice: 32.0, salePrice: 48.0, stock: 15, minStock: 4, unit: 'PIEZA', taxExempt: true },
        { name: 'Salchicha FUD 500 g', sku: 'CF-002', barcode: '7501011140117', category: 'Carnes Frías', brand: 'Fud', purchasePrice: 25.0, salePrice: 38.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Salchicha para Asar FUD 500 g', sku: 'CF-003', barcode: '7501011140124', category: 'Carnes Frías', brand: 'Fud', purchasePrice: 38.0, salePrice: 55.0, stock: 12, minStock: 3, unit: 'PIEZA', taxExempt: true },
        // ---- HUEVO ----
        { name: 'Huevo Blanco 12 pzas', sku: 'HU-001', barcode: '7501080010100', category: 'Huevo', brand: 'Great Value', purchasePrice: 32.0, salePrice: 48.0, stock: 30, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Huevo Blanco 30 pzas', sku: 'HU-002', barcode: '7501080010117', category: 'Huevo', brand: 'Great Value', purchasePrice: 72.0, salePrice: 98.0, stock: 15, minStock: 5, unit: 'PIEZA', taxExempt: true },
        // ---- LIMPIEZA DEL HOGAR ----
        { name: 'Fabuloso Lavanda 1 L', sku: 'LH-001', barcode: '7501035910100', category: 'Limpieza del Hogar', brand: 'Fabuloso', purchasePrice: 22.0, salePrice: 35.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: false },
        { name: 'Fabuloso Lavanda 2 L', sku: 'LH-002', barcode: '7501035910117', category: 'Limpieza del Hogar', brand: 'Fabuloso', purchasePrice: 38.0, salePrice: 55.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: false },
        { name: 'Pinol Original 1 L', sku: 'LH-003', barcode: '7501025440100', category: 'Limpieza del Hogar', brand: 'Pinol', purchasePrice: 28.0, salePrice: 42.0, stock: 20, minStock: 5, unit: 'PIEZA', taxExempt: false },
        { name: 'Cloralex 950 ml', sku: 'LH-004', barcode: '7501025450100', category: 'Limpieza del Hogar', brand: 'Cloralex', purchasePrice: 18.0, salePrice: 28.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: false },
        { name: 'Suavitel Primaveral 850 ml', sku: 'LH-005', barcode: '7501035920100', category: 'Limpieza del Hogar', brand: 'Suavitel', purchasePrice: 25.0, salePrice: 38.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: false },
        { name: 'Detergente Roma 500 g', sku: 'LH-006', barcode: '7501026006100', category: 'Limpieza del Hogar', brand: 'Roma', purchasePrice: 14.0, salePrice: 22.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Detergente Roma 1 kg', sku: 'LH-007', barcode: '7501026006117', category: 'Limpieza del Hogar', brand: 'Roma', purchasePrice: 24.0, salePrice: 38.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: false },
        { name: 'Detergente Ariel 800 g', sku: 'LH-008', barcode: '7501001164100', category: 'Limpieza del Hogar', brand: 'Ariel', purchasePrice: 35.0, salePrice: 52.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: false },
        { name: 'Detergente Ace 800 g', sku: 'LH-009', barcode: '7501001165100', category: 'Limpieza del Hogar', brand: 'Ace', purchasePrice: 30.0, salePrice: 45.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: false },
        { name: 'Jabón Zote Rosa 400 g', sku: 'LH-010', barcode: '7501026009100', category: 'Limpieza del Hogar', brand: 'Roma', purchasePrice: 12.0, salePrice: 20.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: false },
        // ---- HIGIENE PERSONAL ----
        { name: 'Jabón Dove Original 90 g', sku: 'HP-001', barcode: '7501006740100', category: 'Higiene Personal', brand: 'Dove', purchasePrice: 18.0, salePrice: 28.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: false },
        { name: 'Jabón Palmolive Naturals 150 g', sku: 'HP-002', barcode: '7501035100100', category: 'Higiene Personal', brand: 'Palmolive', purchasePrice: 14.0, salePrice: 22.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: false },
        { name: 'Pasta Dental Colgate Triple 75 ml', sku: 'HP-003', barcode: '7501035200100', category: 'Higiene Personal', brand: 'Colgate', purchasePrice: 22.0, salePrice: 35.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: false },
        { name: 'Shampoo Palmolive 400 ml', sku: 'HP-004', barcode: '7501035100117', category: 'Higiene Personal', brand: 'Palmolive', purchasePrice: 32.0, salePrice: 48.0, stock: 15, minStock: 4, unit: 'PIEZA', taxExempt: false },
        { name: 'Desodorante Rexona 150 ml', sku: 'HP-005', barcode: '7501006740117', category: 'Higiene Personal', brand: 'Dove', purchasePrice: 38.0, salePrice: 55.0, stock: 12, minStock: 3, unit: 'PIEZA', taxExempt: false },
        // ---- PAPEL Y DESECHABLES ----
        { name: 'Papel Higiénico Pétalo 4 rollos', sku: 'PD-001', barcode: '7501019010100', category: 'Papel y Desechables', brand: 'Pétalo', purchasePrice: 18.0, salePrice: 28.0, stock: 30, minStock: 8, unit: 'PAQUETE', taxExempt: false },
        { name: 'Papel Higiénico Regio 4 rollos', sku: 'PD-002', barcode: '7501019020100', category: 'Papel y Desechables', brand: 'Regio', purchasePrice: 22.0, salePrice: 35.0, stock: 24, minStock: 6, unit: 'PAQUETE', taxExempt: false },
        { name: 'Servilletas Pétalo 250 pzas', sku: 'PD-003', barcode: '7501019010117', category: 'Papel y Desechables', brand: 'Pétalo', purchasePrice: 15.0, salePrice: 24.0, stock: 18, minStock: 5, unit: 'PAQUETE', taxExempt: false },
        { name: 'Papel de Cocina Regio 2 rollos', sku: 'PD-004', barcode: '7501019020117', category: 'Papel y Desechables', brand: 'Regio', purchasePrice: 20.0, salePrice: 32.0, stock: 18, minStock: 5, unit: 'PAQUETE', taxExempt: false },
        // ---- TORTILLAS Y TOSTADAS ----
        { name: 'Tostadas Charras 12 pzas', sku: 'TT-001', barcode: '7501400010100', category: 'Tortillas y Tostadas', brand: 'Great Value', purchasePrice: 10.0, salePrice: 17.0, stock: 24, minStock: 6, unit: 'PAQUETE', taxExempt: true },
        { name: 'Tostadas Milpa Real 14 pzas', sku: 'TT-002', barcode: '7501400010117', category: 'Tortillas y Tostadas', brand: 'Great Value', purchasePrice: 12.0, salePrice: 20.0, stock: 20, minStock: 5, unit: 'PAQUETE', taxExempt: true },
        // ---- NUTRILECHE ----
        { name: 'Nutrileche Entera 1 L', sku: 'NL-001', barcode: '7501055900100', category: 'Lácteos', brand: 'Nutrileche', purchasePrice: 16.0, salePrice: 24.0, stock: 60, minStock: 15, unit: 'PIEZA', taxExempt: true },
        // ---- BEBIDAS ALCOHÓLICAS ----
        { name: 'Cerveza Corona 355 ml', sku: 'BA-101', barcode: '7501064190100', category: 'Bebidas Alcohólicas', brand: 'Corona', purchasePrice: 16.0, salePrice: 25.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Cerveza Modelo Especial 355 ml', sku: 'BA-102', barcode: '7501064180100', category: 'Bebidas Alcohólicas', brand: 'Modelo', purchasePrice: 16.0, salePrice: 25.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Cerveza Victoria 355 ml', sku: 'BA-103', barcode: '7501064170100', category: 'Bebidas Alcohólicas', brand: 'Victoria', purchasePrice: 14.0, salePrice: 22.0, stock: 48, minStock: 12, unit: 'PIEZA', taxExempt: false },
        { name: 'Cerveza Negra Modelo 355 ml', sku: 'BA-104', barcode: '7501064180117', category: 'Bebidas Alcohólicas', brand: 'Modelo', purchasePrice: 17.0, salePrice: 27.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        // ---- EXTRAS ----
        { name: 'Leche Condensada La Lechera 387 g', sku: 'EX-001', barcode: '7501059270100', category: 'Lácteos', brand: 'Nestlé', purchasePrice: 22.0, salePrice: 34.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Media Crema Nestlé 225 g', sku: 'EX-002', barcode: '7501059270117', category: 'Lácteos', brand: 'Nestlé', purchasePrice: 12.0, salePrice: 19.0, stock: 20, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Chocolate Abuelita 540 g', sku: 'EX-003', barcode: '7501059280100', category: 'Café y Té', brand: 'Nestlé', purchasePrice: 38.0, salePrice: 55.0, stock: 12, minStock: 3, unit: 'PIEZA', taxExempt: true },
        { name: 'Gelatina Jello Fresa 25 g', sku: 'EX-004', barcode: '7501006510100', category: 'Harinas y Repostería', brand: 'Knorr', purchasePrice: 4.0, salePrice: 8.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: true },
        { name: 'Gelatina Jello Limón 25 g', sku: 'EX-005', barcode: '7501006510117', category: 'Harinas y Repostería', brand: 'Knorr', purchasePrice: 4.0, salePrice: 8.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: true },
        // ---- CHICLES Y CARAMELOS ----
        { name: 'Trident Menta 18 pzas', sku: 'CH-001', barcode: '7622210500100', category: 'Dulces y Chocolates', brand: 'Sonrics', purchasePrice: 12.0, salePrice: 20.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Chiclets 50 pzas', sku: 'CH-002', barcode: '7441029550100', category: 'Dulces y Chocolates', brand: 'Sonrics', purchasePrice: 15.0, salePrice: 25.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: false },
        { name: 'Halls Menta 9 pzas', sku: 'CH-003', barcode: '7622210510100', category: 'Dulces y Chocolates', brand: 'Sonrics', purchasePrice: 8.0, salePrice: 14.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        // ---- MÁS PRODUCTOS FALTANTES ----
        { name: 'Leche Evaporada Carnation 360 g', sku: 'EX-006', barcode: '7501059290100', category: 'Lácteos', brand: 'Nestlé', purchasePrice: 16.0, salePrice: 25.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Salsa Verde Herdez 240 g', sku: 'CO-008', barcode: '7501003110100', category: 'Condimentos y Salsas', brand: 'Herdez', purchasePrice: 10.0, salePrice: 17.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Salsa Roja Herdez 240 g', sku: 'CO-009', barcode: '7501003110117', category: 'Condimentos y Salsas', brand: 'Herdez', purchasePrice: 10.0, salePrice: 17.0, stock: 24, minStock: 6, unit: 'PIEZA', taxExempt: true },
        { name: 'Mole Doña María 235 g', sku: 'CO-010', barcode: '7501003130100', category: 'Condimentos y Salsas', brand: 'Herdez', purchasePrice: 28.0, salePrice: 42.0, stock: 12, minStock: 3, unit: 'PIEZA', taxExempt: true },
        { name: 'Champiñones La Costeña 380 g', sku: 'EN-007', barcode: '7501017005124', category: 'Enlatados', brand: 'La Costeña', purchasePrice: 22.0, salePrice: 35.0, stock: 12, minStock: 3, unit: 'PIEZA', taxExempt: true },
        { name: 'Chícharos La Costeña 220 g', sku: 'EN-008', barcode: '7501017005131', category: 'Enlatados', brand: 'La Costeña', purchasePrice: 10.0, salePrice: 17.0, stock: 18, minStock: 5, unit: 'PIEZA', taxExempt: true },
        { name: 'Bolsa para Basura Petalo 10 pzas', sku: 'LH-011', barcode: '7501019010124', category: 'Limpieza del Hogar', brand: 'Pétalo', purchasePrice: 12.0, salePrice: 20.0, stock: 24, minStock: 6, unit: 'PAQUETE', taxExempt: false },
        { name: 'Esponja Scotch-Brite', sku: 'LH-012', barcode: '7501035930100', category: 'Limpieza del Hogar', brand: 'Great Value', purchasePrice: 8.0, salePrice: 14.0, stock: 30, minStock: 8, unit: 'PIEZA', taxExempt: false },
        { name: 'Velas KIR 8 pzas', sku: 'LH-013', barcode: '7501024600100', category: 'Limpieza del Hogar', brand: 'KIR', purchasePrice: 10.0, salePrice: 18.0, stock: 18, minStock: 5, unit: 'PAQUETE', taxExempt: false },
        { name: 'Cerillos La Central 50 pzas', sku: 'LH-014', barcode: '7501024600117', category: 'Limpieza del Hogar', brand: 'Great Value', purchasePrice: 3.0, salePrice: 6.0, stock: 36, minStock: 10, unit: 'PIEZA', taxExempt: false },
        { name: 'Pilas AA Duracell 2 pzas', sku: 'EX-007', barcode: '7501048900100', category: 'Limpieza del Hogar', brand: 'Great Value', purchasePrice: 28.0, salePrice: 45.0, stock: 18, minStock: 5, unit: 'PAQUETE', taxExempt: false },
        { name: 'Pilas AAA Duracell 2 pzas', sku: 'EX-008', barcode: '7501048900117', category: 'Limpieza del Hogar', brand: 'Great Value', purchasePrice: 28.0, salePrice: 45.0, stock: 15, minStock: 4, unit: 'PAQUETE', taxExempt: false },
    ];
    for (const p of products) {
        await prisma.product.upsert({
            where: { sku: p.sku },
            update: {},
            create: {
                name: p.name,
                sku: p.sku,
                barcode: p.barcode,
                purchasePrice: p.purchasePrice,
                salePrice: p.salePrice,
                stock: p.stock,
                minStock: p.minStock,
                unitOfMeasure: p.unit,
                taxExempt: p.taxExempt,
                taxRate: 0.16,
                categoryId: categories[p.category],
                brandId: brands[p.brand],
            },
        });
    }
    console.log(`✅ ${products.length} productos creados`);
    console.log('🎉 Seed completado exitosamente');
    console.log('');
    console.log('📋 Credenciales de acceso:');
    console.log('   Admin:      admin / admin123');
    console.log('   Cajero 1:   cajero1 / cajero123');
    console.log('   Cajero 2:   cajero2 / cajero123');
    console.log('   Supervisor: supervisor / super123');
}
main()
    .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
