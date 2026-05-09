import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/API';
import type { User, CreateUserDto, UpdateUserDto } from '../types/User';

export const useUsersStore = defineStore('users', () => {
    const users = ref<User[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastFetched = ref<number | null>(null);
    const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

    let fetchPromise: Promise<User[]> | null = null;

    async function fetchUsers(force = false) {
        if (!force && lastFetched.value && Date.now() - lastFetched.value < CACHE_TTL) {
            return users.value;
        }

        if (fetchPromise) return fetchPromise;

        fetchPromise = (async () => {
            loading.value = true;
            error.value = null;
            try {
                const response = await api.findAllUsers();
                users.value = response.data;
                lastFetched.value = Date.now();
                return users.value;
            } catch (err: any) {
                error.value = err.response?.data?.message || 'Failed to fetch users';
                console.error('Failed to fetch users:', err);
                return [];
            } finally {
                loading.value = false;
                fetchPromise = null;
            }
        })();

        return fetchPromise;
    }

    async function createUser(dto: CreateUserDto) {
        const response = await api.createUser(dto);
        await fetchUsers(true);
        return response.data;
    }

    async function updateUser(id: number, dto: UpdateUserDto) {
        const response = await api.updateUser(id, dto);
        await fetchUsers(true);
        return response.data;
    }

    async function removeUser(id: number) {
        await api.removeUser(id);
        await fetchUsers(true);
    }

    async function uploadProfilePicture(file: File, userId: number) {
        await api.uploadProfilePicture(file, userId);
        await fetchUsers(true);
    }

    async function removeProfilePicture(userId: number) {
        await api.removeProfilePicture(userId);
        await fetchUsers(true);
    }

    function clearCache() {
        users.value = [];
        lastFetched.value = null;
    }

    return {
        users,
        loading,
        error,
        fetchUsers,
        createUser,
        updateUser,
        removeUser,
        uploadProfilePicture,
        removeProfilePicture,
        clearCache
    };
});
