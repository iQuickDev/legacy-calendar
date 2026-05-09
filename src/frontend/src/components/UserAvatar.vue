<script setup lang="ts">
import Avatar from 'primevue/avatar';
import { uploadsBaseURL } from '../services/API';

defineProps<{
    profilePicture?: string;
    username?: string;
    size?: 'normal' | 'large' | 'xlarge';
    shape?: 'circle' | 'square';
}>();
</script>

<template>
    <Avatar
        :image="profilePicture ? `${uploadsBaseURL}${profilePicture}` : undefined"
        :label="!profilePicture ? username?.charAt(0)?.toUpperCase() || 'U' : undefined"
        :shape="shape || 'circle'"
        :size="size"
        class="bg-primary text-primary-contrast border border-white/10"
        :pt="{
            image: {
                draggable: false
            }
        }"
    />
</template>
