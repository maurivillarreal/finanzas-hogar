'use client'

import { calcularSaldosCuentas } from '@/lib/saldos'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDinero } from '@/lib/formato'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const TIPOS_ICONO = {
  caja_ahorro: '🏦',
  cuenta_corriente: '🏦',
  efectivo: '💵',
  billetera_virtual: '📱',
  tarjeta_credito: '💳',
}

const COLORES_TORTA = ['#facc15', '#4ade80', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#34d399', '#f472b6', '#a78bfa', '#38bdf8']

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function Dashboard() {
  const router = useRouter()
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cuentas, setCuentas] = useState([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState([])
  const [ingresoVsGasto, setIngresoVsGasto] = useState([])
  const [totales, setTotales] = useState({ ingresos: 0, gastos: 0, balance: 0 })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUsuario(session.user)
      await Promise.all([
        cargarCuentas(),
        cargarGastosPorCategoria(),
        cargarIngresoVsGasto(),
        cargarTotalesMes(),
      ])
      setLoading(false)
    }
    init()
  }, [router])

  const cargarCuentas = async () => {
  const { data } = await supabase
    .from('cuentas')
    .select('*')
    .eq('activa', true)
    .order('nombre')

  if (!data) return
  const cuentasConSaldo = await calcularSaldosCuentas(data)
  setCuentas(cuentasConSaldo)
}

  const cargarGastosPorCategoria = async () => {
    const { data } = await supabase
      .from('gastos')
      .select('monto, categoria:categorias(nombre, icono)')

    if (!data) return

    const agrupado = {}
    data.forEach(g => {
      const nombre = g.categoria?.nombre || 'Sin categoría'
      const icono = g.categoria?.icono || '📦'
      if (!agrupado[nombre]) agrupado[nombre] = { nombre, icono, value: 0 }
      agrupado[nombre].value += parseFloat(g.monto)
    })

    setGastosPorCategoria(
      Object.values(agrupado)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    )
  }

  const cargarIngresoVsGasto = async () => {
    const hoy = new Date()
    const hace6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)
    const desde = hace6Meses.toISOString().split('T')[0]

    const [{ data: gastosData }, { data: ingresosData }] = await Promise.all([
      supabase.from('gastos').select('monto, fecha').gte('fecha', desde),
      supabase.from('ingresos').select('monto, fecha').gte('fecha', desde),
    ])

    const meses = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      meses[key] = { mes: MESES[d.getMonth()], gastos: 0, ingresos: 0 }
    }

    ;(gastosData || []).forEach(g => {
      const key = g.fecha.slice(0, 7)
      if (meses[key]) meses[key].gastos += parseFloat(g.monto)
    })

    ;(ingresosData || []).forEach(i => {
      const key = i.fecha.slice(0, 7)
      if (meses[key]) meses[key].ingresos += parseFloat(i.monto)
    })

    setIngresoVsGasto(Object.values(meses))
  }

  const cargarTotalesMes = async () => {
    const hoy = new Date()
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]

    const [{ data: gastosData }, { data: ingresosData }] = await Promise.all([
      supabase.from('gastos').select('monto').gte('fecha', primerDia),
      supabase.from('ingresos').select('monto').gte('fecha', primerDia),
    ])

    const gastos = (gastosData || []).reduce((acc, g) => acc + parseFloat(g.monto), 0)
    const ingresos = (ingresosData || []).reduce((acc, i) => acc + parseFloat(i.monto), 0)
    setTotales({ gastos, ingresos, balance: ingresos - gastos })
  }

  const saldoTotal = cuentas
  .filter(c => c.tipo !== 'tarjeta_credito')
  .reduce((acc, c) => acc + parseFloat(c.saldo_real || 0), 0)

