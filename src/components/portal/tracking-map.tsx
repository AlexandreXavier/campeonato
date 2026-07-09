"use client";

import maplibregl, {
  type GeoJSONSource,
  type RequestParameters,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Entry, TrackingDemo, TrackingPosition } from "@/lib/portal-types";
import {
  defaultMapStyleUrl,
  mapboxAccessToken,
} from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

type TrackingMapProps = {
  demo: TrackingDemo | null;
  entries?: Entry[];
  immersive?: boolean;
  styleUrl?: string | null;
};

type CourseMark = {
  kind: "start" | "finish" | "mark";
  label: string;
  lng: number;
  lat: number;
};

type EntryLookup = Map<string, Entry>;

const campo1Course: Array<[number, number]> = [
  [-8.926, 40.121],
  [-8.926, 40.156],
  [-8.919, 40.16],
  [-8.93, 40.153],
  [-8.935, 40.122],
  [-8.919, 40.122],
  [-8.926, 40.156],
  [-8.919, 40.16],
  [-8.908, 40.118],
];

const campo1Marks: CourseMark[] = [
  { kind: "start", label: "Saída", lng: -8.926, lat: 40.121 },
  { kind: "mark", label: "1", lng: -8.926, lat: 40.156 },
  { kind: "mark", label: "2", lng: -8.919, lat: 40.16 },
  { kind: "mark", label: "3S", lng: -8.935, lat: 40.122 },
  { kind: "mark", label: "3P", lng: -8.919, lat: 40.122 },
  { kind: "finish", label: "Chegada", lng: -8.908, lat: 40.118 },
];

const fallbackRasterStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

function positionsToFeatureCollection(positions: TrackingPosition[]) {
  return {
    type: "FeatureCollection" as const,
    features: positions.map((position) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [position.lng, position.lat],
      },
      properties: {
        label: position.label,
        classCode: position.classCode,
        sailNumber: position.sailNumber ?? "",
        sog: position.sog ?? 0,
        heading: position.heading ?? 0,
      },
    })),
  };
}

function courseToFeatureCollection() {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: campo1Course,
        },
        properties: {
          name: "Campo 1 aproximado",
        },
      },
    ],
  };
}

function marksToFeatureCollection() {
  return {
    type: "FeatureCollection" as const,
    features: campo1Marks.map((mark) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [mark.lng, mark.lat],
      },
      properties: {
        kind: mark.kind,
        label: mark.label,
      },
    })),
  };
}

function appendMapboxToken(url: string) {
  if (!mapboxAccessToken) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith("mapbox.com") && !parsed.searchParams.has("access_token")) {
      parsed.searchParams.set("access_token", mapboxAccessToken);
      return parsed.toString();
    }
  } catch {
    return url;
  }
  return url;
}

function mapboxStyleApiUrl(owner: string, styleId: string) {
  return appendMapboxToken(`https://api.mapbox.com/styles/v1/${owner}/${styleId}`);
}

