# Admin integrado desde Porteria

Variables de entorno necesarias (opcional):
- ADMIN_GH_TOKEN: Personal Access Token con scope `repo` si el admin debe realizar commits/pushes automáticos.

Pasos para probar:
1. npm ci
2. npm run dev
3. Abrir http://localhost:5173/admin (o la ruta adecuada)
4. Editar/guardar y verificar que public/data/strips.json se actualiza localmente

Cómo añadir token al repo (si quieres commits automáticos):
1. Ve a Settings → Secrets and variables → Repository secrets
2. Haz click en New repository secret
3. Nombre: ADMIN_GH_TOKEN, Valor: <tu_PAT_con_scope_repo>
