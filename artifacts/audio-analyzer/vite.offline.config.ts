import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [
    viteSingleFile({ removeViteModuleLoader: true }),
    {
      name: "strip-external-links",
      transformIndexHtml(html: string) {
        return html
          .replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, "")
          .replace(/<link[^>]*fonts\.gstatic\.com[^>]*>\s*/g, "");
      },
    },
    {
      name: "remove-module-type",
      enforce: "post" as const,
      transformIndexHtml(html: string) {
        // Strip type="module" so the file works when opened from file://
        // The bundle is already fully inlined with no dynamic imports
        return html.replace(/<script type="module"/g, "<script");
      },
    },
  ],
  build: {
    outDir: "dist-offline",
    emptyOutDir: true,
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        format: "iife",
      },
    },
  },
  root: ".",
});
