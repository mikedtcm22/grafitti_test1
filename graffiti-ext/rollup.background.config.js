import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import inject from '@rollup/plugin-inject';
import { config } from 'dotenv';

// Load environment variables
config();

export default {
  input: 'src/background.ts',
  output: {
    file: 'dist/background.js',
    format: 'iife',
    name: 'GraffitiBackground',
    sourcemap: false,
    inlineDynamicImports: true,
    banner: `(() => {\n  // Ensure process.env exists\n  if (typeof globalThis.process === 'undefined') {\n    globalThis.process = { env: {} };\n  } else if (typeof globalThis.process.env === 'undefined') {\n    globalThis.process.env = {};\n  }\n  // Stub XMLHttpRequest for service-worker context (Chrome MV3 has no native XHR)\n  if (typeof globalThis.XMLHttpRequest === 'undefined') {\n    class DummyXHR {\n      open() {}\n      send() {}\n      abort() {}\n      setRequestHeader() {}\n      getAllResponseHeaders() { return ''; }\n      getResponseHeader() { return null; }\n      addEventListener() {}\n      removeEventListener() {}\n    }\n    globalThis.XMLHttpRequest = DummyXHR;\n  }\n})();`,
    // No globals mapping needed; Node built-ins will be polyfilled
  },
  plugins: [
    replace({
      'process.env.SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
      preventAssignment: true
    }),
    json(),
    resolve({
      browser: true,
      preferBuiltins: false,
      // Use browser-compatible versions when available
      exportConditions: ['browser', 'default'],
      // Prefer ES modules for tree shaking
      mainFields: ['browser', 'module', 'main']
    }),
    commonjs({
      // Transform all modules to CommonJS
      transformMixedEsModules: true,
      // Include everything
      include: ['node_modules/**', 'src/**'],
      // Ignore dynamic requires that might cause issues
      ignoreDynamicRequires: true
    }),
    typescript({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        declaration: false,
        declarationMap: false,
        sourceMap: false,
        inlineSourceMap: false,
        removeComments: true,
        importHelpers: true,
        allowImportingTsExtensions: false,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      }
    }),
    terser({
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true
      },
      mangle: false // Don't mangle names for debugging
    }),
    // Polyfill Node built-in modules for service worker environment
    nodePolyfills(),
    inject({
      // Provide global Buffer/process polyfills automatically
      Buffer: ['buffer', 'Buffer'],
      process: 'process'
    }),
  ],
  // Do not mark Node built-ins as external; allow bundler to include polyfills
  external: [],
  onwarn(warning, warn) {
    // Suppress specific warnings that are expected in extension context
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    if (warning.code === 'EVAL') return;
    if (warning.code === 'UNRESOLVED_IMPORT') return;
    
    warn(warning);
  }
}; 