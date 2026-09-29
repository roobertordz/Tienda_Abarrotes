# Guía de instalación en producción — pos-abarrotes

## Requisitos de la computadora de la tienda

- **Sistema operativo**: Windows 10/11, macOS 12+, o Ubuntu 22.04
- **RAM mínima**: 4 GB (recomendado 8 GB)
- **Disco**: 20 GB libres
- **Conexión a internet**: solo necesaria para pagos con tarjeta (Mercado Pago)

---

## Paso 1 — Instalar Docker Desktop

Descarga e instala desde: **https://www.docker.com/products/docker-desktop**

- Habilita la opción **"Start Docker Desktop when you log in"** durante la instalación.
- En Windows necesitarás reiniciar y habilitar WSL 2 si lo pide.

---

## Paso 2 — Copiar el proyecto

Copia la carpeta `pos-abarrotes` a la computadora de la tienda.  
Puedes usar una USB, Google Drive, o cualquier otro medio.

---

## Paso 3 — Crear el archivo de configuración

Dentro de la carpeta `pos-abarrotes`, crea un archivo llamado `.env` (sin extensión)  
copiando el contenido de `.env.example` y llenando los datos reales:

```
JWT_SECRET=una_clave_aleatoria_muy_larga_y_segura
STORE_NAME=Abarrotes Don José
STORE_ADDRESS=Calle Principal 123, Col. Centro, Ciudad
STORE_RFC=XAXX010101000
STORE_PHONE=55-1234-5678
MP_ACCESS_TOKEN=APP_USR-...tu_token...
MP_DEVICE_ID=NEWLAND_N950__N950NCBC02328797
```

> Para generar una clave segura puedes ir a https://www.random.org/strings/ y generar una cadena de 40 caracteres.

---

## Paso 4 — Iniciar el sistema (primera vez)

Abre una terminal dentro de la carpeta `pos-abarrotes` y ejecuta:

```bash
docker compose up -d --build
```

Esto tarda ~5 minutos la primera vez (descarga imágenes y compila).

Luego carga los productos iniciales:

```bash
docker exec pos-backend npx prisma db seed
```

---

## Paso 5 — Abrir el POS

Abre el navegador y ve a:  **http://localhost**

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |
| cajero1 | cajero123 | Cajero |
| supervisor1 | supervisor123 | Supervisor |

> **Cambia las contraseñas** desde Administración → Usuarios antes de usar en producción.

---

## Acceso desde otras computadoras / tabletas en la misma red

Si quieres acceder al POS desde otro dispositivo de la tienda (tableta, otra PC, etc.):

1. En la computadora donde está instalado, busca su IP local:
   - Windows: `ipconfig` → busca "Dirección IPv4"  
   - Mac: `ifconfig | grep "inet "` o en Preferencias → Red
2. Desde el otro dispositivo abre: `http://192.168.x.x` (usa la IP encontrada)

---

## Iniciar el sistema (días normales)

Docker se inicia automáticamente con la computadora.  
Si necesitas reiniciar el POS manualmente:

```bash
cd pos-abarrotes
docker compose up -d
```

Para detenerlo:

```bash
docker compose down
```

---

## Backup de la base de datos

### Manual (cualquier momento):
```bash
cd pos-abarrotes
bash scripts/backup.sh
```
Los respaldos se guardan en `~/pos-backups/`.

### Automático diario (Mac/Linux):
Ejecuta este comando una sola vez para programar backup diario a las 2 AM:

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * cd $HOME/pos-abarrotes && bash scripts/backup.sh >> $HOME/pos-backups/backup.log 2>&1") | crontab -
```

### Automático diario (Windows):
Abre el Programador de tareas y crea una tarea que ejecute a las 2 AM:
```
docker exec pos-postgres pg_dump -U pos_user pos_abarrotes > C:\pos-backups\backup.sql
```

### Restaurar un backup:
```bash
gunzip -c ~/pos-backups/pos_FECHA.sql.gz | docker exec -i pos-postgres psql -U pos_user pos_abarrotes
```

---

## Actualizar el sistema

Cuando haya cambios en el código:

```bash
cd pos-abarrotes
docker compose down
docker compose up -d --build
```

Los datos de la base de datos **no se borran** al actualizar.

---

## Solución de problemas

| Problema | Solución |
|----------|---------|
| La página no carga | Verifica que Docker Desktop esté corriendo |
| "Error de conexión" | `docker compose logs backend` para ver errores |
| Terminal MP no conecta | Verifica internet y que el `.env` tenga el token correcto |
| Se olvidó contraseña admin | `docker exec pos-backend npx prisma db seed` (recrea usuarios) |
