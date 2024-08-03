import { defineConfig } from "tsup";

export default defineConfig({
  format: "esm",
  external: ["lightningcss"],
  env: {
    NODE_ENV: "production",
  },
  sourcemap: true,
  clean: true,
});
