// Import Firebase scripts for service worker (latest version)
importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-messaging-compat.js');

// Initialize Firebase in service worker
const firebaseConfig = {
  apiKey: "AIzaSyAB3FKe70tGitiH23qLJY7jU_gLAxzjWhc",
  authDomain: "ccc-serevices.firebaseapp.com",
  projectId: "ccc-serevices",
  storageBucket: "ccc-serevices.firebasestorage.app",
  messagingSenderId: "925368974020",
  appId: "1:925368974020:web:466fb76f93fec73d76a791",
  measurementId: "G-NK49CFN1YH"
};

try {
  firebase.initializeApp(firebaseConfig);
  console.log('[firebase-messaging-sw.js] Firebase initialized successfully');
} catch (error) {
  console.error('[firebase-messaging-sw.js] Firebase initialization failed:', error);
}

// Get messaging instance
let messaging;
try {
  messaging = firebase.messaging();
  console.log('[firebase-messaging-sw.js] Messaging instance created successfully');
} catch (error) {
  console.error('[firebase-messaging-sw.js] Failed to create messaging instance:', error);
}

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'CCC Services Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/assets/images/logo.png',
    badge: '/assets/images/logo.png',
    tag: 'ccc-notification',
    data: payload.data,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/assets/images/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/assets/images/dismiss-icon.png'
      }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.error('[firebase-messaging-sw.js] Messaging instance not available, background messages will not work');
}

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification clicked: ', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Handle view action
    event.waitUntil(
      clients.matchAll({
        type: 'window'
      }).then(function(clientList) {
        // If a Window tab matching the targeted URL already exists, focus that;
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, then open the target URL in a new window/tab.
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Handle dismiss action
    console.log('Notification dismissed');
  } else {
    // Default click action
    event.waitUntil(
      clients.matchAll({
        type: 'window'
      }).then(function(clientList) {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Handle notification close events
self.addEventListener('notificationclose', function(event) {
  console.log('[firebase-messaging-sw.js] Notification closed: ', event);
});
