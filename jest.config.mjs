import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    // The repo's tsconfig.json sets `paths: { "*": ["*"] }` with
    // baseUrl=./src/app, which causes SWC's transform to rewrite every
    // node_module import (incl. `react/jsx-runtime`) into a relative path
    // pointing inside src/app — making React component tests impossible
    // to resolve. The mappings below catch the rewritten relative paths
    // for the packages our component tests pull in and route them back
    // to node_modules. Added in Phase 1B to enable React component tests.
    "^(?:\\.\\.?\\/)+(@testing-library)\\/(react|user-event|jest-dom|dom)$":
      "<rootDir>/node_modules/$1/$2",
    "^(?:\\.\\.?\\/)+(@testing-library)\\/(react|user-event|jest-dom|dom)\\/(.*)$":
      "<rootDir>/node_modules/$1/$2/$3",
    "^(?:\\.\\.?\\/)+(@radix-ui)\\/([\\w-]+)$":
      "<rootDir>/node_modules/$1/$2",
    "^(?:\\.\\.?\\/)+(@radix-ui)\\/([\\w-]+)\\/(.*)$":
      "<rootDir>/node_modules/$1/$2/$3",
    "^(?:\\.\\.?\\/)+(react|react-dom|framer-motion|react-focus-lock|clsx|tailwind-merge|class-variance-authority|@heroicons\\/react)$":
      "<rootDir>/node_modules/$1",
    "^(?:\\.\\.?\\/)+(react|react-dom|framer-motion|react-focus-lock|clsx|tailwind-merge|class-variance-authority|@heroicons\\/react)\\/(.*)$":
      "<rootDir>/node_modules/$1/$2",
    "^components/(.*)$": "<rootDir>/src/app/components/$1",
    "^lib/(.*)$": "<rootDir>/src/app/lib/$1",
    "^home/(.*)$": "<rootDir>/src/app/home/$1",
    "^os/(.*)$": "<rootDir>/src/app/os/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/tests/e2e/"],
  collectCoverageFrom: [
    "src/app/os/**/*.{ts,tsx}",
    "!src/app/os/**/*.test.{ts,tsx}",
    "!src/app/os/**/index.{ts,tsx}",
  ],
  coverageThreshold: {
    "src/app/os/lib/": {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
    "src/app/os/context/": {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
    "src/app/os/Window/": {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
    "src/app/os/Desktop/": {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    "src/app/os/TopMenuBar/": {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    "src/app/os/Dock/": {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
};

export default createJestConfig(config);
