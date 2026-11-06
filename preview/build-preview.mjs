// Builds preview/tree-transition-preview.html: one self-contained page that
// runs the real engine, for previewing without a Next.js server.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const result = await build({
  entryPoints: [join(here, "preview-app.ts")],
  bundle: true,
  format: "iife",
  target: "es2019",
  minify: true,
  write: false,
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync(join(here, "template.html"), "utf8").replace("/*__ENGINE__*/", () => js);
writeFileSync(join(here, "tree-transition-preview.html"), html);
console.log("Wrote preview/tree-transition-preview.html", (html.length / 1024).toFixed(1), "KB");
