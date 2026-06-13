const browserGlobals = {
  AudioContext: 'readonly',
  Blob: 'readonly',
  FormData: 'readonly',
  Image: 'readonly',
  SpeechRecognition: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  alert: 'readonly',
  cancelAnimationFrame: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  confirm: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  localStorage: 'readonly',
  navigator: 'readonly',
  requestAnimationFrame: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  webkitAudioContext: 'readonly',
  window: 'readonly',
};

const nodeGlobals = {
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  console: 'readonly',
  exports: 'writable',
  module: 'readonly',
  process: 'readonly',
  require: 'readonly',
};

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'backend/uploads/**',
      'backend/local_db.json',
      'package-lock.json',
      'frontend/package-lock.json',
      'backend/package-lock.json',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    rules: {
      curly: ['warn', 'multi-line'],
      eqeqeq: ['warn', 'smart'],
      'no-console': 'off',
      'no-debugger': 'warn',
      'no-undef': 'warn',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'prefer-const': 'warn',
    },
  },
  {
    files: ['backend/**/*.js', 'eslint.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];
