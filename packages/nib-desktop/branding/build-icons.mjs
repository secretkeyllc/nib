import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

/**
 * Generate the Nib packaging assets from the official brand marks in
 * /assets (see assets/README.md for the brand rules).
 *
 * The marks are the SecretKey network glyph, 270x270, transparent. The only
 * operation allowed on them is proportional scaling — no redraw, no rotate,
 * no re-crop — which is exactly what this script does: sharp resizes
 * (fit: "inside" keeps the aspect ratio) and png-to-ico wraps the results
 * into the Windows icon.
 *
 * Outputs, all written next to this script in branding/:
 *
 *   nib.ico             black glyph — 256/128/64/48/32/16 (plan §3.2 six tiers)
 *   logo-black-256.png  black glyph at 256
 *   logo-white-256.png  white glyph at 256
 *   logo-gray-256.png   gray glyph at 256
 *   splash-mark.png     white glyph at 144 (splash / about)
 *
 * Run from anywhere, no cwd assumptions:
 *
 *   node /absolute/path/to/packages/nib-desktop/branding/build-icons.mjs
 *   (or: npm run icons -w @sknib/nib-desktop)
 */

const here = path.dirname(fileURLToPath(import.meta.url)); // packages/nib-desktop/branding
const desktopRoot = path.resolve(here, ".."); // packages/nib-desktop
const repoRoot = path.resolve(desktopRoot, "..", ".."); // repo root (holds assets/)
const assetsDir = path.join(repoRoot, "assets");

/** Official source marks — copied verbatim from secretkey.llc, 270x270. */
const VARIANTS = {
  black: path.join(assetsDir, "logo-black.png"),
  white: path.join(assetsDir, "logo-white.png"),
  gray: path.join(assetsDir, "logo-gray.png"),
};

/** Windows .ico tiers, per the desktop plan §3.2 (16–256, six sizes). */
const ICO_SIZES = [256, 128, 64, 48, 32, 16];

/** Proportional resize to `size` x `size`, encoded as PNG. */
function scaledPng(input, size) {
  return sharp(input).resize(size, size, { fit: "inside" }).png().toBuffer();
}

async function main() {
  await mkdir(here, { recursive: true });

  // Log the source dimensions so a non-official replacement is visible.
  for (const [name, file] of Object.entries(VARIANTS)) {
    const meta = await sharp(file).metadata();
    if (!meta.width || !meta.height) {
      throw new Error(`branding: ${file} is not a readable PNG`);
    }
    console.log(`logo-${name}: source ${meta.width}x${meta.height} (${path.relative(repoRoot, file)})`);
  }

  // Windows .ico — black glyph, largest tier first.
  const icoSources = await Promise.all(ICO_SIZES.map((size) => scaledPng(VARIANTS.black, size)));
  const ico = await pngToIco(icoSources);
  await writeFile(path.join(here, "nib.ico"), ico);
  console.log(`wrote branding/nib.ico (${ico.length} bytes, tiers ${ICO_SIZES.join("/")})`);

  // Per-variant 256 px marks for the installer UI and docs.
  for (const [name, file] of Object.entries(VARIANTS)) {
    const target = path.join(here, `logo-${name}-256.png`);
    const png = await scaledPng(file, 256);
    await writeFile(target, png);
    console.log(`wrote branding/logo-${name}-256.png (${png.length} bytes)`);
  }

  // Splash / about mark — white glyph at 144 px.
  const splash = await scaledPng(VARIANTS.white, 144);
  await writeFile(path.join(here, "splash-mark.png"), splash);
  console.log(`wrote branding/splash-mark.png (${splash.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