function normalizeMapStyle(input?: string | null): string | StyleSpecification {
  const candidate = (input || defaultMapStyleUrl).trim();
  if (!candidate) return fallbackRasterStyle;

  const studioMatch = candidate.match(/console\.mapbox\.com\/studio\/styles\/([^/]+)\/([^/?#]+)/);
  if (studioMatch) {
    return mapboxStyleApiUrl(studioMatch[1], studioMatch[2]);
  }

  if (candidate.startsWith("mapbox://styles/")) {
    const [owner, styleId] = candidate.replace("mapbox://styles/", "").split("/");
    if (owner && styleId) return mapboxStyleApiUrl(owner, styleId);
  }

  return appendMapboxToken(candidate);
}

function mapboxProtocolToHttps(url: string) {
  if (!url.startsWith("mapbox://") || !mapboxAccessToken) return null;
  if (url.startsWith("mapbox://styles/")) {
    const [owner, styleId] = url.replace("mapbox://styles/", "").split("/");
    return owner && styleId ? mapboxStyleApiUrl(owner, styleId) : null;
  }
  if (url.startsWith("mapbox://fonts/")) {
    const path = url.replace("mapbox://fonts/", "");
    return appendMapboxToken(`https://api.mapbox.com/fonts/v1/${path}`);
  }
  if (url.startsWith("mapbox://sprites/")) {
    const [owner, styleId, ...rest] = url.replace("mapbox://sprites/", "").split("/");
    if (!owner || !styleId) return null;
    const requestPath = rest.join("/");
    let suffix = "/sprite";
    if (requestPath) {
      const spriteFile = requestPath.match(/^(.+?)(@2x)?\.(json|png)$/);
      if (requestPath.startsWith("sprite")) {
        suffix = `/${requestPath}`;
      } else if (spriteFile) {
        suffix = `/${spriteFile[1]}/sprite${spriteFile[2] ?? ""}.${spriteFile[3]}`;
      } else {
        suffix = `/${requestPath}/sprite`;
      }
    }
    return appendMapboxToken(
      `https://api.mapbox.com/styles/v1/${owner}/${styleId}${suffix}`,
    );
  }
  return appendMapboxToken(
    `https://api.mapbox.com/v4/${url.replace("mapbox://", "")}.json?secure=true`,
  );
}

function transformMapboxRequest(url: string): RequestParameters | undefined {
  const protocolUrl = mapboxProtocolToHttps(url);
  if (protocolUrl) return { url: protocolUrl };
  const tokenizedUrl = appendMapboxToken(url);
  return tokenizedUrl === url ? undefined : { url: tokenizedUrl };
}

function normalizeLookupKey(value?: string | null) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function addEntryLookupKey(lookup: EntryLookup, key: string | null | undefined, entry: Entry) {
  const normalized = normalizeLookupKey(key);
  if (normalized && !lookup.has(normalized)) {
    lookup.set(normalized, entry);
  }
}

function buildEntryLookup(entries: Entry[] = []) {
  const lookup: EntryLookup = new Map();
  entries.forEach((entry) => {
    addEntryLookupKey(lookup, entry.id, entry);
    addEntryLookupKey(lookup, entry.boatName, entry);
    addEntryLookupKey(lookup, entry.sailNumber, entry);
  });
  return lookup;
}

function findEntryForPosition(position: TrackingPosition, lookup: EntryLookup) {
  return (
    lookup.get(normalizeLookupKey(position.entryId)) ??
    lookup.get(normalizeLookupKey(position.sailNumber)) ??
    lookup.get(normalizeLookupKey(position.label)) ??
    null
  );
}

function formatRating(value?: number | null, digits = 3) {
  return typeof value === "number" ? value.toFixed(digits) : "n/d";
}

function fitMapToCourse(map: maplibregl.Map, positions: TrackingPosition[]) {
  const bounds = new maplibregl.LngLatBounds();
  campo1Course.forEach(([lng, lat]) => bounds.extend([lng, lat]));
  positions.forEach((position) => bounds.extend([position.lng, position.lat]));

  const width = map.getContainer().clientWidth;
  map.fitBounds(bounds, {
    duration: 0,
    maxZoom: 13.2,
    padding: {
      top: 96,
      bottom: 132,
      left: width < 768 ? 32 : 72,
      right: width < 1024 ? 32 : 380,
    },
  });
}

function addTrackingLayers(map: maplibregl.Map, positions: TrackingPosition[]) {
  if (!map.isStyleLoaded() || map.getSource("boats")) return;

  map.addSource("course", {
    type: "geojson",
    data: courseToFeatureCollection(),
  });

  map.addLayer({
    id: "course-line-shadow",
    type: "line",
    source: "course",
    paint: {
      "line-color": "#082f49",
      "line-width": 9,
      "line-opacity": 0.48,
    },
  });

  map.addLayer({
    id: "course-line",
    type: "line",
    source: "course",
    paint: {
      "line-color": "#22d3ee",
      "line-width": 4,
      "line-opacity": 0.95,
      "line-dasharray": [1.5, 0.9],
    },
  });

  map.addSource("marks", {
    type: "geojson",
    data: marksToFeatureCollection(),
  });

  map.addLayer({
    id: "course-marks",
    type: "circle",
    source: "marks",
    paint: {
      "circle-color": [
        "match",
        ["get", "kind"],
        "start",
        "#facc15",
        "finish",
        "#fb923c",
        "#ef4444",
      ],
      "circle-radius": ["match", ["get", "kind"], "mark", 8, 10],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });

  map.addLayer({
    id: "course-mark-labels",
    type: "symbol",
    source: "marks",
    layout: {
      "text-field": ["get", "label"],
      "text-size": 12,
      "text-offset": [0, 1.35],
      "text-anchor": "top",
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#082f49",
      "text-halo-width": 2,
    },
  });

  map.addSource("boats", {
    type: "geojson",
    data: positionsToFeatureCollection(positions),
  });

  map.addLayer({
    id: "boats",
    type: "circle",
    source: "boats",
    paint: {
      "circle-color": [
        "match",
        ["get", "classCode"],
        "ORC_A",
        "#0f766e",
        "ORC_B",
        "#f97316",
        "#0ea5e9",
      ],
      "circle-radius": 8,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  });

  map.addLayer({
    id: "boat-labels",
    type: "symbol",
    source: "boats",
    layout: {
      "text-field": ["get", "label"],
      "text-size": 12,
      "text-offset": [0, 1.35],
      "text-anchor": "top",
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Regular"],
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#0f172a",
      "text-halo-width": 2,
    },
  });
}

export function TrackingMap({ demo, entries, immersive = false, styleUrl }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [usingFallbackStyle, setUsingFallbackStyle] = useState(false);
  const frames = useMemo(() => demo?.frames ?? [], [demo?.frames]);
  const currentFrame = frames[frameIndex] ?? frames[0] ?? null;
  const currentPositions = useMemo(
    () => currentFrame?.positions ?? [],
    [currentFrame?.positions],
  );
  const mapStyle = useMemo(() => normalizeMapStyle(styleUrl), [styleUrl]);
  const latestPositions = useMemo(
    () => positionsToFeatureCollection(currentPositions),
    [currentPositions],
  );
  const entryLookup = useMemo(() => buildEntryLookup(entries), [entries]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      attributionControl: false,
      bearing: -14,
      center: [-8.923, 40.139],
      container: containerRef.current,
      pitch: 36,
      style: mapStyle,
      transformRequest: transformMapboxRequest,
      zoom: 12.3,
    });
    let loaded = false;
    let fallbackApplied = mapStyle === fallbackRasterStyle;

    const installLayers = () => {
      if (!map.isStyleLoaded()) return;
      loaded = true;
      setUsingFallbackStyle(fallbackApplied);
      addTrackingLayers(map, frames[0]?.positions ?? []);
      fitMapToCourse(map, frames[0]?.positions ?? []);
      window.setTimeout(() => map.resize(), 100);
    };

    const fallbackTimer = window.setTimeout(() => {
      if (loaded || mapStyle === fallbackRasterStyle) return;
      fallbackApplied = true;
      setUsingFallbackStyle(true);
      map.setStyle(fallbackRasterStyle);
    }, 4200);

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
    map.on("load", installLayers);
    map.on("styledata", installLayers);
    map.on("error", () => {
      if (!loaded && fallbackApplied) setUsingFallbackStyle(true);
    });

    mapRef.current = map;

    return () => {
      window.clearTimeout(fallbackTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [frames, mapStyle]);

  useEffect(() => {
    if (frames.length < 2) return;
    const timer = window.setInterval(() => {
      setFrameIndex((index) => (index + 1) % frames.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [frames.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("boats") as GeoJSONSource | undefined;
    if (source) source.setData(latestPositions);
  }, [latestPositions]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    fitMapToCourse(map, frames[0]?.positions ?? []);
  }, [frames]);

  if (!demo || frames.length === 0) {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-sky-950 px-6 text-center text-white">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-cyan-200">
            Tracking da regata
          </p>
          <h3 className="mt-3 text-2xl font-semibold">Replay ainda não configurado</h3>
          <p className="mt-2 max-w-md text-sm text-sky-100">
            O admin pode publicar frames simulados para ativar esta experiência visual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-950",
        immersive
          ? "h-[calc(100svh-9rem)] min-h-[680px]"
          : "h-[72vh] min-h-[600px] max-h-[860px]",
      )}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ height: "100%", inset: 0, position: "absolute", width: "100%" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,.1),transparent_32%,rgba(2,6,23,.68))]" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 sm:left-6 sm:top-6">
        <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold uppercase tracking-normal text-slate-950 shadow-lg">
          Simulação / demo visual
        </span>
        <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-950 shadow-lg">
          Campo 1 · Baía da Figueira da Foz
        </span>
        <span className="rounded-full bg-sky-950/88 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          T+{Math.round(currentFrame?.second ?? 0)}s · {currentPositions.length} barcos
        </span>
        <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-950 shadow-lg">
          Barcos Convex · certificados ORC
        </span>
        {usingFallbackStyle ? (
          <span className="rounded-full bg-white/88 px-3 py-1 text-xs font-semibold text-slate-950 shadow-lg">
            Mapa base alternativo
          </span>
        ) : null}
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 grid max-h-56 gap-2 overflow-auto pr-1 sm:grid-cols-2 lg:bottom-auto lg:left-auto lg:right-6 lg:top-20 lg:max-h-[calc(100%-6rem)] lg:w-[340px] lg:grid-cols-1">
        {currentPositions.map((position) => {
          const entry = findEntryForPosition(position, entryLookup);
          const certificateRef = position.certificateRef ?? entry?.certificateRef ?? null;
          const certificateClassName =
            position.certificateClassName ?? entry?.certificateClassName ?? null;
          const gph = position.gph ?? entry?.gph ?? null;
          const totInshore = position.totInshore ?? entry?.totInshore ?? null;
          const totOffshore = position.totOffshore ?? entry?.totOffshore ?? null;

          return (
            <div
              key={`${position.label}-${position.sailNumber}`}
              className="rounded-lg bg-white/94 px-3 py-2 text-xs shadow-xl backdrop-blur"
            >
              <div className="flex items-center justify-between gap-3 font-semibold text-slate-950">
                <span className="truncate">{entry?.boatName ?? position.label}</span>
                <span className="shrink-0 font-mono">{entry?.sailNumber ?? position.sailNumber}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-slate-600">
                <span>{(entry?.classCode ?? position.classCode).replace("_", " ")}</span>
                <span className="font-mono">{position.sog?.toFixed(1) ?? "0.0"} nós</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
                <span className="truncate font-mono text-slate-950">
                  {certificateRef ? `Cert. ${certificateRef}` : "Cert. n/d"}
                </span>
                <span className="truncate text-right">{certificateClassName ?? "ORC"}</span>
                <span>GPH {formatRating(gph, 1)}</span>
                <span className="text-right">ToT {formatRating(totInshore)}</span>
                <span className="col-span-2 text-right text-slate-500">
                  Offshore {formatRating(totOffshore)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
