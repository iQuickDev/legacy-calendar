<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { router } from './router/router';
import Header from './components/Header.vue';
import BottomBar from './components/BottomBar.vue';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useSessionStore } from './stores/session';
import { onMessageListener, requestNotificationPermission } from './services/firebase';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const toast = useToast();
const sessionStore = useSessionStore();
const showHeader = computed(() => !['login', 'event-chat'].includes(route.name as string));

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
    onMessageListener((payload) => {
        const title = payload.notification?.title || payload.data?.title || 'New Notification';
        const body = payload.notification?.body || payload.data?.body || 'You have a new message';
        toast.add({
            severity: 'info',
            summary: title,
            detail: body,
            life: 5000
        });
    });

    // get the page's title and add "(DEV)" to it if in dev mode
    if (import.meta.env.DEV) {
        document.title = `${document.title} (DEV)`;
    }
});

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
    <Header v-if="showHeader" />
    <main class="relative block w-full overflow-x-hidden">
        <router-view v-slot="{ Component }">
            <transition :name="transitionName" mode="out-in">
                <component :is="Component" :key="route.path" />
            </transition>
        </router-view>
    </main>
    <BottomBar v-if="showHeader" />
</template>

<style scoped></style>
