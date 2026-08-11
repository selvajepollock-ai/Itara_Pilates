// Service worker mínimo — solo lo necesario para que el navegador considere
// la app "instalable" (requisito técnico de Chrome/Android). No cachea nada
// todavía, así que no hay riesgo de que muestre contenido viejo.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Pass-through: no intercepta nada, solo deja pasar el pedido normal.
})
