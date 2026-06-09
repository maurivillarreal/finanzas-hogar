'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FUENTES = {
  'ce653f49-526e-40ac-8220-b79f7965bef2': ['Kinesiología', 'Vertical', 'Otro'],
  '5c7f2dfa-2962-4f31-ae18-c0e199f99aa2': ['Kinesiología', 'Otro'],
}

export default function NuevoIngreso() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [usuario, setUsuario] = useState(null)
  const [perfiles, setPerfiles] = useState([])
  const [cuentas, setCuentas] = useState([])
  const [montoDisplay, setMontoDisplay] = useState('')

  const hoy = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    descripcion: '',
    monto: '',
    fecha: hoy,
    fuente: '',
    cuenta_id: '',
    notas: '',
    para_perfil_id: '',
    recurrente: false,
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUsuario(session.user)

      const { data: perfilesData } = await supabase.from('perfiles').select('*')
      const { data: cuentasData } = await supabase.from('cuentas').select('*').eq('activa', true).order('nombre')

      setPerfiles(perfilesData || [])
      setCuentas(cuentasData?.filter(c => c.tipo !== 'tarjeta_credito') || [])

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

  const handlePerfilChange = (perfilId) => {
    setForm(f => ({ ...f, para_perfil_id: perfilId, fuente: '' }))
  }

  const fuentesDisponibles = FUENTES[form.para_perfil_id] || ['Kinesiología', 'Otro']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.descripcion || !form.monto || !form.fuente) {
      setError('Completá descripción, monto y fuente')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('ingresos').insert({
      perfil_id: usuario.id,
      para_perfil_id: form.para_perfil_id || usuario.id,
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      fuente: form.fuente,
      cuenta_id: form.cuenta_id || null,
      notas: form.notas || null,
      recurrente: form.recurrente,
    })

    if (error) {
      setError('Error al guardar. Intentá de nuevo.')
      setSaving(false)
      return
    }

    router.push('/ingresos')
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
          <h1 className="text-lg font-bold text-yellow-400">Nuevo ingreso</h1>
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
                  onClick={() => handlePerfilChange(p.id)}
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

          {/* Fuente */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Fuente</label>
            <div className="flex gap-3">
              {fuentesDisponibles.map(f => (
                <button key={f} type="button"
                  onClick={() => setForm(prev => ({ ...prev, fuente: f }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${
                    form.fuente === f
                      ? 'bg-yellow-400 text-gray-950 border-yellow-400'
                      : 'bg-gray-800 text-white border-gray-700 hover:border-gray-500'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Descripción</label>
            <input type="text" value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Ej: Sueldo enero"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Monto</label>
            <input type="text" inputMode="numeric" value={montoDisplay}
              onChange={handleMonto} placeholder="$0"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
          </div>

          {/* Cuenta destino */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Entra en <span className="text-gray-600">(opcional)</span></label>
            <select value={form.cuenta_id}
              onChange={e => setForm(f => ({ ...f, cuenta_id: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors">
              <option value="">Sin cuenta asignada</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>🏦 {c.nombre} — {c.banco}</option>
              ))}
            </select>
          </div>

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
              placeholder="Ej: Pago del mes de enero"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
          </div>

          {/* Recurrente */}
          <div className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
            <div>
              <p className="text-sm font-bold">¿Es recurrente?</p>
              <p className="text-xs text-gray-500">Ingreso que se repite todos los meses</p>
            </div>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, recurrente: !f.recurrente }))}
              className={`w-12 h-6 rounded-full transition-colors ${form.recurrente ? 'bg-yellow-400' : 'bg-gray-600'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${form.recurrente ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-yellow-400 text-gray-950 font-bold py-4 rounded-xl text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : 'Guardar ingreso'}
          </button>

        </form>
      </main>
    </div>
  )
}