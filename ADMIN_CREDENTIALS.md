# Credenciales de Administrador - Porterias

## 🔐 Acceso al Panel de Administración

### Información del Proyecto Supabase
- **URL del proyecto**: https://sxjwoyxwgmmsaqczvjpd.supabase.co
- **Project ID**: `sxjwoyxwgmmsaqczvjpd`
- **Dashboard**: https://supabase.com/dashboard/project/sxjwoyxwgmmsaqczvjpd

### Credenciales de Usuario Administrador

**Email**: `sampayo@gmail.com`  
**Contraseña**: `Bac2317?`

### Pasos para Crear el Usuario Administrador

1. **Acceder al Dashboard de Supabase**:
   - Ve a: https://supabase.com/dashboard/project/sxjwoyxwgmmsaqczvjpd
   - Authentication → Users → Add User

2. **Crear el usuario**:
   - Email: `sampayo@gmail.com`
   - Password: `Bac2317?`
   - Confirmar email: ✓ (marcar como verificado)

3. **Asignar rol de admin** (ejecutar en SQL Editor):
   ```sql
   SELECT public.make_user_admin('sampayo@gmail.com');
   ```

### Acceso a la Aplicación

- **URL de Porterias**: https://albertomaydayjhondoe.github.io/Porterias/
- **Panel Admin**: https://albertomaydayjhondoe.github.io/Porterias/#/admin

### Notas Importantes

- El mismo usuario y contraseña funcionan para **Porterias** y **Porteria**
- Ambos proyectos comparten la misma base de datos Supabase
- Las migraciones están sincronizadas entre ambos repositorios

### Función SQL Disponible

Si necesitas crear más usuarios administradores:

```sql
SELECT public.make_user_admin('nuevo-admin@example.com');
```

Esta función está definida en: `supabase/migrations/20251209221536_create_admin_user.sql`
