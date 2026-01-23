/**
 * Tests for viteConfigTransform.ts
 *
 * These tests verify that the Vite config transformer correctly:
 * 1. Detects if TanStack Router is already configured
 * 2. Adds TanStack Router plugin to the plugins array
 */
import { describe, it, expect } from "vitest";
import {
  hasTanStackRouterPlugin,
  transformViteConfig,
} from "../viteConfigTransform.js";

// Standard Vite config from create-vite
const STANDARD_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;

// Vite config already with TanStack Router
const TANSTACK_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [TanStackRouterVite({ autoCodeSplitting: true }), react()],
});
`;

// Vite config with multiple plugins
const MULTI_PLUGIN_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
});
`;

describe("viteConfigTransform", () => {
  describe("hasTanStackRouterPlugin", () => {
    it("returns false for standard vite config", () => {
      expect(hasTanStackRouterPlugin(STANDARD_VITE_CONFIG)).toBe(false);
    });

    it("returns true for config with TanStack Router", () => {
      expect(hasTanStackRouterPlugin(TANSTACK_VITE_CONFIG)).toBe(true);
    });

    it("returns false for config with other plugins", () => {
      expect(hasTanStackRouterPlugin(MULTI_PLUGIN_VITE_CONFIG)).toBe(false);
    });
  });

  describe("transformViteConfig", () => {
    it("adds TanStack Router plugin to standard config", () => {
      const result = transformViteConfig(STANDARD_VITE_CONFIG);

      expect(result.success).toBe(true);
      expect(result.skipped).toBeFalsy();
      expect(result.transformed).toBeDefined();

      const transformed = result.transformed!;

      // Check import was added
      expect(transformed).toContain(
        'import { TanStackRouterVite } from "@tanstack/router-plugin/vite";',
      );

      // Check plugin was added to array
      expect(transformed).toContain(
        "TanStackRouterVite({ autoCodeSplitting: true })",
      );
    });

    it("skips config that already has TanStack Router", () => {
      const result = transformViteConfig(TANSTACK_VITE_CONFIG);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain("already configured");
    });

    it("adds plugin to beginning of plugins array", () => {
      const result = transformViteConfig(MULTI_PLUGIN_VITE_CONFIG);

      expect(result.success).toBe(true);
      expect(result.transformed).toBeDefined();

      const transformed = result.transformed!;

      // TanStack Router should come before react in the plugins array
      const tanstackPos = transformed.indexOf("TanStackRouterVite");
      const reactPos = transformed.indexOf("react()");
      expect(tanstackPos).toBeLessThan(reactPos);
    });
  });
});
