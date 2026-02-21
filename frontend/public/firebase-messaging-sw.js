importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDF51FzoLyRU52X4-jXMW1evIr3DKw9vQ8',
  authDomain: 'marcketlainha.firebaseapp.com',
  projectId: 'marcketlainha',
  storageBucket: 'marcketlainha.firebasestorage.app',
  messagingSenderId: '910649841875',
  appId: '1:910649841875:web:3ea1a73381a6914f56dc26',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || 'MarketLajinha', {
    body: body || 'Você tem uma atualização.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/pedidos' },
    requireInteraction: true,
    tag: data.pedidoId || 'pedido',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/pedidos';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
