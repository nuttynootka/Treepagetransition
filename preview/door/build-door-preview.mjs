// Builds preview/door/wreath-door-preview.html: one self-contained page that
// runs the real wreath door component (React + Framer Motion + Tailwind).
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const css = execFileSync(join(root, "node_modules", ".bin", "tailwindcss"), ["-i", join(here, "door-preview.css"), "--minify"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});

const result = await build({
  entryPoints: [join(here, "door-preview-app.tsx")],
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: true,
  write: false,
  jsx: "automatic",
  loader: { ".svg": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  logLevel: "error",
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync(join(here, "door-template.html"), "utf8")
  .replace("/*__CSS__*/", () => css.replace(/<\/style/gi, "<\\/style"))
  .replace("/*__APP__*/", () => js);
writeFileSync(join(here, "wreath-door-preview.html"), html);
console.log("Wrote preview/door/wreath-door-preview.html", (html.length / 1024).toFixed(1), "KB");
