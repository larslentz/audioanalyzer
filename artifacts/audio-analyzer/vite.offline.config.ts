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
  ],
  build: {
    outDir: "dist-offline",
    emptyOutDir: true,
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  root: ".",
});
