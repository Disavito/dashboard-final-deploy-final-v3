.upsert({
  socio_id: socioId,
  tipo_documento: 'Comprobante de Pago',
  link_documento: publicUrl, // <-- Aquí se usa tu columna
}, {
  onConflict: 'socio_id, tipo_documento'
})
