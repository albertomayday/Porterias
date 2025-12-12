# 📤 Upload Strip - Sistema de Storage Local

## Uso rápido desde el Admin Web

1. Ve a `/admin` y sube tu imagen/video
2. El archivo se descarga automáticamente
3. Copia el comando que aparece en pantalla
4. Pégalo en la terminal del proyecto
5. Haz commit y deploy

## Uso directo del script

```bash
node scripts/upload-strip.js <archivo> [titulo] [fecha]
```

### Ejemplos

```bash
# Subir imagen con título y fecha de hoy
node scripts/upload-strip.js ./mi-tira.jpg "Mi Nueva Tira"

# Subir video con fecha específica
node scripts/upload-strip.js ./video.mp4 "Tira Animada" 2025-12-12

# Subir sin título (usará el nombre del archivo)
node scripts/upload-strip.js ./tira.png
```

## Qué hace el script

1. ✅ Copia el archivo a `src/assets/strips/` con nombre único
2. ✅ Actualiza `public/data/strips.json` con la nueva entrada
3. ✅ Genera ID automático (strip-001, strip-002, etc.)
4. ✅ Detecta automáticamente si es imagen o video
5. ✅ Ordena strips por fecha descendente

## Formatos soportados

**Imágenes:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`  
**Videos:** `.mp4`, `.webm`, `.ogg`

## Después de subir

```bash
# Ver cambios
git status

# Commit
git add src/assets/strips/ public/data/strips.json
git commit -m "Add strip: Mi Tira"

# Deploy
git push && npm run deploy
```

## Workflow completo desde Admin Web

```
1. Abrir /admin
   ↓
2. Seleccionar archivo + título + fecha
   ↓
3. Click "Subir" → Archivo descargado + comando copiado
   ↓
4. Pegar comando en terminal (desde ~/Downloads/)
   ↓
5. Script procesa: archivo → src/assets/strips/ + JSON actualizado
   ↓
6. git add . && git commit && git push && npm run deploy
   ↓
7. ✅ Strip publicado en GitHub Pages
```

## Troubleshooting

### "El archivo no existe"
Asegúrate de estar en la carpeta correcta o usa la ruta absoluta:
```bash
node scripts/upload-strip.js /ruta/completa/al/archivo.jpg "Título"
```

### "Formato no soportado"
Usa uno de los formatos permitidos: JPG, PNG, GIF, WebP, MP4, WebM, OGG

### "Error al actualizar strips.json"
Verifica que `public/data/strips.json` existe y es válido JSON

### Ver strips actuales
```bash
cat public/data/strips.json | jq '.[] | {id, title, publish_date}'
```

## Estructura generada

```
src/assets/strips/
  ├── strip-2025-12-11-1234567890.jpg
  ├── strip-2025-12-12-1234567891.mp4
  └── strip-2025-12-13-1234567892.png

public/data/strips.json
{
  "strips": [
    {
      "id": "strip-021",
      "title": "Mi Tira",
      "image_url": "/assets/strips/strip-2025-12-12-1234567891.jpg",
      "video_url": null,
      "media_type": "image",
      "publish_date": "2025-12-12"
    }
  ]
}
```
