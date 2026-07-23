import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Unit tests for the app's pure logic (parsers, serializers, position mapping,
 * storage). jsdom gives us `window`/`localStorage`; the `@/` alias resolves via
 * tsconfig-paths so tests import exactly like the app does.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    // A real origin so jsdom exposes localStorage (opaque origins don't).
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
