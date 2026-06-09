'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDinero, formatFecha } from '@/lib/formato'
import { calcularSaldosCuentas } from '@/lib/saldos'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const TIPOS_ICONO = {
  caja_ahorro: '🏦',
  cuenta_corriente: '🏦',
  efectivo: '💵',
  billetera_virtual: '📱',
  tarjeta_credito: '💳',
}

const TIPOS_LABEL = {
  caja_ahorro: 'Caja de ahorro',
  cuenta_corriente: 'Cta. corriente',
  efectivo: 'Efectivo',
  billetera_virtual: 'Billetera virtual',
  tarjeta_credito: 'Tarjeta',
}

const COLORES_TORTA = ['#facc15','#4ade80','#f87171','#60a5fa','#c084fc','#fb923c','#34d399','#f472b6','#a78bfa','#38bdf8']
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const COLOR_MAURI = '#60a5fa'
const COLOR_FLOR = '#f472b6'
const ID_MAURI = 'ce653f49-526e-40ac-8220-b79f7965bef2'
const ID_FLOR = '5c7f2dfa-2962-4f31-ae18-c0e199f99aa2'

const COLORES_MEDIOS = ['#60a5fa','#f472b6','#4ade80','#facc15','#c084fc']

export default function Dashboard() {
  const router = useRouter()
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cuentas, setCuentas] = useState([])
  const [ultimosMovimientos, setUltimosMovimientos] = useState([])
  const [gastosPorCategoria, setGastosPorCategoria] = useState([])
  const [gastosPorPersona, setGastosPorPersona] = useState([])
  const [gastosPorMedio, setGastosPorMedio] = useState([])
  const [ingresoVsGasto, setIngresoVsGasto] = useState([])
  const [totales, setTotales] = useState({ ingresos: 0, gastos: 0, balance: 0 })
  const [presupuestosActivos, setPresupuestosActivos] = useState([])
  const [gastosPresupuestos, setGastosPresupuestos] = useState({})
  const [periodoMedios, setPeriodoMedios] = useState('mes_actual')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUsuario(session.user)
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
      }
      await Promise.all([
        cargarCuentas(),
        cargarUltimosMovimientos(),
        cargarGastosPorCategoria(),
        cargarGastosPorPersona(),
        cargarGastosPorMedio('mes_actual'),
        cargarIngresoVsGasto(),
        cargarTotalesMes(),
        cargarPresupuestosActivos(),
      ])
      setLoading(false)
    }
    init()
  }, [router])

  const cargarCuentas = async () => {
    const { data } = await supabase.from('cuentas').select('*').eq('activa', true).order('nombre')
    if (!data) return
    const cuentasConSaldo = await calcularSaldosCuentas(data)
    setCuentas(cuentasConSaldo)
  }

  const cargarUltimosMovimientos = async () => {
    const [{ data: gastos }, { data: ingresos }] = await Promise.all([
      supabase.from('gastos').select('*, categoria:categorias(nombre, icono), perfil:perfiles!gastos_para_perfil_id_fkey(nombre, id)').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(8),
      supabase.from('ingresos').select('*, perfil:perfiles!ingresos_para_perfil_id_fkey(nombre, id)').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(8),
    ])
    const movimientos = [
      ...(gastos || []).map(g => ({ ...g, tipo: 'gasto' })),
      ...(ingresos || []).map(i => ({ ...i, tipo: 'ingreso' })),
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || new Date(b.created_at) - new Date(a.created_at)).slice(0, 8)
    setUltimosMovimientos(movimientos)
  }

  const cargarGastosPorCategoria = async () => {
    const hoy = new Date()
    const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
    const { data } = await supabase.from('gastos').select('monto, categoria:categorias(nombre, icono)').gte('fecha', desde)
    if (!data) return
    const agrupado = {}
    data.forEach(g => {
      const nombre = g.categoria?.nombre || 'Sin categoría'
      const icono = g.categoria?.icono || '📦'
      if (!agrupado[nombre]) agrupado[nombre] = { nombre, icono, value: 0 }
      agrupado[nombre].value += parseFloat(g.monto)
    })
    setGastosPorCategoria(Object.values(agrupado).sort((a, b) => b.value - a.value).slice(0, 8))
  }

  const cargarGastosPorPersona = async () => {
    const hoy = new Date()
    const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
    const { data } = await supabase.from('gastos').select('monto, para_perfil_id').gte('fecha', desde)
    if (!data) return
    const mauri = data.filter(g => g.para_perfil_id === ID_MAURI).reduce((acc, g) => acc + parseFloat(g.monto), 0)
    const flor = data.filter(g => g.para_perfil_id === ID_FLOR).reduce((acc, g) => acc + parseFloat(g.monto), 0)
    setGastosPorPersona([
      { nombre: 'Mauri', value: mauri, color: COLOR_MAURI },
      { nombre: 'Flor', value: flor, color: COLOR_FLOR },
    ])
  }

  const cargarGastosPorMedio = async (periodo = 'mes_actual') => {
    const hoy = new Date()
    let desde

    if (periodo === 'mes_actual') {
      desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
    } else if (periodo === '3_meses') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1).toISOString().split('T')[0]
    } else if (periodo === '6_meses') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1).toISOString().split('T')[0]
    } else if (periodo === 'este_anio') {
      desde = `${hoy.getFullYear()}-01-01`
    } else {
      desde = '2000-01-01'
    }

    const { data } = await supabase
      .from('gastos')
      .select('monto, cuenta:cuentas(nombre, tipo)')
      .gte('fecha', desde)

    if (!data) return

    const agrupado = {}
    data.forEach(g => {
      const tipo = g.cuenta?.tipo || 'sin_cuenta'
      const label = g.cuenta ? (TIPOS_LABEL[g.cuenta.tipo] || g.cuenta.tipo) : 'Sin cuenta'
      if (!agrupado[tipo]) agrupado[tipo] = { nombre: label, value: 0 }
      agrupado[tipo].value += parseFloat(g.monto)
    })
    setGastosPorMedio(Object.values(agrupado).sort((a, b) => b.value - a.value))
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
    ;(gastosData || []).forEach(g => { const key = g.fecha.slice(0, 7); if (meses[key]) meses[key].gastos += parseFloat(g.monto) })
    ;(ingresosData || []).forEach(i => { const key = i.fecha.slice(0, 7); if (meses[key]) meses[key].ingresos += parseFloat(i.monto) })
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

  const cargarPresupuestosActivos = async () => {
    const hoy = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('presupuestos')
      .select('*, categoria:categorias(nombre, icono)')
      .lte('fecha_desde', hoy)
      .gte('fecha_hasta', hoy)
    if (!data) return
    setPresupuestosActivos(data)
    const agrupado = {}
    await Promise.all(data.map(async (p) => {
      const { data: gastos } = await supabase
        .from('gastos').select('monto')
        .eq('categoria_id', p.categoria_id)
        .gte('fecha', p.fecha_desde)
        .lte('fecha', p.fecha_hasta)
      agrupado[p.id] = (gastos || []).reduce((acc, g) => acc + parseFloat(g.monto), 0)
    }))
    setGastosPresupuestos(agrupado)
  }

  const saldoTotal = cuentas.filter(c => c.tipo !== 'tarjeta_credito').reduce((acc, c) => acc + parseFloat(c.saldo_real || 0), 0)
  const deudaTotal = cuentas.filter(c => c.tipo === 'tarjeta_credito').reduce((acc, c) => acc + parseFloat(c.saldo_real || 0), 0)
  const presupuestosExcedidos = presupuestosActivos.filter(p => (gastosPresupuestos[p.id] || 0) > parseFloat(p.monto_limite))

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
    <div className="min-h-screen bg-gray-950 text-white pb-24">

      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-yellow-400">💰 FinanzasHogar</h1>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">Salir</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

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

        {/* Patrimonio total */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Patrimonio total</p>
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
            <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center">
              <p className="text-xs text-gray-400">Neto real</p>
              <p className={`font-bold ${saldoTotal - deudaTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatDinero(saldoTotal - deudaTotal)}
              </p>
            </div>
          )}
        </div>

        {/* Cuentas + Últimos movimientos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Cuentas</p>
              <button onClick={() => router.push('/cuentas')} className="text-xs text-yellow-400">→</button>
            </div>
            <div className="space-y-2">
              {cuentas.length === 0 && <p className="text-xs text-gray-600">Sin cuentas</p>}
              {cuentas.map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{TIPOS_ICONO[c.tipo] || '🏦'}</span>
                    <p className="text-xs text-gray-300 truncate">{c.nombre}</p>
                  </div>
                  <p className={`text-xs font-bold shrink-0 ml-1 ${c.tipo === 'tarjeta_credito' ? 'text-red-400' : 'text-green-400'}`}>
                    {c.tipo === 'tarjeta_credito' ? '-' : ''}{formatDinero(c.saldo_real || 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Últimos mov.</p>
            <div className="space-y-2">
              {ultimosMovimientos.length === 0 && <p className="text-xs text-gray-600">Sin movimientos</p>}
              {ultimosMovimientos.slice(0, 6).map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{m.tipo === 'gasto' ? (m.categoria?.icono || '💸') : '💵'}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300 truncate">{m.descripcion}</p>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: m.perfil?.id === ID_MAURI ? COLOR_MAURI : COLOR_FLOR }} />
                        <p className="text-xs text-gray-600">{formatFecha(m.fecha)}</p>
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs font-bold shrink-0 ${m.tipo === 'gasto' ? 'text-red-400' : 'text-green-400'}`}>
                    {m.tipo === 'gasto' ? '-' : '+'}{formatDinero(m.monto)}
                  </p>
                </div>
              ))}
            </div>
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
        </div>

        {/* Presupuestos activos */}
        {presupuestosActivos.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Presupuestos activos</p>
              <button onClick={() => router.push('/presupuestos')} className="text-xs text-yellow-400">Ver todos →</button>
            </div>
            {presupuestosExcedidos.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <p className="text-xs text-red-400 font-bold">⚠️ {presupuestosExcedidos.length} presupuesto{presupuestosExcedidos.length > 1 ? 's' : ''} excedido{presupuestosExcedidos.length > 1 ? 's' : ''}</p>
                <p className="text-xs text-red-300 mt-0.5">{presupuestosExcedidos.map(p => p.categoria?.nombre).join(', ')}</p>
              </div>
            )}
            <div className="space-y-3">
              {presupuestosActivos.map(p => {
                const gastado = gastosPresupuestos[p.id] || 0
                const limite = parseFloat(p.monto_limite)
                const porcentaje = Math.min((gastado / limite) * 100, 100)
                const excedido = gastado > limite
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{p.categoria?.icono}</span>
                        <p className="text-xs font-bold">{p.categoria?.nombre}</p>
                      </div>
                      <p className={`text-xs font-bold ${excedido ? 'text-red-400' : 'text-gray-300'}`}>
                        {formatDinero(gastado)} <span className="text-gray-600 font-normal">/ {formatDinero(limite)}</span>
                      </p>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${excedido ? 'bg-red-500' : porcentaje > 80 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Gastos por persona */}
        {(gastosPorPersona[0]?.value > 0 || gastosPorPersona[1]?.value > 0) && (
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-sm font-bold mb-4">Gastos por persona — este mes</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={gastosPorPersona} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {gastosPorPersona.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatDinero(value)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 shrink-0">
                {gastosPorPersona.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <div>
                      <p className="text-xs font-bold">{p.nombre}</p>
                      <p className="text-xs text-gray-400">{formatDinero(p.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ingresos vs gastos */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-sm font-bold mb-4">Ingresos vs gastos — últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ingresoVsGasto} barGap={4}>
              <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatDinero(value)]} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#4ade80" radius={[6,6,0,0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gastos por categoría */}
        {gastosPorCategoria.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-sm font-bold mb-4">Gastos por categoría — este mes</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={gastosPorCategoria} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {gastosPorCategoria.map((_, i) => <Cell key={i} fill={COLORES_TORTA[i % COLORES_TORTA.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatDinero(value), name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {gastosPorCategoria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORES_TORTA[i % COLORES_TORTA.length] }} />
                  <span className="text-xs text-gray-400 truncate">{c.icono} {c.nombre}</span>
                  <span className="text-xs text-gray-500 ml-auto shrink-0">{formatDinero(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gastos por medio de pago */}
        {gastosPorMedio.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold">Gastos por medio de pago</p>
            </div>
            <select
              value={periodoMedios}
              onChange={e => {
                setPeriodoMedios(e.target.value)
                cargarGastosPorMedio(e.target.value)
              }}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 mb-4">
              <option value="mes_actual">Este mes</option>
              <option value="3_meses">Últimos 3 meses</option>
              <option value="6_meses">Últimos 6 meses</option>
              <option value="este_anio">Este año</option>
              <option value="historico">Todo el historial</option>
            </select>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gastosPorMedio} layout="vertical" barGap={4}>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} />
                <YAxis type="category" dataKey="nombre" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatDinero(value)]} />
                <Bar dataKey="value" name="Monto" radius={[0,6,6,0]}>
                  {gastosPorMedio.map((_, i) => <Cell key={i} fill={COLORES_MEDIOS[i % COLORES_MEDIOS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </main>
    </div>
  )
}