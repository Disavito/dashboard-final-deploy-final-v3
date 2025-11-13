-- Política para Administradores: Si is_admin() devuelve true, el usuario puede ver todas las filas.
CREATE POLICY "Allow admin to read all records"
ON public.registros_jornada
FOR SELECT
USING (is_admin());

-- Política para Colaboradores: Permite a un usuario leer un registro si su user_id
-- coincide con el user_id vinculado al colaborador_id del registro.
CREATE POLICY "Allow user to read their own records"
ON public.registros_jornada
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM colaboradores c
    WHERE c.id = registros_jornada.colaborador_id
    AND c.user_id = auth.uid()
  )
);
