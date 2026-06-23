import { existsSync, readdirSync } from "node:fs"
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import ts from "typescript"

import { graphics } from "../src/basemaps/graphics.js"
import { protomaps } from "../src/basemaps/protomaps.js"

/**
 * Releases a versioned snapshot of the library into `dist/<major>.<minor>/`.
 *
 * The toolkit is copied verbatim so its relative imports resolve unchanged, `.d.ts` declarations
 * are emitted from its JSDoc so consumers get types with no tsconfig of their own, and each
 * assembled basemap is written alongside as a standalone GL style JSON. Import paths carry the
 * version via `exports` aliases, so multiple versions can coexist and consumers can pin one.
 *
 * One of two actions must be passed:
 *
 *  patch  rebuild the current version's folder (dist/0.1) in place. The
 *         package version is left unchanged.
 *
 *  minor  release a new version: bump the minor (0.1 -> 0.2) in both the
 *         package version and a fresh dist/0.2/ folder consumers can pin to.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const srcDir = resolve(root, "src")
const distDir = resolve(root, "dist")
const pkgPath = resolve(root, "package.json")

const documents = {
  "basemaps/graphics.json": graphics,
  "basemaps/protomaps.json": protomaps,
}

// Emits `.d.ts` declarations for every `.js` under `dir`, in place, using the compiler API so the
// options and file list can be computed from `dir` — no tsconfig file, no include globbing.
const emitDeclarations = (dir) => {
  const files = []

  const walk = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = resolve(path, entry.name)

      if (entry.isDirectory()) {
        walk(child)
      } else if (entry.name.endsWith(".js")) {
        files.push(child)
      }
    }
  }

  walk(dir)

  const program = ts.createProgram(files, {
    allowJs: true,
    checkJs: false,
    declaration: true,
    emitDeclarationOnly: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    rootDir: dir,
    outDir: dir,
  })

  const { diagnostics } = program.emit()

  const errors = ts
    .getPreEmitDiagnostics(program)
    .concat(diagnostics)
    .filter((d) => d.category === ts.DiagnosticCategory.Error)

  if (errors.length > 0) {
    console.error(ts.formatDiagnosticsWithColorAndContext(errors, ts.createCompilerHost({})))
    throw new Error("declaration emit failed")
  }
}

const [action] = process.argv.slice(2)

if (action !== "patch" && action !== "minor") {
  console.log("Usage: npm run release <patch|minor>\n")
  console.log("  patch  rebuild the current version in place (version unchanged)")
  console.log("  minor  release a new version (0.1.x -> 0.2.0)\n")
  process.exit(1)
}

const pkg = JSON.parse(await readFile(pkgPath, "utf8"))
const [major, minor] = pkg.version.split(".").map(Number)

const version = action === "minor" ? `${major}.${minor + 1}.0` : pkg.version
const dir = version.split(".").slice(0, 2).join(".")
const outDir = resolve(distDir, dir)

if (action === "minor" && existsSync(outDir)) {
  throw new Error(`dist/${dir} already exists — refusing to clobber a released version`)
}

await rm(outDir, { recursive: true, force: true })
await cp(srcDir, outDir, { recursive: true })
console.log(`copied src -> dist/${dir}`)

emitDeclarations(outDir)
console.log(`emitted .d.ts -> dist/${dir}`)

for (const [file, document] of Object.entries(documents)) {
  const path = resolve(outDir, file)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(document, null, 2)}\n`)
  console.log(`wrote dist/${dir}/${file}`)
}

// Rebuild the exports map from the versioned dist folders. Each version gets a namespaced alias
// (`interactive-map-library/0.1/basemaps/graphics.js`), and the unversioned convenience specifiers
// (bare `./styles`, `./basemaps/*`, ...) are repointed at the just-built folder, the latest.
const versions = readdirSync(distDir).filter((name) => /^\d+\.\d+$/.test(name))

pkg.version = version
pkg.exports = {
  "./basemaps/*": `./dist/${dir}/basemaps/*`,
  "./styles": `./dist/${dir}/styles/index.js`,
  "./styles/*": `./dist/${dir}/styles/*`,
  "./tokens/*": `./dist/${dir}/tokens/*`,
  "./core/*": `./dist/${dir}/core/*`,
  ...Object.fromEntries(
    versions.flatMap((v) => [
      [`./${v}/*`, `./dist/${v}/*`],
      [`./${v}/styles`, `./dist/${v}/styles/index.js`],
    ]),
  ),
}

await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
console.log(action === "minor" ? `new version ${version} (dist/${dir})` : `rebuilt dist/${dir}`)
