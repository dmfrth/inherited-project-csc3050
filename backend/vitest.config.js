import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: { DATABASE_URL: "file:./test.db", NODE_ENV: "test" },
    globalSetup: "./tests/globalSetup.js",
    fileParallelism: false
  }
});