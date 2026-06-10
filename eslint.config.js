export default [
  {
    ignores: [
      "**/node_modules/**",
      "frontend/dist/**",
      "backend/uploads/**",
      ".git/**",
      ".tempmediaStorage/**"
    ]
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // browser
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        // commonjs / node
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        process: "readonly",
        global: "readonly",
        globalThis: "readonly",
        console: "readonly",
        // vitest
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeAll: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off"
    }
  }
];
