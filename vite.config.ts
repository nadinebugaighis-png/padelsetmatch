// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { resolve } from "node:path";
import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, mergeConfig, type ConfigEnv } from "vite";

export default async function config(env: ConfigEnv) {
  const { mode } = env;
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  const entitiesRoot = resolve(process.cwd(), "node_modules/entities");

  const baseConfig = await defineLovableConfig({
    tanstackStart: {
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    },
  })(env);

  return mergeConfig(baseConfig, {
    resolve: {
      alias: {
        "entities/lib/decode.js": resolve(entitiesRoot, "lib/decode.js"),
        "entities/lib/encode.js": resolve(entitiesRoot, "lib/encode.js"),
        entities: entitiesRoot,
      },
    },
  });
}
