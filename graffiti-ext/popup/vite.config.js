import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
// https://vite.dev/config/
export default defineConfig({
    base: '', // IMPORTANT for Chrome MV3 - ensures relative asset paths
    plugins: [react()],
    build: {
        outDir: '../dist/popup',
        emptyOutDir: false,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'index.html'),
            },
        },
    },
});
