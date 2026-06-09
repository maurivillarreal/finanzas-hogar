const CACHE_NAME = 'finanzas-hogar-v1'
const urlsToCache = ['/', '/dashboard', '/gastos', '/ingresos', '/cuentas']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  )
})
