import { precacheAndRoute } from 'workbox-precaching';
import { cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { notificationStorage } from './services/notificationStorage';
import { NotificationCode } from './types/Notification';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

const firebaseConfig = {
    apiKey: 'AIzaSyCzD5NBdz225UzdI535-8PSVmK5ZFJNusM',
    authDomain: 'legacy-calendar-2cd17.firebaseapp.com',
    projectId: 'legacy-calendar-2cd17',
    storageBucket: 'legacy-calendar-2cd17.firebasestorage.app',
    messagingSenderId: '226334477513',
    appId: '1:226334477513:web:f6af99c44e7d874889d118',
    measurementId: 'G-E7T9QQW8ME'
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, async (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Filter by category
    const category = payload.data?.category as NotificationCode | undefined;
    if (category) {
        const settings = await notificationStorage.getSettings();
        if (settings[category] === false) {
            console.log(`[firebase-messaging-sw.js] Notification category "${category}" is disabled. Skipping.`);
            return;
        }
    }

    const notificationTitle = payload.notification?.title || payload.data?.title || 'New Message';
    const notificationOptions: NotificationOptions = {
        body: payload.notification?.body || payload.data?.body,
        icon: '/icon.png',
        data: payload.data // Pass through the data so it's available in notificationclick
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window/tab
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
