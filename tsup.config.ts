import { defineConfig } from "tsup";

export default defineConfig({
  format: "esm",
  // Keep heavy / subpath-exporting libs out of the bundle; they resolve from
  // node_modules at runtime (the final image copies prod node_modules).
  external: ["lightningcss", /^better-auth(\/|$)/, /^googleapis(\/|$)/, /^ical-generator(\/|$)/],
  env: {
    NODE_ENV: "production",
  },
  sourcemap: true,
  clean: true,
});
