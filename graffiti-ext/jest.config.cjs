const { createDefaultPreset } = require('ts-jest');
const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  // Default to jsdom for browser-like tests; use @jest-environment node in files that need node
  testEnvironment: 'jsdom',
  setupFiles: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/src/__tests__/utils/mocks.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        module: 'ESNext',
        moduleResolution: 'node'
      }
    }]
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(ts-jest|@supabase)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/__tests__/utils/'
  ]
}; 