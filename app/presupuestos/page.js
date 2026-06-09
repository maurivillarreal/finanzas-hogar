'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDinero, formatFecha } from '@/lib/formato'

export default function Presupuestos() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [presupuestos, setPresupuestos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [gastosAgrupados, setGastosAgrupados] = useState({})
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [error, setError] = useState('')
  const [montoDisplay, setMontoDisplay] = useState('')
  const [filtros, setFiltros] = useState({ categoria_id: '', estado: '' })

  const hoy = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    categoria_id: '',
    monto_limite: '',
    fecha_desde: hoy,
    fecha_hasta: hoy,
    notas: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      await Promise.all([cargarPresupuestos(), cargarCategorias()])
      setLoading(false)
    }
    init()
  }, [router])

  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').eq('activa', true).order('nombre')
    setCategorias(data || [])
  }

  const cargarPresupuestos = async () => {
    const { data } = await supabase
      .from('presupuestos')
      .select('*, categoria:categorias(nombre, icono)')
      .order('fecha_desde', { ascending: false })

    if (!data) return
    setPresupuestos(data)

    // Cargar gastos para cada presupuesto
    const agrupado = {}
    await Promise.all(data.map(async (p) => {
      const { data: gastos } = await supabase
        .from('gastos')
        .select('monto')
        .eq('categoria_id', p.categoria_id)
        .gte('fecha', p.fecha_desde)
        .lte('fecha', p.fecha_hasta)

      agrupado[p.id] = (gastos || []).reduce((acc, g) => acc + parseFloat(g.monto), 0)
    }))
    setGastosAgrupados(agrupado)
  }

  const handleMonto = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '')
    if (soloNumeros === '') {
      setMontoDisplay('')
      setForm(f => ({ ...f, monto_limite: '' }))
      return
    }
    const numero = parseInt(soloNumeros, 10)
    setForm(f => ({ ...f, monto_limite: numero }))
    setMontoDisplay('$' + numero.toLocaleString('es-AR'))
  }

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ categoria_id: '', monto_limite: '', fecha_desde: hoy, fecha_hasta: hoy, notas: '' })
    setMontoDisplay('')
    setError('')
    setMostrarForm(true)
  }

  const abrirEditar = (p) => {
    setEditando(p)
    setForm({
      categoria_id: p.categoria_id,
      monto_limite: p.monto_limite,
      fecha_desde: p.fecha_desde,
      fecha_hasta: p.fecha_hasta,
      notas: p.notas || '',
    })
    setMontoDisplay('$' + Math.round(p.monto_limite).toLocaleString('es-AR'))
    setError('')
    setMostrarForm(true)
  }

  const handleGuardar = async () => {
    if (!form.categoria_id || !form.monto_limite || !form.fecha_desde || !form.fecha_hasta) {
      setError('Completá todos los campos obligatorios')
      return
    }
    if (form.fecha_hasta < form.fecha_desde) {
      setError('La fecha hasta no puede ser menor que la fecha desde')
      return
    }
    setSaving(true)
    setError('')

    if (editando) {
      await supabase.from('presupuestos').update({
        categoria_id: form.categoria_id,
        monto_limite: parseFloat(form.monto_limite),
        fecha_desde: form.fecha_desde,
        fecha_hasta: form.fecha_hasta,
        notas: form.notas || null,
      }).eq('id', editando.id)
    } else {
      await supabase.from('presupuestos').insert({
        categoria_id: form.categoria_id,
        monto_limite: parseFloat(form.monto_limite),
        fecha_desde: form.fecha_desde,
        fecha_hasta: form.fecha_hasta,
        notas: form.notas || null,
      })
    }

    await cargarPresupuestos()
    setMostrarForm(false)
    setEditando(null)
    setSaving(false)
  }

  const handleEliminar = async () => {
    if (!confirmarEliminar) return
    await supabase.from('presupuestos').delete().eq('id', confirmarEliminar.id)
    setPresupuestos(p => p.filter(x => x.id !== confirmarEliminar.id))
    setConfirmarEliminar(null)
  }

  const esPasado = (p) => p.fecha_hasta < hoy
  const esActivo = (p) => p.fecha_desde <= hoy && p.fecha_hasta >= hoy
  const esFuturo = (p) => p.fecha_desde > hoy

  const getEstado = (p) => {
    const gastado = gastosAgrupados[p.id] || 0
    const limite = parseFloat(p.monto_limite)
    const porcentaje = Math.min((gastado / limite) * 100, 100)
    const excedido = gastado > limite
    return { gastado, limite, porcentaje, excedido }
  }

  const getEtiquetaEstado = (p) => {
    if (esActivo(p)) return { label: 'Activo', color: 'text-green-400 bg-green-400/10' }
    if (esFuturo(p)) return { label: 'Próximo', color: 'text-blue-400 bg-blue-400/10' }
    const { excedido } = getEstado(p)
    return excedido
      ? { label: 'Excedido', color: 'text-red-400 bg-red-400/10' }
      : { label: 'Cumplido ✓', color: 'text-yellow-400 bg-yellow-400/10' }
  }

  const presupuestosFiltrados = presupuestos.filter(p => {
    if (filtros.categoria_id && p.categoria_id !== filtros.categoria_id) return false
    if (filtros.estado === 'activo' && !esActivo(p)) return false
    if (filtros.estado === 'pasado' && !esPasado(p)) return false
    if (filtros.estado === 'futuro' && !esFuturo(p)) return false
    return true
  })

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
          <h1 className="text-lg font-bold text-yellow-400">🎯 Presupuestos</h1>
          <button onClick={abrirNuevo}
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
            <select value={filtros.categoria_id}
              onChange={e => setFiltros(f => ({ ...f, categoria_id: e.target.value }))}
              className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400">
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
              ))}
            </select>
            <select value={filtros.estado}
              onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
              className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400">
              <option value="">Todos</option>
              <option value="activo">Activos</option>
              <option value="futuro">Próximos</option>
              <option value="pasado">Pasados</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        {presupuestosFiltrados.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-gray-400 text-sm">No hay presupuestos todavía</p>
            <p className="text-gray-600 text-xs mt-1">Tocá "+ Nuevo" para agregar</p>
          </div>
        )}

        {presupuestosFiltrados.map(p => {
          const estado = getEstado(p)
          const etiqueta = getEtiquetaEstado(p)
          const pasado = esPasado(p)

          return (
            <div key={p.id} className={`bg-gray-900 rounded-2xl p-4 border ${estado.excedido && !esFuturo(p) ? 'border-red-500/50' : 'border-gray-800'}`}>

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.categoria?.icono}</span>
                  <div>
                    <p className="font-bold text-sm">{p.categoria?.nombre}</p>
                    <p className="text-xs text-gray-500">{formatFecha(p.fecha_desde)} → {formatFecha(p.fecha_hasta)}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${etiqueta.color}`}>
                  {etiqueta.label}
                </span>
              </div>

              {/* Montos */}
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-gray-400">Gastado</p>
                <p className={`text-sm font-bold ${estado.excedido ? 'text-red-400' : 'text-white'}`}>
                  {formatDinero(estado.gastado)}
                  <span className="text-gray-500 font-normal"> / {formatDinero(estado.limite)}</span>
                </p>
              </div>

              {/* Barra de progreso */}
              {!esFuturo(p) && (
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      estado.excedido ? 'bg-red-500' :
                      estado.porcentaje > 80 ? 'bg-yellow-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${estado.porcentaje}%` }}
                  />
                </div>
              )}

              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {esFuturo(p) ? 'Aún no comenzó' :
                   estado.excedido
                    ? `⚠️ Excedido por ${formatDinero(estado.gastado - estado.limite)}`
                    : `Resta ${formatDinero(estado.limite - estado.gastado)}`
                  }
                </p>
                {!esFuturo(p) && <p className="text-xs text-gray-500">{Math.round(estado.porcentaje)}%</p>}
              </div>

              {p.notas && (
                <p className="text-xs text-gray-600 italic mt-2">"{p.notas}"</p>
              )}

              {/* Botones — solo si no es pasado */}
              {!pasado && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
                  <button onClick={() => abrirEditar(p)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-gray-400 border border-gray-700 hover:border-yellow-400 hover:text-yellow-400 transition-colors">
                    ✏️ Editar
                  </button>
                  <button onClick={() => setConfirmarEliminar(p)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-gray-400 border border-gray-700 hover:border-red-500 hover:text-red-400 transition-colors">
                    🗑️ Eliminar
                  </button>
                </div>
              )}

              {pasado && (
                <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-800 text-center">
                  Presupuesto cerrado · Solo lectura
                </p>
              )}

            </div>
          )
        })}

      </main>

      {/* Modal nuevo/editar */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto">
            <p className="font-bold text-center">{editando ? 'Editar presupuesto' : 'Nuevo presupuesto'}</p>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Categoría</label>
              <select value={form.categoria_id}
                onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400">
                <option value="">Seleccioná una categoría</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Monto límite</label>
              <input type="text" inputMode="numeric" value={montoDisplay}
                onChange={handleMonto} placeholder="$0"
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400" />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1.5">Desde</label>
                <input type="date" value={form.fecha_desde}
                  onChange={e => setForm(f => ({ ...f, fecha_desde: e.target.value }))}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1.5">Hasta</label>
                <input type="date" value={form.fecha_hasta}
                  onChange={e => setForm(f => ({ ...f, fecha_hasta: e.target.value }))}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Nota <span className="text-gray-600">(opcional)</span></label>
              <input type="text" value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Ej: Reducir gastos de supermercado"
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400" />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setMostrarForm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-800 text-white border border-gray-700 hover:border-gray-500 transition-colors">
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-yellow-400 text-gray-950 hover:bg-yellow-300 transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <p className="font-bold text-lg">¿Eliminar este presupuesto?</p>
              <p className="text-sm text-gray-400 mt-1">{confirmarEliminar.categoria?.nombre}</p>
              <p className="text-xl font-bold text-yellow-400 mt-1">{formatDinero(confirmarEliminar.monto_limite)}</p>
              <p className="text-xs text-gray-600 mt-1">{formatFecha(confirmarEliminar.fecha_desde)} → {formatFecha(confirmarEliminar.fecha_hasta)}</p>
            </div>
            <p className="text-xs text-center text-gray-500">Esta acción no se puede deshacer</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarEliminar(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-800 text-white border border-gray-700 hover:border-gray-500 transition-colors">
                Cancelar
              </button>
              <button onClick={handleEliminar}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-400 transition-colors">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
