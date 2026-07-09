"use client";

import { Activity, Sailboat } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { Entry } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

type VppData = {
  angles: number[];
  speeds: number[];
  beat_angle?: number[];
  beat_vmg?: number[];
  run_angle?: number[];
  run_vmg?: number[];
  [angle: string]: number[] | undefined;
};

type OrcPolarBoat = {
  boat?: {
    sizes?: {
      displacement?: number | null;
      draft?: number | null;
      loa?: number | null;
    };
    type?: string | null;
  };
  name: string;
  rating?: {
    gph?: number | null;
    osn?: number | null;
  };
  sailnumber: string;
  vpp?: VppData | null;
};

type PolarPayload = {
  data?: OrcPolarBoat[];
};

const degToRad = Math.PI / 180;
const referenceAngles = [0, 45, 52, 60, 75, 90, 110, 120, 135, 150, 165];
const twsColors: Record<number, string> = {
  4: "#8c564b",
  6: "#1f77b4",
  8: "#ff7f0e",
  10: "#2ca02c",
  12: "#d62728",
  14: "#9467bd",
  16: "#17becf",
  20: "#e377c2",
  24: "#9ca3af",
};

function normalize(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function sailTokens(sailnumber?: string | null) {
  const raw = sailnumber ?? "";
  return [normalize(raw), ...raw.split("/").map(normalize)].filter(Boolean);
}

function formatNumber(value?: number | null, decimals = 1) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString("pt-PT", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function useOrcPolarBoats() {
  const [boats, setBoats] = useState<OrcPolarBoat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/data/orc-polar-data.json", { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((payload: PolarPayload) => {
        if (active) setBoats(payload.data ?? []);
      })
      .catch(() => {
        if (active) setBoats([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { boats, loading };
}

function matchPolarBoat(entry: Entry | null, boats: OrcPolarBoat[]) {
  if (!entry) return null;

  const entrySail = normalize(entry.sailNumber);
  const entryName = normalize(entry.boatName);

  return (
    boats.find((boat) => sailTokens(boat.sailnumber).includes(entrySail)) ??
    boats.find((boat) => normalize(boat.name) === entryName) ??
    null
  );
}

function vmgToSog(angle: number, vmg: number) {
  return vmg / Math.cos(angle * degToRad);
}

function polarPoint(angle: number, sog: number, originX: number, originY: number, radius: number, maxSog: number) {
  const r = (sog / maxSog) * radius;
  const point = polarPointByRadius(angle, originX, originY, r);

  return {
    angle,
    sog,
    x: point.x,
    y: point.y,
  };
}

function polarPointByRadius(angle: number, originX: number, originY: number, radius: number) {
  return {
    x: originX + radius * Math.sin(angle * degToRad),
    y: originY - radius * Math.cos(angle * degToRad),
  };
}

function arcPath(originX: number, originY: number, radius: number, startAngle = 0, endAngle = 165) {
  const start = polarPointByRadius(startAngle, originX, originY, radius);
  const end = polarPointByRadius(endAngle, originX, originY, radius);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function seriesFromVpp(vpp: VppData) {
  const curves = vpp.speeds.map((tws, speedIndex) => {
    const points: Array<{ angle: number; sog: number }> = [];
    const beatAngle = vpp.beat_angle?.[speedIndex];
    const beatVmg = vpp.beat_vmg?.[speedIndex];
    if (typeof beatAngle === "number" && typeof beatVmg === "number") {
      points.push({ angle: beatAngle, sog: vmgToSog(beatAngle, beatVmg) });
    }

    for (const angle of vpp.angles) {
      const sog = vpp[String(angle)]?.[speedIndex];
      if (typeof sog === "number" && sog > 0) {
        points.push({ angle, sog });
      }
    }

    const runAngle = vpp.run_angle?.[speedIndex];
    const runVmg = vpp.run_vmg?.[speedIndex];
    if (typeof runAngle === "number" && typeof runVmg === "number") {
      points.push({ angle: runAngle, sog: vmgToSog(runAngle, -runVmg) });
    }

    return {
      points: points.sort((a, b) => a.angle - b.angle),
      tws,
    };
  });

  return curves.filter((curve) => curve.points.length > 1);
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    commands.push(`Q ${current.x} ${current.y} ${midX} ${midY}`);
  }
  const last = points[points.length - 1];
  commands.push(`T ${last.x} ${last.y}`);
  return commands.join(" ");
}

function PolarPlot({ boat, compact = false }: { boat: OrcPolarBoat; compact?: boolean }) {
  const vpp = boat.vpp;
  const curves = useMemo(() => (vpp ? seriesFromVpp(vpp) : []), [vpp]);
  const maxSog = useMemo(() => {
    const values = curves.flatMap((curve) => curve.points.map((point) => point.sog));
    return Math.max(10, Math.ceil(Math.max(...values, 10) / 2) * 2);
  }, [curves]);

  if (!vpp || curves.length === 0) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Polar ORC não encontrado para este certificado.
      </div>
    );
  }

  const originX = 18;
  const originY = 318;
  const radius = 292;
  const labeledRings = [2, 4, 6, 8, 10];
  const extraRings = Array.from({ length: Math.max(0, Math.floor(maxSog / 2) - 5) }, (_, index) => {
    return 12 + index * 2;
  });

  return (
    <div className="overflow-hidden rounded-lg bg-slate-50">
      <svg
        viewBox="0 0 390 640"
        className={cn("block aspect-[39/64] w-full", compact ? "max-h-[520px]" : "max-h-[660px]")}
      >
        <g>
          {[...labeledRings, ...extraRings].map((sog) => {
            const ringRadius = (sog / maxSog) * radius;
            const labelPoint = polarPointByRadius(22, originX, originY, ringRadius);
            const isLabeled = labeledRings.includes(sog);
            const isReferenceRing = sog === 10;

            return (
              <g key={sog}>
                <path
                  d={arcPath(originX, originY, ringRadius)}
                  fill="none"
                  stroke={isReferenceRing ? "#94a3b8" : "#cbd5e1"}
                  strokeDasharray={isReferenceRing ? undefined : "1 7"}
                  strokeWidth={isReferenceRing ? 1.35 : 0.9}
                />
                {isLabeled ? (
                  <text
                    x={labelPoint.x}
                    y={labelPoint.y}
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="monospace"
                    transform={`rotate(24 ${labelPoint.x} ${labelPoint.y})`}
                  >
                    {sog} kn
                  </text>
                ) : null}
              </g>
            );
          })}

          <circle cx={originX} cy={originY} r="4" fill="white" stroke="#cbd5e1" strokeDasharray="1 4" />

          {referenceAngles.map((angle) => {
            const end = polarPoint(angle, maxSog, originX, originY, radius, maxSog);
            const label = polarPoint(angle, maxSog + 0.7, originX, originY, radius, maxSog);
            return (
              <g key={angle}>
                <line
                  x1={originX}
                  y1={originY}
                  x2={end.x}
                  y2={end.y}
                  stroke="#d5dde7"
                  strokeDasharray="1 7"
                />
                {angle > 0 ? (
                  <text
                    x={label.x}
                    y={label.y}
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${angle - 90} ${label.x} ${label.y})`}
                  >
                    {angle}°
                  </text>
                ) : null}
              </g>
            );
          })}

          {curves.map((curve, curveIndex) => {
            const points = curve.points.map((point) =>
              polarPoint(point.angle, point.sog, originX, originY, radius, maxSog),
            );
            const runPoint = points[points.length - 1];
            return (
              <g key={curve.tws}>
                <path
                  d={smoothPath(points)}
                  fill="none"
                  stroke={twsColors[curve.tws] ?? "#0ea5e9"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={curveIndex === curves.length - 1 ? 2.2 : 2}
                />
                {runPoint ? (
                  <rect
                    x={runPoint.x - 3.8}
                    y={runPoint.y - 3.8}
                    width="7.6"
                    height="7.6"
                    fill="white"
                    stroke={twsColors[curve.tws] ?? "#0ea5e9"}
                    strokeWidth="1.4"
                    transform={`rotate(45 ${runPoint.x} ${runPoint.y})`}
                  />
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function PolarLegend({ speeds }: { speeds: number[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {speeds.map((speed) => (
        <span key={speed} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <span
            className="h-0.5 w-5 rounded-full"
            style={{ backgroundColor: twsColors[speed] ?? "#0ea5e9" }}
          />
          {speed} kn
        </span>
      ))}
    </div>
  );
}

export function OrcPolarPanel({ selectedEntry }: { selectedEntry: Entry | null }) {
  const { boats, loading } = useOrcPolarBoats();
  const polarBoat = useMemo(() => matchPolarBoat(selectedEntry, boats), [boats, selectedEntry]);
  const sizes = polarBoat?.boat?.sizes;

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-normal text-cyan-700">
              Quadro Polar ORC
            </p>
            <h3 className="mt-1 truncate text-2xl font-black uppercase text-slate-950">
              {selectedEntry?.boatName ?? polarBoat?.name ?? "Barco"}
            </h3>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500">
              {polarBoat?.boat?.type ?? selectedEntry?.certificateClassName ?? "Certificado ORC"}
            </p>
          </div>
          <Badge className="bg-sky-950 text-white hover:bg-sky-950">2D</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-2">
          <Metric label="Vela" value={selectedEntry?.sailNumber ?? "—"} />
          <Metric label="GPH" value={formatNumber(polarBoat?.rating?.gph ?? selectedEntry?.gph, 1)} />
          <Metric label="Compr." value={sizes?.loa ? `${formatNumber(sizes.loa, 2)} m` : "—"} />
          <Metric label="Calado" value={sizes?.draft ? `${formatNumber(sizes.draft, 2)} m` : "—"} />
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid min-h-[360px] place-items-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
              A carregar polar ORC
            </div>
          ) : polarBoat ? (
            <PolarPlot boat={polarBoat} />
          ) : (
            <div className="grid min-h-[360px] place-items-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Sem VPP ORC para o barco selecionado.
            </div>
          )}
        </div>

        {polarBoat?.vpp?.speeds?.length ? (
          <div className="mt-4">
            <PolarLegend speeds={polarBoat.vpp.speeds} />
          </div>
        ) : null}

        <div className={cn("mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600", !polarBoat && "hidden")}>
          <span className="inline-flex items-center gap-1 font-bold text-slate-800">
            <Activity className="size-3.5" />
            VPP
          </span>{" "}
          {polarBoat?.sailnumber} · OSN {formatNumber(polarBoat?.rating?.osn, 1)} · Desloc.{" "}
          {sizes?.displacement ? `${formatNumber(sizes.displacement, 0)} kg` : "—"}
        </div>
      </div>
    </aside>
  );
}

export function OrcPolarComparisonGrid({ selectedEntries }: { selectedEntries: Entry[] }) {
  const { boats, loading } = useOrcPolarBoats();
  const selectedPolars = useMemo(() => {
    return selectedEntries.map((entry) => ({
      entry,
      polarBoat: matchPolarBoat(entry, boats),
    }));
  }, [boats, selectedEntries]);

  if (selectedEntries.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-cyan-700">Polares selecionadas</p>
          <h3 className="mt-1 text-xl font-black uppercase text-slate-950">Comparação ORC</h3>
        </div>
        <Badge className="bg-sky-950 text-white hover:bg-sky-950">
          {selectedEntries.length} {selectedEntries.length === 1 ? "barco" : "barcos"}
        </Badge>
      </div>

      <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
        {selectedPolars.map(({ entry, polarBoat }) => {
          const sizes = polarBoat?.boat?.sizes;

          return (
            <article key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-lg font-black uppercase text-slate-950">
                    {entry.boatName}
                  </h4>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {entry.sailNumber} · GPH {formatNumber(polarBoat?.rating?.gph ?? entry.gph, 1)}
                  </p>
                </div>
                <Badge variant="secondary">{entry.classCode.replace("_", " ")}</Badge>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Metric label="Compr." value={sizes?.loa ? `${formatNumber(sizes.loa, 2)} m` : "—"} />
                <Metric label="Calado" value={sizes?.draft ? `${formatNumber(sizes.draft, 2)} m` : "—"} />
                <Metric label="OSN" value={formatNumber(polarBoat?.rating?.osn, 1)} />
              </div>

              <div className="mt-3">
                {loading ? (
                  <div className="grid min-h-[300px] place-items-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500">
                    A carregar polar ORC
                  </div>
                ) : polarBoat ? (
                  <PolarPlot boat={polarBoat} compact />
                ) : (
                  <div className="grid min-h-[300px] place-items-center rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Sem VPP ORC para este barco.
                  </div>
                )}
              </div>

              {polarBoat?.vpp?.speeds?.length ? (
                <div className="mt-3">
                  <PolarLegend speeds={polarBoat.vpp.speeds} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
        <Sailboat className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 truncate font-mono text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
