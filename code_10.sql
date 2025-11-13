-- Reemplaza "Nombre de tu política antigua" con el nombre real de la política si la conoces.
-- Si no estás seguro, puedes ir a Authentication -> Policies en Supabase y eliminarlas manualmente.
DROP POLICY IF EXISTS "Allow user to read their own records" ON public.registros_jornada;
DROP POLICY IF EXISTS "Allow admin to read all records" ON public.registros_jornada;
-- Agrega más líneas DROP POLICY si tienes otras políticas de SELECT.
