#!/bin/bash
# Backup automático de la base de datos del POS
# Guarda los últimos 30 días de respaldos

BACKUP_DIR="$HOME/pos-backups"
DATE=$(date +%Y-%m-%d_%H-%M)
FILE="$BACKUP_DIR/pos_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$DATE] Iniciando backup..."
docker exec pos-postgres pg_dump -U pos_user pos_abarrotes | gzip > "$FILE"

if [ $? -eq 0 ]; then
  echo "[$DATE] Backup guardado en $FILE"
else
  echo "[$DATE] ERROR: El backup falló" >&2
  exit 1
fi

# Eliminar backups de más de 30 días
find "$BACKUP_DIR" -name "pos_*.sql.gz" -mtime +30 -delete

echo "[$DATE] Backups disponibles:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null
