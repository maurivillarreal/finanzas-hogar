'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatFecha, formatDinero } from '@/lib/formato'

export default function Gastos() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [gastos, setGastos] = useState([])
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      await cargarGastos()
      setLoading(false)
    }
    init()
  }, [router])

  const cargarGastos = async () => {
    const { data } = await supabase
      .from('gastos')
      .select(`
        *,
        categoria:categorias(nombre, icono),
        cuenta:cuentas(nombre, banco),
        perfil:perfiles!gastos_para_perfil_id_fkey(nombre)
      `)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    setGastos(data || [])
  }

  const handleEliminar = async () => {
    if (!confirmarEliminar) return
    setEliminando(true)

    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', confirmarEliminar.id)

    if (!error) {
      setGastos(g => g.filter(x => x.id !== confirmarEliminar.id))
    }

    setConfirmarEliminar(null)
    setEliminando(false)
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

      <main className="max-w-lg mx-auto px-4 py-6 space-y-3">

        {gastos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">💸</p>
            <p className="text-gray-400 text-sm">No hay gastos todavía</p>
            <p className="text-gray-600 text-xs mt-1">Tocá "+ Nuevo" para agregar</p>
          </div>
        )}

        {gastos.map(g => (
          <div key={g.id} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex items-start justify-between gap-3">

              {/* Info principal */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-2xl mt-0.5">{g.categoria?.icono || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{g.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {g.categoria?.nombre || 'Sin categoría'} · {g.perfil?.nombre || '—'}
                  </p>
                  {g.notas && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">"{g.notas}"</p>
                  )}
                  {g.cuenta && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {g.cuenta.tipo === 'tarjeta_credito' ? '💳' : '🏦'} {g.cuenta.nombre}
                    </p>
                  )}
                  {g.es_cuota && (
                    <p className="text-xs text-yellow-500 mt-0.5">
                      {g.cuotas_total} cuotas
                      {g.tiene_interes ? ` · ${g.interes_porcentaje}% interés` : ' · sin interés'}
                    </p>
                  )}
                </div>
              </div>

              {/* Monto y fecha */}
              <div className="text-right shrink-0">
                <p className="font-bold text-red-400">{formatDinero(g.monto)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatFecha(g.fecha)}</p>
                <button
                  onClick={() => setConfirmarEliminar(g)}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors mt-1.5">
                  Eliminar
                </button>
              </div>

            </div>
          </div>
        ))}

      </main>

      {/* Modal confirmar eliminar */}
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
              <button
                onClick={() => setConfirmarEliminar(null)}
                disabled={eliminando}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-800 text-white border border-gray-700 hover:border-gray-500 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={eliminando}
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
