-- Elimina la función si ya existe para asegurar que estamos usando la versión más reciente.
DROP FUNCTION IF EXISTS is_admin();

-- Crea la función que devuelve 'true' si el usuario autenticado tiene un rol de administrador.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND (r.role_name = 'admin' OR r.role_name = 'finanzas_senior')
  );
$$;
