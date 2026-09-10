const fs = require("node:fs"),
  path = require("node:path");
require("./check.cjs");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "dist");
fs.mkdirSync(out, { recursive: true });
for (const f of [
  "index.html",
  "styles.css",
  "executive.css",
  "landing.css",
  "north-workspace.jpg",
  "core.js",
  "app.js",
  "workspace.js",
  "sw.js",
  "manifest.webmanifest",
  "brand-mark.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
])
  fs.copyFileSync(path.join(root, f), path.join(out, f));
console.log(
  "Static production assets copied to dist/. No transpilation or dependencies required.",
);
