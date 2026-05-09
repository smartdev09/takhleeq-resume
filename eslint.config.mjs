import nextVitals from "eslint-config-next/core-web-vitals";
import localRules from "eslint-plugin-local-rules";

const config = [
  ...nextVitals,
  {
    plugins: {
      "local-rules": localRules,
    },
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
  {
    files: ["src/app/os/apps/**/*.{ts,tsx}"],
    rules: {
      "local-rules/no-resume-snapshot-in-state": "error",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "public/**",
      "playwright-report/**",
      "test-results/**",
      "tests/e2e/__screenshots__/**",
    ],
  },
];

export default config;
