export function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const anio = String(d.getFullYear()).slice(-2)
  return `${dia}/${mes}/${anio}`
}

export function formatDinero(monto) {
  if (monto === null || monto === undefined) return '$0'
  const numero = Math.round(Number(monto))
  return '$' + numero.toLocaleString('es-AR')
}