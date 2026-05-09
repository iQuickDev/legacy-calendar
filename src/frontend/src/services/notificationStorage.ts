import { NotificationCode, type NotificationSettings } from '../types/Notification';

const DB_NAME = 'notification-settings-db';
const STORE_NAME = 'settings';
const DB_VERSION = 1;

/**
 * Simple IndexedDB wrapper for notification settings.
 */
export const notificationStorage = {
    async openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    },

    async getSettings(): Promise<NotificationSettings> {
        const defaultSettings: NotificationSettings = {
            [NotificationCode.INVITATION_NEW]: true,
            [NotificationCode.EVENT_UPDATED]: true,
            [NotificationCode.EVENT_CANCELLED]: true,
            [NotificationCode.PARTICIPATION_ACCEPTED]: true,
            [NotificationCode.PARTICIPATION_UPDATED]: true,
            [NotificationCode.PARTICIPATION_CANCELLED]: true,
            [NotificationCode.PARTICIPANT_JOINED]: true
        };

        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get('notificationSettings');
                request.onsuccess = () => {
                    const savedSettings = request.result;
                    resolve(savedSettings ? { ...defaultSettings, ...savedSettings } : defaultSettings);
                };
                request.onerror = () => resolve(defaultSettings);
            });
        } catch (error) {
            console.warn('Failed to open IndexedDB for notification settings, using defaults.', error);
            return defaultSettings;
        }
    },

    async saveSettings(settings: NotificationSettings): Promise<void> {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(settings, 'notificationSettings');
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to save notification settings to IndexedDB', error);
            throw error;
        }
    }
};
