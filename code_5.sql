-- Asegurarse de que la columna socio_id existe. Si no, descomenta la siguiente línea.
-- ALTER TABLE public.boletas_electronicas ADD COLUMN socio_id BIGINT;

-- Crear la relación (foreign key)
ALTER TABLE public.boletas_electronicas
ADD CONSTRAINT boletas_electronicas_socio_id_fkey
FOREIGN KEY (socio_id)
REFERENCES public.socio_titulares (id)
ON DELETE SET NULL;

-- Refrescar el schema cache de PostgREST para que los cambios se apliquen inmediatamente
NOTIFY pgrst, 'reload schema';
