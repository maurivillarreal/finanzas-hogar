'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TIPOS = {
  caja_ahorro: { label: 'Caja de ahorro', icono: '🏦' },
  cuenta_corriente: { label: 'Cuenta corriente', icono: '🏦' },
  efectivo: { label: 'Efectivo', icono: '💵' },
  billetera_virtual: { label: 'Billetera virtual', icono: '📱' },
  tarjeta_credito: { label: 'Tarjeta de crédito', icono: '💳' },
}

export default function Cuentas() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cuentas, setCuentas] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    banco: '',
    tipo: 'caja_ahorro',
    saldo_inicial: '',
  })
  const [saldoDisplay, setSaldoDisplay] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      await cargarCuentas()
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
    setCuentas(data || [])
  }

  const handleSaldo = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '')
    if (soloNumeros === '') {
      setSaldoDisplay('')
      setForm(f => ({ ...f, saldo_inicial: '' }))
      return
    }
    const numero = parseInt(soloNumeros, 10)
    setForm(f => ({ ...f, saldo_inicial: numero }))
    setSaldoDisplay('$' + numero.toLocaleString('es-AR'))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.nombre || !form.banco) {
      setError('Completá nombre y banco')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('cuentas').insert({
      nombre: form.nombre,
      banco: form.banco,
      tipo: form.tipo,
      saldo_inicial: parseFloat(form.saldo_inicial) || 0,
    })

    if (error) {
      setError('Error al guardar')
      setSaving(false)
      return
    }

    setForm({ nombre: '', banco: '', tipo: 'caja_ahorro', saldo_inicial: '' })
    setSaldoDisplay('')
    setMostrarForm(false)
    await cargarCuentas()
    setSaving(false)
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
          <h1 className="text-lg font-bold text-yellow-400">Cuentas</h1>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="text-sm bg-yellow-400 text-gray-950 font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition-colors">
            + Nueva
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-4">

        {/* Formulario nueva cuenta */}
        {mostrarForm && (
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-700 space-y-4">
            <p className="text-sm font-bold text-yellow-400">Nueva cuenta</p>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Tipo */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TIPOS).map(([key, val]) => (
                    <button key={key} type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: key }))}
                      className={`py-2 px-3 rounded-xl text-sm font-bold transition-colors border text-left ${
                        form.tipo === key
                          ? 'bg-yellow-400 text-gray-950 border-yellow-400'
                          : 'bg-gray-800 text-white border-gray-700 hover:border-gray-500'
                      }`}>
                      {val.icono} {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nombre</label>
                <input type="text" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Cuenta sueldo"
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
              </div>

              {/* Banco */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  {form.tipo === 'tarjeta_credito' ? 'Tarjeta / Emisor' : 'Banco / Entidad'}
                </label>
                <input type="text" value={form.banco}
                  onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                  placeholder={form.tipo === 'tarjeta_credito' ? 'Ej: Visa Galicia' : 'Ej: Banco Galicia'}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
              </div>

              {/* Saldo inicial */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  {form.tipo === 'tarjeta_credito' ? 'Deuda actual' : 'Saldo actual'} <span className="text-gray-600">(opcional)</span>
                </label>
                <input type="text" inputMode="numeric" value={saldoDisplay}
                  onChange={handleSaldo} placeholder="$0"
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-yellow-400 transition-colors" />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setMostrarForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-yellow-400 text-gray-950 hover:bg-yellow-300 transition-colors disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Lista de cuentas */}
        {cuentas.length === 0 && !mostrarForm && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏦</p>
            <p className="text-gray-400 text-sm">No hay cuentas todavía</p>
            <p className="text-gray-600 text-xs mt-1">Tocá "+ Nueva" para agregar</p>
          </div>
        )}

        {cuentas.map(c => (
          <div key={c.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{TIPOS[c.tipo]?.icono || '🏦'}</span>
              <div>
                <p className="font-bold text-sm">{c.nombre}</p>
                <p className="text-xs text-gray-400">{c.banco} · {TIPOS[c.tipo]?.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-green-400">
                ${parseFloat(c.saldo_inicial || 0).toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-gray-600">saldo inicial</p>
            </div>
          </div>
        ))}

      </main>
    </div>
  )
}
