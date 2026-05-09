import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId ? getAnalytics(app) : null;
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export const requestNotificationPermission = async () => {
    if (!messaging) return;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');

            // Wait for the service worker to be ready
            const registration = await navigator.serviceWorker.ready;

            // Get FCM Token
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: registration
            });
            if (token) {
                localStorage.setItem('fcm_token', token);
                // Send the token to your server if needed
                const { default: API } = await import('./API');
                await API.subscribeNotifications(token);
                console.log('FCM Token registered on server.');
            } else {
                console.error('No registration token available. Request permission to generate one.');
            }
        } else {
            console.error('Unable to get permission to notify.');
        }
    } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
    }
};

export const onMessageListener = (callback: (payload: any) => void) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
        console.log('Message received in foreground: ', payload);
        callback(payload);
    });
};

export { app, analytics, messaging };
