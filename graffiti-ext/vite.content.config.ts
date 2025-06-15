import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: 'src/contentScript.ts',
      output: {
        format: 'iife',
        entryFileNames: 'contentScript.js',
      },
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't delete other build outputs
  },
}); 