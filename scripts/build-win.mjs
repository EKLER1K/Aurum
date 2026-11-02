// Builds the portable Windows app and copies it to dist/.
// Run with: npm run win:build
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const isWin = process.platform === "win32";
const npm = isWin ? "npm.cmd" : "npm";
const npx = isWin ? "npx.cmd" : "npx";

const run = (command) => {
  execSync(command, { cwd: root, stdio: "inherit" });
};

console.log("==> Сборка веб-части (static export)");
run(`${npm} run build`);

// Test data must never ship inside the app.
const demo = path.join(root, "out", "demo.json");
if (fs.existsSync(demo)) fs.rmSync(demo);

console.log("==> Упаковка Windows-приложения");
run(`${npx} electron-builder --win portable --publish never`);

const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const buildDir = path.join(root, "build-win");
const built = fs
  .readdirSync(buildDir)
  .filter((name) => /^Aurum-.+-win\.exe$/i.test(name))
  .map((name) => path.join(buildDir, name))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

if (!built) throw new Error("Не найден собранный .exe в build-win");

const targetDir = path.join(root, "dist");
fs.mkdirSync(targetDir, { recursive: true });
const target = path.join(targetDir, `Aurum-1.04-Beta-win.exe`);
fs.copyFileSync(built, target);

const mb = (fs.statSync(target).size / 1024 / 1024).toFixed(2);
console.log(`\nГотово: ${target} (${mb} МБ) [${version}]`);
