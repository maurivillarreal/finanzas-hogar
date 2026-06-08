import './globals.css'

export const metadata = {
  title: 'FinanzasHogar',
  description: 'Gestión financiera familiar',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}