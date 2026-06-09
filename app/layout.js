import './globals.css'
import NavBar from '@/components/NavBar'

export const metadata = {
  title: 'FinanzasHogar',
  description: 'Gestión financiera familiar',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-white antialiased pb-20">
        {children}
        <NavBar />
      </body>
    </html>
  )
}
