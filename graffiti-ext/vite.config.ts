import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        contentScript: 'src/contentScript.ts'
      },
      output: {
        entryFileNames: assetInfo => {
          if (assetInfo.name === 'contentScript') {
            return 'contentScript.js';
          }
          return '[name].js';
        }
      }
    }
  }
}); 