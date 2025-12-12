# Netlify Deployment con Upload Seguro

## Setup Netlify

1. **Conecta el repositorio a Netlify:**
   - Ve a https://app.netlify.com/
   - Click "Add new site" → "Import an existing project"
   - Conecta GitHub y selecciona `albertomaydayjhondoe/Porterias`

2. **Configura las variables de entorno:**
   En Netlify Dashboard → Site settings → Environment variables:
   
   ```
   GITHUB_TOKEN = tu_github_token_aqui
   ```
   
   (Usa el token del archivo `.env` local)

3. **Deploy:**
   Netlify deployará automáticamente en cada push a main

## Configuración Build

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"
```

## Cómo funciona

1. Usuario sube archivo desde el admin en producción
2. Request va a `/.netlify/functions/upload` (serverless)
3. Function usa `GITHUB_TOKEN` (seguro en servidor)
4. Hace commit al repositorio
5. Netlify detecta cambio y redespliega automáticamente

## Ventajas

- ✅ Token NUNCA expuesto al cliente
- ✅ Funciona desde producción
- ✅ Deploy automático
- ✅ Gratis (hasta 125k requests/mes)
- ✅ Máxima seguridad

## Testing Local

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Ejecutar local con functions
netlify dev

# Probar function
curl -X POST http://localhost:8888/.netlify/functions/upload \
  -H "Content-Type: application/json" \
  -d '{"file":"...base64...", "fileName":"test.jpg", "title":"Test", "publishDate":"2025-12-12", "mediaType":"image"}'
```

## Migración desde GitHub Pages

**Opción 1: Solo Netlify**
- Cambia el dominio de GitHub Pages a Netlify
- Todo funciona igual pero con upload en producción

**Opción 2: Híbrido (Recomendado)**
- Mantén GitHub Pages para el sitio
- Usa Netlify solo para las functions
- Configura CORS adecuadamente

## URLs

- **GitHub Pages:** https://albertomaydayjhondoe.github.io/Porterias/
- **Netlify:** https://porterias.netlify.app/ (o tu dominio custom)
- **Function:** https://porterias.netlify.app/.netlify/functions/upload
