import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const watch = process.argv.includes("--watch");
const outdir = "dist";

/**
 * The SDK's credential chain imports node:fs / node:path to support file-based
 * auth profiles. Those paths are unreachable here — we always pass an explicit
 * apiKey — but esbuild still has to resolve them, so stub them out.
 */
const stubNodeBuiltins = {
  name: "stub-node-builtins",
  setup(build) {
    build.onResolve({ filter: /^node:/ }, (args) => ({
      path: args.path,
      namespace: "node-stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "node-stub" }, () => ({
      contents: "module.exports = {};",
      loader: "js",
    }));
  },
};

const shared = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome120",
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  logLevel: "info",
  plugins: [stubNodeBuiltins],
};

await rm(outdir, { recursive: true, force: true });
await mkdir(`${outdir}/options`, { recursive: true });

const jobs = [
  { entryPoints: ["src/background/index.ts"], outfile: `${outdir}/background.js` },
  { entryPoints: ["src/content/index.ts"], outfile: `${outdir}/content.js` },
  { entryPoints: ["src/options/options.ts"], outfile: `${outdir}/options/options.js` },
];

await cp("src/manifest.json", `${outdir}/manifest.json`);
await cp("src/options/options.html", `${outdir}/options/options.html`);

if (watch) {
  for (const job of jobs) {
    const ctx = await context({ ...shared, ...job });
    await ctx.watch();
  }
  console.log("watching…");
} else {
  await Promise.all(jobs.map((job) => build({ ...shared, ...job })));
  console.log(`built -> ${outdir}/`);
}
