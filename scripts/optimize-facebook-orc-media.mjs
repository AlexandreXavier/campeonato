import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, "public", "media", "facebook-orc");
const outputDir = path.join(sourceDir, "webp");
const sourceExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".tif", ".tiff"]);
const maxWidth = 1920;
const maxHeight = 1920;
const webpQuality = 78;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function isFresh(sourcePath, outputPath, force) {
  if (force) return false;
  try {
    const [sourceStats, outputStats] = await Promise.all([
      stat(sourcePath),
      stat(outputPath),
    ]);
    return outputStats.mtimeMs >= sourceStats.mtimeMs;
  } catch {
    return false;
  }
}

const force = process.argv.includes("--force");
const entries = await readdir(sourceDir, { withFileTypes: true });
const sourceFiles = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((fileName) => sourceExtensions.has(path.extname(fileName).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, "pt"));

await mkdir(outputDir, { recursive: true });

let converted = 0;
let skipped = 0;
let originalBytes = 0;
let optimizedBytes = 0;

for (const fileName of sourceFiles) {
  const sourcePath = path.join(sourceDir, fileName);
  const outputName = `${path.basename(fileName, path.extname(fileName))}.webp`;
  const outputPath = path.join(outputDir, outputName);
  const sourceStats = await stat(sourcePath);
  originalBytes += sourceStats.size;

  if (await isFresh(sourcePath, outputPath, force)) {
    const outputStats = await stat(outputPath);
    optimizedBytes += outputStats.size;
    skipped += 1;
    continue;
  }

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      effort: 6,
      quality: webpQuality,
    })
    .toFile(outputPath);

  const outputStats = await stat(outputPath);
  optimizedBytes += outputStats.size;
  converted += 1;
}

const savedBytes = Math.max(0, originalBytes - optimizedBytes);

console.log(
  JSON.stringify(
    {
      converted,
      skipped,
      sourceFiles: sourceFiles.length,
      outputDir: path.relative(projectRoot, outputDir),
      original: formatBytes(originalBytes),
      optimized: formatBytes(optimizedBytes),
      saved: formatBytes(savedBytes),
      quality: webpQuality,
      maxSize: `${maxWidth}x${maxHeight}`,
    },
    null,
    2,
  ),
);
