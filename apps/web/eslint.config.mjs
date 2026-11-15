import config from "@greenquote/config/eslint";
import next from "@next/eslint-plugin-next";

export default [
  ...config,
  next.configs["core-web-vitals"],
  { ignores: ["next-env.d.ts"] },
];
