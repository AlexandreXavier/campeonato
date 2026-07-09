import { readdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const publicPath = path.join(process.cwd(), "public");
const mediaDir = path.join(publicPath, "media", "facebook-orc");
const optimizedDir = path.join(mediaDir, "webp");
const imageExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

function titleFromFileName(fileName: string) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function GET() {
  try {
    const optimizedFiles = await readdir(optimizedDir).catch(() => []);
    const sourceDir = optimizedFiles.some(
      (fileName) => path.extname(fileName).toLowerCase() === ".webp",
    )
      ? optimizedDir
      : mediaDir;
    const files = await readdir(sourceDir);
    const items = files
      .filter((fileName) => imageExtensions.has(path.extname(fileName).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "pt"))
      .map((fileName, index) => ({
        id: `facebook-orc-local-${index + 1}`,
        title: titleFromFileName(fileName) || `Facebook ORC ${index + 1}`,
        imageUrl: `/${path
          .relative(publicPath, path.join(sourceDir, fileName))
          .split(path.sep)
          .map(encodeURIComponent)
          .join("/")}`,
        sourceUrl: "https://www.facebook.com/p/Campeonato-de-Portugal-ORC-100063607089210",
        credit: "Facebook Campeonato de Portugal ORC",
        featured: index === 0,
      }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
