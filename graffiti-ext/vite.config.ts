import { defineConfig } from 'vite';

/**
 * !! Do NOT add popup here. Popup is built separately (see /popup).
 * !! Do NOT add contentScript here. Content script is built separately with Rollup (see rollup.content.config.js).
 * Breaking this will surface as "Vite + React" skeleton in extension popup.
 */
export default defineConfig({
  base: '', // IMPORTANT for Chrome MV3 - ensures relative asset paths
  build: {
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
}); 