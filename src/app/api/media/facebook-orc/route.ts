import { readdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const mediaDir = path.join(process.cwd(), "public", "media", "facebook-orc");
const imageExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

function titleFromFileName(fileName: string) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function GET() {
  try {
    const files = await readdir(mediaDir);
    const items = files
      .filter((fileName) => imageExtensions.has(path.extname(fileName).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "pt"))
      .map((fileName, index) => ({
        id: `facebook-orc-local-${index + 1}`,
        title: titleFromFileName(fileName) || `Facebook ORC ${index + 1}`,
        imageUrl: `/media/facebook-orc/${encodeURIComponent(fileName)}`,
        sourceUrl: "https://www.facebook.com/p/Campeonato-de-Portugal-ORC-100063607089210",
        credit: "Facebook Campeonato de Portugal ORC",
        featured: index === 0,
      }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
