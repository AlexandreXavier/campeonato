import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SOURCE_PATH =
  "/Users/mac/VELA/POLAR/rating-orc-nacional/LIXO/orc-data/ALL2026.json";
const OUT_PATH = resolve(process.cwd(), "public/data/orc-polar-data.json");

const raw = readFileSync(SOURCE_PATH, "utf8");
const source = Function("const None=null, True=true, False=false; return " + raw)();

const data = source.map((record) => ({
  boat: {
    sizes: record.boat?.sizes ?? {},
    type: record.boat?.type ?? "",
  },
  country: record.country ?? "",
  name: record.name ?? "",
  rating: record.rating ?? {},
  sailnumber: record.sailnumber ?? "",
  vpp: record.vpp ?? null,
}));

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), data }) + "\n");

console.log(`orc-polar-data.json: ${data.length} certificados ORC com dados VPP`);
