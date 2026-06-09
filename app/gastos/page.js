'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatFecha, formatDinero } from '@/lib/formato'

export default function Gastos() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const hoy = new Date()
  const [filtros, setFiltros] = useState({
    periodo: 'mes_actual',
    mes: hoy.getMonth() + 1,
    anio: hoy.getFullYear(),
    categoria_id: '',
    perfil_id: '',
  })

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const [{ data: categoriasData }, { data: perfilesData }] = await Promise.all([
        supabase.from('categorias').select('*').eq('activa', true).order('nombre'),
        supabase.from('perfiles').select('*'),
      ])

      setCategorias(categoriasData || [])
      setPerfiles(perfilesData || [])
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!loading) cargarGastos()
  }, [filtros, loading])

  const cargarGastos = async () => {
    let desde, hasta

    const ultimoDia = new Date(filtros.anio, filtros.mes, 0).getDate()

    if (filtros.periodo === 'mes_actual') {
      desde = `${filtros.anio}-${String(filtros.mes).padStart(2, '0')}-01`
      hasta = `${filtros.anio}-${String(filtros.mes).padStart(2, '0')}-${ultimoDia}`
    } else if (filtros.periodo === '3_meses') {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)
      desde = d.toISOString().split('T')[0]
      hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0]
    } else if (filtros.periodo === '6_meses') {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)
      desde = d.toISOString().split('T')[0]
      hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0]
    } else if (filtros.periodo === 'este_anio') {
      desde = `${hoy.getFullYear()}-01-01`
      hasta = `${hoy.getFullYear()}-12-31`
    } else if (filtros.periodo === 'historico') {
      desde = '2000-01-01'
      hasta = '2099-12-31'
    }

    let query = supabase
      .from('gastos')
      .select(`*, categoria:categorias(nombre, icono), cuenta:cuentas(nombre, banco, tipo), perfil:perfiles!gastos_para_perfil_id_fkey(nombre)`)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    if (filtros.categoria_id) query = query.eq('categoria_id', filtros.categoria_id)
    if (filtros.perfil_id) query = query.eq('para_perfil_id', filtros.perfil_id)

    const { data } = await query
    setGastos(data || [])
  }

  const handleEliminar = async () => {
    if (!confirmarEliminar) return
    setEliminando(true)
    const { error } = await supabase.from('gastos').delete().eq('id', confirmarEliminar.id)
    if (!error) setGastos(g => g.filter(x => x.id !== confirmarEliminar.id))
    setConfirmarEliminar(null)
    setEliminando(false)
  }

  const totalFiltrado = gastos.reduce((acc, g) => acc + parseFloat(g.monto), 0)

  const mesesDisponibles = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    mesesDisponibles.push({ mes: d.getMonth() + 1, anio: d.getFullYear(), label: `${MESES[d.getMonth()]} ${d.getFullYear()}` })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition-colors">← Volver</button>
          <h1 className="text-lg font-bold text-yellow-400">Gastos</h1>
          <button onClick={() => router.push('/gastos/nuevo')}
            className="text-sm bg-yellow-400 text-gray-950 font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition-colors">
            + Nuevo
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Filtros */}
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Filtros</p>

          <div className="flex gap-2">
            <select
              value={filtros.periodo}
              onChange={e => setFiltros(f => ({ ...f, periodo: e.target.value }))}
              className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400">
              <option value="mes_actual">Este mes</option>
              <option value="3_meses">Últimos 3 meses</option>
              <option value="6_meses">Últimos 6 meses</option>
              <option value="este_anio">Este año</option>
              <option value="historico">Todo el historial</option>
            </select>
            {filtros.periodo === 'mes_actual' && (
              <select
                value={`${filtros.mes}-${filtros.anio}`}
                onChange={e => {
                  const [mes, anio] = e.target.value.split('-')
                  setFiltros(f => ({ ...f, mes: parseInt(mes), anio: parseInt(anio) }))
                }}
                className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400">
                {mesesDisponibles.map(m => (
                  <option key={`${m.mes}-${m.anio}`} value={`${m.mes}-${m.anio}`}>{m.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            {/* Categoría */}
            <select
              value={filtros.categoria_id}
              onChange={e => setFiltros(f => ({ ...f, categoria_id: e.target.value }))}
              className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400">
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
              ))}
            </select>

            {/* Persona */}
            <select
              value={filtros.perfil_id}
              onChange={e => setFiltros(f => ({ ...f, perfil_id: e.target.value }))}
              className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400">
              <option value="">Todos</option>
              {perfiles.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Total filtrado */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-500">{gastos.length} gasto{gastos.length !== 1 ? 's' : ''}</p>
          <p className="text-sm font-bold text-red-400">{formatDinero(totalFiltrado)}</p>
        </div>

        {/* Lista */}
        {gastos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">💸</p>
            <p className="text-gray-400 text-sm">No hay gastos en este período</p>
          </div>
        )}

        {gastos.map(g => (
          <div key={g.id} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-2xl mt-0.5">{g.categoria?.icono || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{g.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {g.categoria?.nombre || 'Sin categoría'} · {g.perfil?.nombre || '—'}
                  </p>
                  {g.notas && <p className="text-xs text-gray-500 mt-0.5 italic">"{g.notas}"</p>}
                  {g.cuenta && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {g.cuenta.tipo === 'tarjeta_credito' ? '💳' : '🏦'} {g.cuenta.nombre}
                    </p>
                  )}
                  {g.es_cuota && (
                    <p className="text-xs text-yellow-500 mt-0.5">
                      {g.cuotas_total} cuotas{g.tiene_interes ? ` · ${g.interes_porcentaje}% interés` : ' · sin interés'}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-red-400">{formatDinero(g.monto)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatFecha(g.fecha)}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
              <button onClick={() => router.push(`/gastos/editar/${g.id}`)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-gray-400 border border-gray-700 hover:border-yellow-400 hover:text-yellow-400 transition-colors">
                ✏️ Editar
              </button>
              <button onClick={() => setConfirmarEliminar(g)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-gray-400 border border-gray-700 hover:border-red-500 hover:text-red-400 transition-colors">
                🗑️ Eliminar
              </button>
            </div>
          </div>
        ))}

      </main>

      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <p className="font-bold text-lg">¿Eliminar este gasto?</p>
              <p className="text-sm text-gray-400 mt-1">{confirmarEliminar.descripcion}</p>
              <p className="text-xl font-bold text-red-400 mt-1">{formatDinero(confirmarEliminar.monto)}</p>
              <p className="text-xs text-gray-600 mt-1">{formatFecha(confirmarEliminar.fecha)}</p>
            </div>
            <p className="text-xs text-center text-gray-500">Esta acción no se puede deshacer</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarEliminar(null)} disabled={eliminando}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-800 text-white border border-gray-700 hover:border-gray-500 transition-colors">
                Cancelar
              </button>
              <button onClick={handleEliminar} disabled={eliminando}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-400 transition-colors disabled:opacity-50">
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}