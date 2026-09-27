// Generates public/sw.js from public/sw.template.js by baking in the
// current build's ID and the full list of its client-side JS/CSS assets.
// Run automatically as part of `npm run build` (see package.json).
//
// Why this exists: a service worker only reinstalls (and drops its old
// caches) when the browser detects its *bytes* changed. If sw.js were
// hand-written and unchanged between deploys, a page cached from a
// previous build could go on referencing JS/CSS chunks that no longer
// exist on disk - and that's what turns "offline" into a hard crash
// instead of a working cached page. Baking the build ID and asset list
// directly into sw.js guarantees its bytes differ on every build with any
// asset change, which is what makes the browser actually pick up the new
// worker and precache the new build's assets.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const staticDir = path.join(root, ".next", "static");
const buildIdPath = path.join(root, ".next", "BUILD_ID");
const templatePath = path.join(root, "public", "sw.template.js");
const outputPath = path.join(root, "public", "sw.js");

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function main() {
  if (!statSync(staticDir, { throwIfNoEntry: false })) {
    console.error(`[generate-sw] ${staticDir} not found - run "next build" first.`);
    process.exit(1);
  }

  const buildId = readFileSync(buildIdPath, "utf8").trim();
  const assets = walk(staticDir).map((file) => {
    const rel = path.relative(staticDir, file).split(path.sep).join("/");
    return `/_next/static/${rel}`;
  });

  const template = readFileSync(templatePath, "utf8");
  const output = template
    .replace("__BUILD_ID__", JSON.stringify(buildId))
    .replace("__PRECACHE_ASSETS__", JSON.stringify(assets));

  writeFileSync(outputPath, output);
  console.log(`[generate-sw] build ${buildId} - ${assets.length} assets precached in public/sw.js`);
}

main();
