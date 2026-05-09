import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { router } from './router/router';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import OledPreset from './theme/oled';
import { createPinia } from 'pinia';
import './services/firebase';
import { registerSW } from 'virtual:pwa-register';
import Tooltip from 'primevue/tooltip';
import Ripple from 'primevue/ripple';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { mergeProps } from 'vue';

// Smarter merging for PrimeVue component props with Tailwind classes
const customMergeProps = (
    globalPTProps: Record<string, any> = {},
    selfPTProps: Record<string, any> = {},
    datasets: any
) => {
    const merged = mergeProps(globalPTProps, selfPTProps, datasets);
    merged.class = twMerge(merged.class as ClassNameValue);
    return merged;
};

registerSW({ immediate: true });

createApp(App)
    .use(router)
    .use(createPinia())
    .use(PrimeVue, {
        ripple: true,
        theme: {
            preset: OledPreset,
            options: {
                darkModeSelector: '.dark'
            }
        },
        pt: {
            Button: {
                root: { class: 'rounded-xl! font-bold active:scale-[0.98] transition-transform duration-100' }
            },
            Dialog: {
                root: { class: 'rounded-2xl border border-zinc-800 bg-black shadow-2xl' },
                header: { class: 'rounded-t-2xl bg-transparent border-none!' },
                content: { class: 'bg-transparent' },
                footer: { class: 'rounded-b-2xl bg-transparent border-none!' },
                pcCloseButton: {
                    root: { class: 'focus-visible:outline-none!' }
                }
            },
            DataTable: {
                root: { class: 'rounded-xl! overflow-hidden border border-zinc-800 bg-black' },
                header: { class: 'bg-zinc-900/10' }
            },
            InputText: {
                root: { class: 'rounded-xl!' }
            },
            Textarea: {
                root: { class: 'rounded-xl!' }
            },
            Password: {
                pcInputText: {
                    root: { class: 'rounded-xl!' }
                }
            },
            Panel: {
                root: { class: 'rounded-2xl! bg-black border-zinc-800' }
            },
            ConfirmDialog: {
                message: { class: 'whitespace-pre-line' }
            }
        },
        ptOptions: {
            mergeSections: true,
            mergeProps: customMergeProps
        }
    })
    .use(ToastService)
    .use(ConfirmationService)
    .directive('tooltip', Tooltip)
    .directive('ripple', Ripple)
    .mount('#app');
