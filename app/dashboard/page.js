'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUsuario(session.user)
      setLoading(false)
    }
    checkSession()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-yellow-400">💰 FinanzasHogar</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{usuario?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Bienvenida */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">Bienvenido 👋</h2>
          <p className="text-gray-400 text-sm">Acá vas a ver el resumen de tus finanzas.</p>
        </div>

        {/* Cards de resumen */}
        <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-xs text-gray-400 mb-1">Ingresos del mes</p>
            <p className="text-2xl font-bold text-green-400">$0</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-xs text-gray-400 mb-1">Gastos del mes</p>
            <p className="text-2xl font-bold text-red-400">$0</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-xs text-gray-400 mb-1">Balance</p>
            <p className="text-2xl font-bold text-yellow-400">$0</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-xs text-gray-400 mb-1">En cuentas</p>
            <p className="text-2xl font-bold text-white">$0</p>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <button
            onClick={() => router.push('/gastos/nuevo')}
            className="bg-yellow-400 text-gray-950 font-bold rounded-2xl p-5 text-sm hover:bg-yellow-300 transition-colors"
          >
            + Nuevo gasto
          </button>
          <button
            onClick={() => router.push('/ingresos/nuevo')}
            className="bg-gray-800 text-white font-bold rounded-2xl p-5 text-sm hover:bg-gray-700 transition-colors border border-gray-700"
          >
            + Nuevo ingreso
          </button>
          <button
            onClick={() => router.push('/gastos')}
            className="bg-gray-800 text-white font-bold rounded-2xl p-5 text-sm hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Ver gastos
          </button>
          <button
            onClick={() => router.push('/cuentas')}
            className="bg-gray-800 text-white font-bold rounded-2xl p-5 text-sm hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Cuentas
          </button>
        </div>

      </main>
    </div>
  )
}