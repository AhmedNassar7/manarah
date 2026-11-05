import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // The design-token test reads the real stylesheet (?raw); Vitest otherwise blanks every CSS import.
    css: { include: [/styles\.css/] },
    setupFiles: ["./vitest.setup.ts"],
  },
});
