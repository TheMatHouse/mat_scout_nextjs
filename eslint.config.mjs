// eslint.config.mjs
import nextPlugin from "eslint-plugin-next";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      next: nextPlugin,
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];
