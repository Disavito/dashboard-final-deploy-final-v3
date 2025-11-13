-- Concede acceso a la ruta '/jornada' a TODOS los roles existentes.
INSERT INTO public.resource_permissions (role_id, resource_path, can_access)
SELECT 
  id, 
  '/jornada', 
  true
FROM 
  public.roles
ON CONFLICT (role_id, resource_path) DO NOTHING;
