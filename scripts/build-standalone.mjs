import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
let html = await readFile(join(dist, "index.html"), "utf8");
const script = /<script type="module" crossorigin src="([^"]+)"><\/script>/;
const stylesheet = /<link rel="stylesheet" crossorigin href="([^"]+)">/;
const jsPath = html.match(script)?.[1];
const cssPath = html.match(stylesheet)?.[1];
if (!jsPath || !cssPath)
  throw new Error(
    "Expected a Vite build with one script and stylesheet. Run npm run build first.",
  );
const [js, css, phaserLicense, viteLicense] = await Promise.all([
  readFile(join(dist, jsPath.replace(/^\//, "")), "utf8"),
  readFile(join(dist, cssPath.replace(/^\//, "")), "utf8"),
  readFile(join(root, "node_modules/phaser/LICENSE.md"), "utf8"),
  readFile(join(root, "node_modules/vite/LICENSE.md"), "utf8"),
]);
// Callback replacements preserve literal dollar signs in the minified bundle.
html = html.replace(
  script,
  () =>
    `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>`,
);
html = html.replace(
  stylesheet,
  () => `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`,
);
const notices = `Bundled Phaser runtime:\n${phaserLicense}\nVite module-preload helper:\n${viteLicense.split("# Licenses of bundled dependencies")[0]}`;
html = html.replace(
  "<head>",
  () => `<head>\n<!--\n${notices.replaceAll("--", "—")}\n-->`,
);
await writeFile(join(root, "tag-arena.html"), html);
console.log(
  "Generated tag-arena.html: compiled game, CSS and license notices in one file.",
);
