'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NuevoGasto() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [usuario, setUsuario] = useState(null)
  const [perfiles, setPerfiles] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cuentas, setCuentas] = useState([])
  const [montoDisplay, setMontoDisplay] = useState('')
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null)

  const hoy = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    descripcion: '',
    monto: '',
    fecha: hoy,
    categoria_id: '',
    cuenta_id: '',
    notas: '',
    para_perfil_id: '',
    es_cuota: false,
    cuotas_total: 1,
    tiene_interes: false,
    interes_porcentaje: 0,
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUsuario(session.user)

      const { data: perfilesData } = await supabase.from('perfiles').select('*')
      const { data: categoriasData } = await supabase.from('categorias').select('*').eq('activa', true).order('nombre')
      const { data: cuentasData } = await supabase.from('cuentas').select('*').eq('activa', true).order('nombre')

      setPerfiles(perfilesData || [])
      setCategorias(categoriasData || [])
      setCuentas(cuentasData || [])

      const miPerfil = perfilesData?.find(p => p.id === session.user.id)
      if (miPerfil) setForm(f => ({ ...f, para_perfil_id: miPerfil.id }))

      setLoading(false)
    }
    init()
  }, [router])

  const handleMonto = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '')
    if (soloNumeros === '') {
      setMontoDisplay('')
      setForm(f => ({ ...f, monto: '' }))
      return
    }
    const numero = parseInt(soloNumeros, 10)
    setForm(f => ({ ...f, monto: numero }))
    setMontoDisplay('$' + numero.toLocaleString('es-AR'))
  }

  const handleCuenta = (e) => {
    const id = e.target.value
    const cuenta = cuentas.find(c => c.id === id)
    setCuentaSeleccionada(cuenta || null)
    setForm(f => ({ ...f, cuenta_id: id, es_cuota: false, cuotas_total: 1, tiene_interes: false, interes_porcentaje: 0 }))
  }

  const esTarjeta = cuentaSeleccionada?.tipo === 'tarjeta_credito'

  // Calcular monto por cuota
  const montoPorCuota = () => {
    if (!form.monto || form.cuotas_total <= 1) return null
    let monto = parseFloat(form.monto)
    if (form.tiene_interes && form.interes_porcentaje > 0) {
      monto = monto * (1 + form.interes_porcentaje / 100)
    }
    return Math.round(monto / form.cuotas_total)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.descripcion || !form.monto || !form.categoria_id) {
      setError('Completá descripción, monto y categoría')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('gastos').insert({
      perfil_id: usuario.id,
      para_perfil_id: form.para_perfil_id || usuario.id,
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      monto_original: parseFloat(form.monto),
      fecha: form.fecha,
      categoria_id: form.categoria_id || null,
      cuenta_id: form.cuenta_id || null,
      notas: form.notas || null,
      es_cuota: esTarjeta ? form.es_cuota : false,
      cuotas_total: esTarjeta && form.es_cuota ? form.cuotas_total : 1,
      cuota_numero: 1,
      tiene_interes: esTarjeta && form.es_cuota ? form.tiene_interes : false,
      interes_porcentaje: esTarjeta && form.es_cuota && form.tiene_interes ? form.interes_porcentaje : 0,
    })

    if (error) {
      setError('Error al guardar. Intentá de nuevo.')
      setSaving(false)
      return
    }

    router.push('/dashboard')
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
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">← Volver</button>
          <h1 className="text-lg font-bold text-yellow-400">Nuevo gasto</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Para quién */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">¿Para quién?</label>
            <div className="flex gap-3">
              {perfiles.map(p => (
                <button key={p.id} type="button"
                  onClick={() => setForm(f => ({ ...f, para_perfil_id: p.id }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${
                    form.para_perfil_id === p.id
                      ? 'bg-yellow-400 text-gray-950 border-yellow-400'
                      : 'bg-gray-800 text-white border-gray-700 hover:border-gray-500'
                  }`}>
                  {p.nombre} {p.id === usuario?.id ? '(yo)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Descripción</label>
            <input type="text" value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Ej: Compra del mes"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Monto total</label>
            <input type="text" inputMode="numeric" value={montoDisplay}
              onChange={handleMonto} placeholder="$0"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Categoría</label>
            <select value={form.categoria_id}
              onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors">
              <option value="">Seleccioná una categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Cuenta */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Cuenta / Banco <span className="text-gray-600">(opcional)</span></label>
            <select value={form.cuenta_id} onChange={handleCuenta}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors">
              <option value="">Sin cuenta asignada</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>
                  {c.tipo === 'tarjeta_credito' ? '💳' : '🏦'} {c.nombre} — {c.banco}
                </option>
              ))}
            </select>
          </div>

          {/* Cuotas — solo si es tarjeta */}
          {esTarjeta && (
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 space-y-4">
              <p className="text-sm font-bold text-yellow-400">💳 Opciones de tarjeta</p>

              {/* ¿En cuotas? */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">¿En cuotas?</label>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, es_cuota: !f.es_cuota, cuotas_total: 1, tiene_interes: false, interes_porcentaje: 0 }))}
                  className={`w-12 h-6 rounded-full transition-colors ${form.es_cuota ? 'bg-yellow-400' : 'bg-gray-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${form.es_cuota ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {form.es_cuota && (
                <>
                  {/* Cantidad de cuotas */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Cantidad de cuotas</label>
                    <div className="flex gap-2 flex-wrap">
                      {[2, 3, 6, 9, 12, 18, 24].map(n => (
                        <button key={n} type="button"
                          onClick={() => setForm(f => ({ ...f, cuotas_total: n }))}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${
                            form.cuotas_total === n
                              ? 'bg-yellow-400 text-gray-950 border-yellow-400'
                              : 'bg-gray-700 text-white border-gray-600 hover:border-gray-400'
                          }`}>
                          {n}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ¿Tiene interés? */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-300">¿Tiene interés?</label>
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, tiene_interes: !f.tiene_interes, interes_porcentaje: 0 }))}
                      className={`w-12 h-6 rounded-full transition-colors ${form.tiene_interes ? 'bg-yellow-400' : 'bg-gray-600'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${form.tiene_interes ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {form.tiene_interes && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Interés total (%)</label>
                      <input type="number" value={form.interes_porcentaje}
                        onChange={e => setForm(f => ({ ...f, interes_porcentaje: parseFloat(e.target.value) || 0 }))}
                        placeholder="Ej: 45"
                        min="0" step="0.1"
                        className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:outline-none focus:border-yellow-400 transition-colors" />
                    </div>
                  )}

                  {/* Resumen cuotas */}
                  {form.monto && form.cuotas_total > 1 && (
                    <div className="bg-gray-900 rounded-xl p-3 text-sm">
                      <div className="flex justify-between text-gray-400 mb-1">
                        <span>Monto total</span>
                        <span className="text-white">${parseFloat(form.monto).toLocaleString('es-AR')}</span>
                      </div>
                      {form.tiene_interes && form.interes_porcentaje > 0 && (
                        <div className="flex justify-between text-gray-400 mb-1">
                          <span>Con interés ({form.interes_porcentaje}%)</span>
                          <span className="text-red-400">${Math.round(parseFloat(form.monto) * (1 + form.interes_porcentaje / 100)).toLocaleString('es-AR')}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t border-gray-700 pt-1 mt-1">
                        <span className="text-yellow-400">{form.cuotas_total} cuotas de</span>
                        <span className="text-yellow-400">${montoPorCuota()?.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Fecha */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Fecha</label>
            <input type="date" value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Nota <span className="text-gray-600">(opcional)</span></label>
            <input type="text" value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Ej: Buzo para Sara"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-yellow-400 text-gray-950 font-bold py-4 rounded-xl text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : 'Guardar gasto'}
          </button>

        </form>
      </main>
    </div>
  )
}