const deudaTotal = cuentas
  .filter(c => c.tipo === 'tarjeta_credito')
  .reduce((acc, c) => acc + parseFloat(c.saldo_real || 0), 0)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tooltipStyle = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '12px',
    color: '#f1f1f1',
    fontSize: '12px',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-12">

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-yellow-400">💰 FinanzasHogar</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{usuario?.email}</span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">Salir</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Totales del mes */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Este mes</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">Ingresos</p>
              <p className="text-lg font-bold text-green-400">{formatDinero(totales.ingresos)}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">Gastos</p>
              <p className="text-lg font-bold text-red-400">{formatDinero(totales.gastos)}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">Balance</p>
              <p className={`text-lg font-bold ${totales.balance >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                {formatDinero(totales.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Saldo total */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Patrimonio total</p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-white">{formatDinero(saldoTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">en cuentas y efectivo</p>
            </div>
            {deudaTotal > 0 && (
              <div className="text-right">
                <p className="text-lg font-bold text-red-400">-{formatDinero(deudaTotal)}</p>
                <p className="text-xs text-gray-500 mt-1">en tarjetas</p>
              </div>
            )}
          </div>
          {deudaTotal > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">Neto real</p>
                <p className={`font-bold ${saldoTotal - deudaTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatDinero(saldoTotal - deudaTotal)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cuentas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Cuentas</p>
            <button onClick={() => router.push('/cuentas')}
              className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
              Administrar →
            </button>
          </div>
          <div className="space-y-2">
            {cuentas.length === 0 && (
              <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 text-center">
                <p className="text-gray-500 text-sm">No hay cuentas. <button onClick={() => router.push('/cuentas')} className="text-yellow-400">Agregar →</button></p>
              </div>
            )}
            {cuentas.map(c => (
              <div key={c.id} className="bg-gray-900 rounded-2xl px-4 py-3 border border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{TIPOS_ICONO[c.tipo] || '🏦'}</span>
                  <div>
                    <p className="text-sm font-bold">{c.nombre}</p>
                    <p className="text-xs text-gray-500">{c.banco}</p>
                  </div>
                </div>
                <p className={`font-bold text-sm ${c.tipo === 'tarjeta_credito' ? 'text-red-400' : 'text-green-400'}`}>
                  {c.tipo === 'tarjeta_credito' ? '-' : ''}{formatDinero(c.saldo_real || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => router.push('/gastos/nuevo')}
            className="bg-yellow-400 text-gray-950 font-bold rounded-2xl p-4 text-sm hover:bg-yellow-300 transition-colors">
            + Nuevo gasto
          </button>
          <button onClick={() => router.push('/ingresos/nuevo')}
            className="bg-gray-800 text-white font-bold rounded-2xl p-4 text-sm hover:bg-gray-700 transition-colors border border-gray-700">
            + Nuevo ingreso
          </button>
          <button onClick={() => router.push('/gastos')}
            className="bg-gray-800 text-white font-bold rounded-2xl p-4 text-sm hover:bg-gray-700 transition-colors border border-gray-700">
            Ver gastos
          </button>
          <button onClick={() => router.push('/ingresos')}
            className="bg-gray-800 text-white font-bold rounded-2xl p-4 text-sm hover:bg-gray-700 transition-colors border border-gray-700">
            Ver ingresos
          </button>
        </div>

        {/* Gráfico barras: ingresos vs gastos */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-sm font-bold mb-4">Ingresos vs gastos — últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ingresoVsGasto} barGap={4}>
              <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'k'} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [formatDinero(value)]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#4ade80" radius={[6, 6, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico torta: gastos por categoría */}
        {gastosPorCategoria.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-sm font-bold mb-4">Gastos por categoría</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {gastosPorCategoria.map((_, i) => (
                      <Cell key={i} fill={COLORES_TORTA[i % COLORES_TORTA.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [formatDinero(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Leyenda manual */}
            <div className="grid grid-cols-2 gap-1 mt-2">
              {gastosPorCategoria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORES_TORTA[i % COLORES_TORTA.length] }} />
                  <span className="text-xs text-gray-400 truncate">{c.icono} {c.nombre}</span>
                  <span className="text-xs text-gray-500 ml-auto shrink-0">{formatDinero(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}