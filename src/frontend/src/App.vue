<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { router } from './router/router';
import Header from './components/Header.vue';
import BottomBar from './components/BottomBar.vue';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useSessionStore } from './stores/session';
import { onMessageListener, requestNotificationPermission } from './services/firebase';
import { useToast } from 'primevue/usetoast';
import { notificationStorage } from './services/notificationStorage';
import { createLogger } from './services/logger';
import { isKnownNotificationCode, resolveNotificationRoute, shouldSuppressNotification } from './utils/notifications';

const route = useRoute();
const toast = useToast();
const sessionStore = useSessionStore();
const logger = createLogger('App');
const showHeader = computed(() => route.name !== 'login');

type ForegroundNotification = {
    id: number;
    title: string;
    body: string;
    route: string;
    type?: string;
};

const foregroundNotifications = ref<ForegroundNotification[]>([]);
let nextForegroundNotificationId = 0;
const foregroundTimers = new Map<number, number>();

const dismissForegroundNotification = (id: number) => {
    const timer = foregroundTimers.get(id);
    if (timer) {
        window.clearTimeout(timer);
        foregroundTimers.delete(id);
    }

    const index = foregroundNotifications.value.findIndex((item) => item.id === id);
    if (index !== -1) {
        foregroundNotifications.value.splice(index, 1);
    }
};

const pushForegroundNotification = (title: string, body: string, type?: string, eventId?: string) => {
    const id = ++nextForegroundNotificationId;
    const route = resolveNotificationRoute(type, eventId);
    foregroundNotifications.value.unshift({ id, title, body, route, type });

    const timer = window.setTimeout(() => dismissForegroundNotification(id), 5000);
    foregroundTimers.set(id, timer);
};

onMounted(async () => {
    // Check for session expired flag
    if (localStorage.getItem('session_expired') === 'true') {
        localStorage.removeItem('session_expired');
        toast.add({
            severity: 'warn',
            summary: 'Session Expired',
            detail: 'Your session has expired. Please log in again.',
            life: 5000
        });
    }

    const loaded = await sessionStore.load();

    if (loaded) {
        // Register for notifications if logged in
        requestNotificationPermission();

        // If we loaded a session and we are on the login page, redirect to calendar
        if (route.name === 'login') {
            router.push('/calendar');
        }
    }

    // Set up foreground notification listener
    onMessageListener(async (payload) => {
        const type = payload.data?.type;
        const eventId = payload.data?.eventId;
        const title = payload.notification?.title || payload.data?.title || 'New Notification';
        const body = payload.notification?.body || payload.data?.body || 'You have a new message';
        const settings = await notificationStorage.getSettings();

        if (type && !isKnownNotificationCode(type)) {
            logger.warn('Unknown foreground notification type received', { type });
        }

        if (shouldSuppressNotification(type, settings)) {
            logger.debug('Foreground notification suppressed by settings', { type });
            return;
        }

        pushForegroundNotification(title, body, type, eventId);
    });

    // get the page's title and add "(DEV)" to it if in dev mode
    if (import.meta.env.DEV) {
        document.title = `${document.title} (DEV)`;
    }
});

onBeforeUnmount(() => {
    for (const timer of foregroundTimers.values()) {
        window.clearTimeout(timer);
    }
    foregroundTimers.clear();
});

const openForegroundNotification = (notification: ForegroundNotification) => {
    dismissForegroundNotification(notification.id);
    void router.push(notification.route);
};

const transitionName = computed(() => {
    const from = router.previousRoute?.name as string;
    const to = route.name as string;

    const order: Record<string, number> = {
        calendar: 1,
        upcoming: 2,
        profile: 3,
        admin: 4
    };

    if (!from || !to || !order[from] || !order[to]) return 'fade';

    return order[to] > order[from] ? 'slide-left' : 'slide-right';
});
</script>

<template>
    <Toast position="top-right" />
    <ConfirmDialog />
    <div class="fixed top-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        <button
            v-for="notification in foregroundNotifications"
            :key="notification.id"
            type="button"
            class="group rounded-3xl border border-zinc-800/80 bg-zinc-950/95 p-4 text-left shadow-2xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-500/50 hover:bg-zinc-900/95"
            @click="openForegroundNotification(notification)"
        >
            <div class="flex items-start gap-3">
                <div class="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-2xl">
                    <i class="pi pi-bell"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-3">
                        <h3 class="truncate text-sm font-bold text-white">{{ notification.title }}</h3>
                        <span class="text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase"> Open </span>
                    </div>
                    <p class="mt-1 line-clamp-3 text-sm text-zinc-300">
                        {{ notification.body }}
                    </p>
                    <p
                        v-if="notification.type"
                        class="mt-2 font-mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase"
                    >
                        {{ notification.type }}
                    </p>
                </div>
            </div>
        </button>
    </div>
    <Header v-if="showHeader" />
    <main class="relative block w-full overflow-x-hidden">
        <router-view v-slot="{ Component }">
            <transition :name="transitionName" mode="out-in">
                <component :is="Component" />
            </transition>
        </router-view>
    </main>
    <BottomBar v-if="showHeader" />
</template>

<style scoped></style>
