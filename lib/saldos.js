import { supabase } from './supabase'

export async function calcularSaldoCuenta(cuentaId, saldoInicial) {
  const [{ data: ingresos }, { data: gastos }] = await Promise.all([
    supabase.from('ingresos').select('monto').eq('cuenta_id', cuentaId),
    supabase.from('gastos').select('monto').eq('cuenta_id', cuentaId),
  ])

  const totalIngresos = (ingresos || []).reduce((acc, i) => acc + parseFloat(i.monto), 0)
  const totalGastos = (gastos || []).reduce((acc, g) => acc + parseFloat(g.monto), 0)

  return parseFloat(saldoInicial || 0) + totalIngresos - totalGastos
}

export async function calcularSaldosCuentas(cuentas) {
  const resultado = await Promise.all(
    cuentas.map(async (c) => {
      const saldo = await calcularSaldoCuenta(c.id, c.saldo_inicial)
      return { ...c, saldo_real: saldo }
    })
  )
  return resultado
}
