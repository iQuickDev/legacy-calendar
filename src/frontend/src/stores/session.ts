import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Session } from '../types/Session';
import api from '../services/API';
import type { AuthLoginDto } from '../types/Auth';
import type { User } from '../types/User';

export const useSessionStore = defineStore('session', () => {
    const session = ref<Session>({} as Session);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const isAuthenticated = computed(() => !!session.value.token);
    const currentUser = computed(() => session.value.user);

    function save() {
        localStorage.setItem('token', session.value.token);
    }

    async function login(credentials: AuthLoginDto) {
        loading.value = true;
        error.value = null;
        try {
            const loginResponse = await api.login(credentials);
            const token = loginResponse.data.access_token;

            // Store token
            localStorage.setItem('token', token);
            session.value.token = token;

            // Fetch user profile
            const profileResponse = await api.getProfile();
            session.value.user = profileResponse.data;

            return true;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Login failed. Please check your credentials.';
            localStorage.removeItem('token');
            session.value = {} as Session;
            return false;
        } finally {
            loading.value = false;
        }
    }

    async function load() {
        const token = localStorage.getItem('token') ?? null;

        if (!token) {
            return false;
        }
        loading.value = true;
        error.value = null;
        try {
            session.value.token = token;
            const response = await api.getProfile();
            session.value = {
                token,
                user: response.data
            };
            return true;
        } catch {
            // Token is invalid or expired
            error.value = 'Session expired. Please log in again.';
            localStorage.removeItem('token');
            session.value = {} as Session;
            return false;
        } finally {
            loading.value = false;
        }
    }

    async function logout() {
        const fcmToken = localStorage.getItem('fcm_token');
        if (fcmToken) {
            try {
                await api.unsubscribeNotifications(fcmToken);
            } catch (err) {
                console.warn('Failed to unsubscribe from notifications on logout:', err);
            } finally {
                localStorage.removeItem('fcm_token');
            }
        }
        session.value = {} as Session;
        localStorage.removeItem('token');
    }

    function clearError() {
        error.value = null;
    }

    async function updateProfile(updates: Partial<User>) {
        if (session.value.user) {
            session.value.user = { ...session.value.user, ...updates };
        }
    }

    async function changePassword(currentPassword: string, newPassword: string) {
        try {
            loading.value = true;
            await api.changePassword({ currentPassword, newPassword });
            return true;
        } catch (error: any) {
            console.error('Failed to change password:', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function uploadProfilePicture(file: File) {
        try {
            const response = await api.uploadProfilePicture(file);
            if (session.value.user) {
                session.value.user = {
                    ...session.value.user,
                    profilePicture: `${response.data.profilePicture}?t=${Date.now()}`
                };
            }
            return true;
        } catch (error) {
            console.error('Failed to upload profile picture:', error);
            throw error;
        }
    }

    async function removeProfilePicture() {
        try {
            await api.removeProfilePicture();
            if (session.value.user) {
                session.value.user = {
                    ...session.value.user,
                    profilePicture: undefined
                };
            }
            return true;
        } catch (error) {
            console.error('Failed to remove profile picture:', error);
            throw error;
        }
    }

    return {
        session,
        loading,
        error,
        isAuthenticated,
        currentUser,
        save,
        login,
        load,
        logout,
        clearError,
        updateProfile,
        changePassword,
        uploadProfilePicture,
        removeProfilePicture
    };
});
