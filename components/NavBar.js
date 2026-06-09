'use client'

import { useRouter, usePathname } from 'next/navigation'

const items = [
  { href: '/dashboard', icono: '🏠', label: 'Inicio' },
  { href: '/gastos', icono: '💸', label: 'Gastos' },
  { href: '/ingresos', icono: '💵', label: 'Ingresos' },
  { href: '/presupuestos', icono: '🎯', label: 'Metas' },
  { href: '/cuentas', icono: '🏦', label: 'Cuentas' },
]

export default function NavBar() {
  const router = useRouter()
  const pathname = usePathname()

  // No mostrar en login
  if (pathname === '/login') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40">
      <div className="max-w-lg mx-auto flex items-stretch">
        {items.map(item => {
          const activo = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                activo
                  ? 'text-yellow-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="text-xl">{item.icono}</span>
              <span className="text-xs font-bold">{item.label}</span>
            </button>
          )
        })}
      </div>
      {/* Safe area para iPhone */}
      <div className="h-safe-area-inset-bottom bg-gray-900" />
    </nav>
  )
}
