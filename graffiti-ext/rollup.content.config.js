import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';

export default {
  input: 'src/contentScript.ts',
  output: {
    file: 'dist/contentScript.js',
    format: 'iife',
    name: 'GraffitiContentScript',
    sourcemap: false,
    inlineDynamicImports: true,
    // Aggressive globals to avoid any module loading
    globals: {
      'crypto': 'crypto',
      'url': 'URL',
      'https': 'https',
      'stream': 'stream',
      'zlib': 'zlib',
      'http': 'http'
    }
  },
  plugins: [
    json(),
    resolve({
      browser: true,
      preferBuiltins: false,
      // Aggressively resolve all modules
      exportConditions: ['browser', 'default'],
      // Don't use ES modules
      mainFields: ['browser', 'main'],
      // Skip any ES module resolution
      skipBuiltins: true
    }),
    commonjs({
      // Transform all modules to CommonJS
      transformMixedEsModules: true,
      // Include everything
      include: ['node_modules/**', 'src/**'],
      // Ignore dynamic requires that might cause issues
      ignoreDynamicRequires: true,
      // Force CommonJS for all modules
      defaultIsModuleExports: 'auto'
    }),
    typescript({
      // Override problematic tsconfig options
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        declaration: false,
        declarationMap: false,
        sourceMap: false,
        inlineSourceMap: false,
        removeComments: true,
        importHelpers: true,
        // Fix the problematic option
        allowImportingTsExtensions: false,
        // Ensure compatibility
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      }
    }),
    // Custom plugin to replace import.meta references
    {
      name: 'replace-import-meta',
      transform(code, id) {
        // Replace any remaining import.meta references
        const transformedCode = code
          .replace(/import\.meta\.url/g, '"data:text/javascript,"')
          .replace(/import\.meta\.env/g, '{}')
          .replace(/import\.meta/g, '{}');
        
        if (transformedCode !== code) {
          console.log(`[Rollup] Replaced import.meta in ${id}`);
        }
        
        return {
          code: transformedCode,
          map: null
        };
      }
    },
    // Minify the output
    terser({
      format: {
        comments: false
      },
      compress: {
        drop_console: false, // Keep console.log for debugging
        drop_debugger: true,
        // Remove any remaining ES6+ features
        ecma: 5
      },
      mangle: {
        // Don't mangle global names
        reserved: ['GraffitiContentScript']
      }
    })
  ],
  // Don't treat anything as external - bundle everything
  external: ['url', 'https', 'stream', 'zlib', 'http'],
  // Suppress warnings about circular dependencies and other issues
  onwarn(warning, warn) {
    // Skip certain warnings
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    if (warning.code === 'EVAL') return;
    if (warning.code === 'UNRESOLVED_IMPORT') return;
    
    // Use default for everything else
    warn(warning);
  }
}; 