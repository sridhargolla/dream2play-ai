import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/builds/**',
      '**/coverage/**',
      'frontend/dist/**',
      'backend/uploads/**',
    ],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json-summary', 'lcov', 'html'],
      include: ['backend/**/*.js', 'frontend/src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        '**/*.config.{js,ts,mjs,cjs}',
        'backend/test_generator.js',
        'frontend/src/locales/**',
        'frontend/src/main.jsx',
        'frontend/src/i18n.js',
      ],
      thresholds: {
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0,
      },
    },
  },
});
