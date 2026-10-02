import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Vite config for TanStack Start + Nitro (SSR). Wires up Tailwind, tsconfig
// path aliases, the React plugin, the TanStack Start plugin (with our custom
// SSR entry in src/server.ts) and the Nitro deployment plugin. VITE_* env vars
// are inlined so `import.meta.env.*` resolves on both client and server.
export default defineConfig(async ({ mode }) => {
  const envDefine: Record<string, string> = {};
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }
  // Canonical/SEO base URL: explicit SITE_URL wins, else Netlify's `URL` build
  // env (the site's public origin). Available on both client and server builds.
  envDefine["import.meta.env.SITE_URL"] = JSON.stringify(
    process.env["SITE_URL"] || process.env["CF_PAGES_URL"] || process.env["URL"] || "",
  );

  return {
    define: envDefine,
    server: { host: "::", port: 8080 },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      viteReact(),
      nitro({ defaultPreset: "cloudflare-module" }),
    ],
  };
});