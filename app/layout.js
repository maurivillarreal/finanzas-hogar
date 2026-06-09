import './globals.css'
import NavBar from '@/components/NavBar'

export const metadata = {
  title: 'FinanzasHogar',
  description: 'Gestión financiera familiar',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinanzasHogar',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#ffff00',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FinanzasHogar" />
        <meta name="theme-color" content="#ffff00" />
      </head>
      <body className="bg-gray-950 text-white antialiased pb-20">
        {children}
        <NavBar />
      </body>
    </html>
  )
}
