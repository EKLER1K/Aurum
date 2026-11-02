// Renders assets/logo.svg into a Windows/Linux app icon (assets/icon.png).
// Run with: node scripts/make-icon.mjs
import sharp from "sharp";
import path from "node:path";

const size = 1024;
const logoSize = Math.round(size * 0.72);
const offset = Math.round((size - logoSize) / 2);
const root = path.resolve(import.meta.dirname, "..");

const logo = await sharp(path.join(root, "assets", "logo.svg"))
  .resize(logoSize, logoSize)
  .png()
  .toBuffer();

await sharp({
  create: {
    width: size,
    height: size,
    channels: 4,
    background: { r: 10, g: 10, b: 11, alpha: 1 },
  },
})
  .composite([{ input: logo, top: offset, left: offset }])
  .png()
  .toFile(path.join(root, "assets", "icon.png"));

console.log("assets/icon.png written");
