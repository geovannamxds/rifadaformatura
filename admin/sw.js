/* Painel da rifa: recebe os avisos no celular (pedido novo e comprovante) */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { corpo: e.data ? e.data.text() : '' }; }
  const op = { body: d.corpo || '', icon: '../img/icone-192.png', data: { url: d.url || '' } };
  if (d.tag) { op.tag = d.tag; op.renotify = true; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Rifa da formatura', op));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || '', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    for (const c of lista) {
      if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) {
        return c.focus().then(cc => (cc && 'navigate' in cc) ? cc.navigate(alvo) : cc).catch(() => self.clients.openWindow(alvo));
      }
    }
    return self.clients.openWindow(alvo);
  }));
});
