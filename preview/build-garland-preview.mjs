// Builds preview/garland-header-preview.html: one self-contained page with the
// real garland header and wand-tree engine, for previewing without Next.js.
// React is loaded from cdnjs by the page, so imports of "react" map to the global.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const reactGlobals = {
  name: "react-globals",
  setup(b) {
    b.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (args) => ({ path: args.path, namespace: "global" }));
    b.onLoad({ filter: /.*/, namespace: "global" }, (args) => ({
      contents: args.path.startsWith("react-dom") ? "module.exports = window.ReactDOM;" : "module.exports = window.React;",
    }));
  },
};

const logoUri = `data:image/webp;base64,${readFileSync(join(root, "public/brand/noble-star-forest.webp")).toString("base64")}`;

// The crystal pictures, embedded so the preview is one file.
const plates = [0.3516, 0.3603, 0.3749, 0.3682];
const crystals = plates.map((plate, i) => ({
  src: `data:image/webp;base64,${readFileSync(join(root, `public/snowflakes/crystal-${i + 1}.webp`)).toString("base64")}`,
  plate,
}));

const js = await build({
  entryPoints: [join(here, "garland-preview.tsx")],
  bundle: true,
  format: "iife",
  target: "es2019",
  minify: true,
  write: false,
  jsx: "transform",
  tsconfigRaw: { compilerOptions: { jsx: "react" } },
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  inject: [join(here, "react-shim.js")],
  loader: { ".css": "empty" },
  plugins: [reactGlobals],
  define: { "process.env.NODE_ENV": '"production"', LOGO_URI: JSON.stringify(logoUri), CRYSTALS: JSON.stringify(crystals) },
});

const cssPath = join(here, "garland-preview.css");
const css = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(readFileSync(cssPath, "utf8"), {
  from: cssPath,
});

const html = readFileSync(join(here, "garland-template.html"), "utf8")
  .replace("/*__CSS__*/", () => css.css.replace(/<\/style/gi, "<\\/style"))
  .replace("/*__JS__*/", () => js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"));
writeFileSync(join(here, "garland-header-preview.html"), html);
console.log("Wrote preview/garland-header-preview.html", (html.length / 1024).toFixed(1), "KB");
